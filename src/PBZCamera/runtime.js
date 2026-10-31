"use strict";
const UE=require('ue');
const {$ref,$unref}=require('puerts');
const TsHelper=require('../Library/TsHelper').default;
const {Settings,decode}=require('./camera-settings');
const {OwnedScalar}=require('./owned-scalar');
const configPath=()=>UE.BlueprintPathsLibrary.ProjectSavedDir()+'PBZCamera.json';
// Module-level state survives a module re-evaluation (hot reload / duplicate copy):
// without this, a second evaluation starts a second interval that writes every
// camera property twice (shake multiplies, FOV adds twice).
const shared=(()=>{
    const key='__PBZCameraRuntimeState';
    const scope=typeof globalThis!=='undefined'?globalThis:global;
    if(!scope[key])scope[key]={settings:undefined,worlds:new WeakMap()};
    return scope[key];
})();
const worlds=shared.worlds;
function valid(o){
    try{return !!o && UE.KismetSystemLibrary.IsValid(o);}
    catch(error){return false;}
}
const log=require('./diagnostics').record;
function getSettings(){
    if(shared.settings)return shared.settings;
    let initial;
    try{
        const output=$ref('');
        if(UE.EasyCsv.LoadStringFromLocalFile(configPath(),output))initial=decode(String($unref(output)));
    }catch(error){log('Camera config fallback: '+String(error));}
    shared.settings=new Settings(initial);
    return shared.settings;
}
function persist(text){return UE.EasyCsv.SaveStringToFileWithFullPath(text,configPath())===true;}
// Whitelist gameplay camera modes. Unknown, execution and cinematic modes receive no writes.
const gameplayMode=/^DA_CameraMode_(GroupCombat|Combat|Normal|Default|ShouderDefault|Walk|Run|Sprint)$/;
class CameraRuntime{
    constructor(world){this.world=world;this.camera=null;this.mode=null;this.manager=null;this.fov=null;this.shake=null;this.added=false;this.errorLogged=false;}
    // Paused gameplay must not receive camera writes; keep the current overrides
    // instead of releasing them so the settings survive the pause menu.
    isPaused(){
        try{return UE.GameplayStatics.IsGamePaused(this.world)===true;}
        catch(error){return false;}
    }
    release(){
        const attempt=callback=>{try{callback();}catch(error){log('Camera teardown: '+String(error));}};
        attempt(()=>{if(this.added && valid(this.camera))this.camera.RemoveOverrideParameter('PBZCamera.Distance',0.2);});
        this.added=false;
        attempt(()=>{if(this.fov)this.fov.release();});
        attempt(()=>{if(this.shake)this.shake.release();});
        this.fov=null;this.shake=null;this.camera=null;this.mode=null;this.manager=null;
        this.lastSettings=null;
    }
    update(){
        try{
            const pawn=UE.GameplayStatics.GetPlayerPawn(this.world,0);
            const manager=UE.GameplayStatics.GetPlayerCameraManager(this.world,0);
            const sequence=TsHelper.getWorldSubsystem(this.world,UE.PBZLevelSequenceManager.StaticClass());
            if(!valid(pawn) || !valid(manager) || sequence && sequence.IsInSequence()){this.release();return;}
            if(this.isPaused())return;
            const asc=UE.AbilitySystemBlueprintLibrary.GetAbilitySystemComponent(pawn);
            if(asc && asc.HasMatchingGameplayTag(TsHelper.constructGameplayTag('CharacterState.Dead'))){this.release();return;}
            // Native return is CineCameraComponent; the gameplay controller is a separate pawn component.
            const render=manager.GetCurrentActivateCameraComponent();
            const camera=pawn.GetComponentByClass(UE.NBCameraComponent.StaticClass());
            if(!this.contextLogged){
                log('Camera context: render='+String(valid(render)?render.GetName():'none')+', gameplay='+String(valid(camera)?camera.GetName():'none'));
                this.contextLogged=true;
            }
            if(!valid(render) || render.GetOwner()!==pawn || !valid(camera) || camera.GetOwner()!==pawn || camera.IsCineCameraActive()){
                this.release();return;
            }
            const mode=camera.GetCurrentCameraMode();
            if(!valid(mode) || !gameplayMode.test(String(mode.GetName()))){
                if(valid(mode) && this.lastUnknown!==String(mode.GetName())){this.lastUnknown=String(mode.GetName());log('Unmodified camera context: '+this.lastUnknown);}
                this.release();return;
            }
            if(this.camera!==camera || this.mode!==mode || this.manager!==manager){
                this.release();this.camera=camera;this.mode=mode;this.manager=manager;
                this.fov=new OwnedScalar(()=>mode.CameraModeSettings.FOVSettings.CameraFOV,value=>{
                    const params=mode.CameraModeSettings;params.FOVSettings.CameraFOV=value;mode.CameraModeSettings=params;
                },()=>valid(mode));
                this.shake=new OwnedScalar(()=>manager.CameraShakeScale,value=>{manager.CameraShakeScale=value;},()=>valid(manager));
                log('Camera acquired: '+mode.GetName());
            }
            const active=getSettings().active();
            const base=mode.CameraModeSettings.LocationSettings.DefaultCameraDistance;
            if(!Number.isFinite(base) || base<=0)throw Error('Invalid native distance baseline');
            if(active.distance===1){if(this.added)camera.RemoveOverrideParameter('PBZCamera.Distance',0.2);this.added=false;}
            else {
                const delta=base*(active.distance-1);
                if(!this.added || this.distanceDelta!==delta){camera.SetAdditiveParameter_Distance('PBZCamera.Distance',delta,0.2);this.distanceDelta=delta;this.added=true;}
            }
            if(active.fov===0)this.fov.release();else this.fov.apply(base=>base+active.fov);
            if(active.shake===1)this.shake.release();else this.shake.apply(base=>base*active.shake);
            const signature=JSON.stringify(active);
            if(this.lastSettings!==signature){
                log('Camera readback: '+JSON.stringify({mode:String(mode.GetName()),baseDistance:base,distanceDelta:this.added?this.distanceDelta:0,
                    fov:mode.CameraModeSettings.FOVSettings.CameraFOV,shake:manager.CameraShakeScale}));
                this.lastSettings=signature;
            }
            // A completed pass proves the interfaces work again; one transient
            // native error must not disable the whole feature until reload.
            this.errorLogged=false;
        }catch(error){
            if(!this.errorLogged){log('Camera suspended: '+String(error));this.errorLogged=true;}
            try{this.release();}catch(cleanup){log('Camera cleanup: '+String(cleanup));}
        }
    }
}
function start(world){
    if(worlds.has(world))return;
    const camera=new CameraRuntime(world);
    const timer=setInterval(()=>camera.update(),100);
    worlds.set(world,{camera,timer});getSettings();log('World services started');
}
function stop(world){
    const state=worlds.get(world);if(!state)return;
    clearInterval(state.timer);worlds.delete(world);state.camera.release();log('World services stopped');
}
module.exports={getSettings,persist,start,stop,log,valid};

const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const {Settings,decode}=require('../src/PBZCamera/camera-settings');
const {OwnedScalar}=require('../src/PBZCamera/owned-scalar');
function fixture(modeName='DA_CameraMode_Combat'){
    const state={writes:[],offsetWrites:[],removed:[],logs:[],previewCalls:[],world:{},foreign:false,dead:false,paused:false,sequence:false,cine:false,intervals:0,invalid:new Set()};
    const pawn={GetComponentByClass:()=>camera};
    // Matches the reflected native return type: the render camera is a CineCameraComponent.
    const render={GetOwner:()=>state.foreign?{}:pawn,GetName:()=>'CineCamera1',IsA:()=>false};
    const mode={GetName:()=>modeName,CameraModeSettings:{LocationSettings:{DefaultCameraDistance:300},FOVSettings:{CameraFOV:90}}};
    const camera={GetOwner:()=>pawn,GetName:()=>'NBCamera',IsCineCameraActive:()=>state.cine,GetCurrentCameraMode:()=>mode,
        SetAdditiveParameter_Distance:(name,value,blend)=>state.writes.push({name,value,blend}),RemoveOverrideParameter:name=>state.removed.push(name),
        SetAdditiveParameter_SocketOffset:(name,value,blend)=>state.offsetWrites.push({name,value,blend}),
        Flush:()=>state.previewCalls.push('flush'),GetCameraFOVObject:()=>({FlushTargetFOV:()=>state.previewCalls.push('fov')})};
    const manager={GetCurrentActivateCameraComponent:()=>render,CameraShakeScale:1};
    const controller={ForceUpdateCameraView:()=>state.previewCalls.push('view')};
    const UE={KismetSystemLibrary:{IsValid:o=>{if(state.invalid.has(o))throw Error('passing a invalid object');return !!o;}},GameplayStatics:{GetGameMode:()=>state.world,GetPlayerController:()=>controller,GetPlayerPawn:()=>pawn,GetPlayerCameraManager:()=>manager,IsGamePaused:()=>state.paused},
        Vector:class{constructor(X,Y,Z){Object.assign(this,{X,Y,Z});}},PBZLevelSequenceManager:{StaticClass:()=>1},ATPCCameraComponent:{StaticClass:()=>2},NBCameraComponent:{StaticClass:()=>3},
        BlueprintPathsLibrary:{ProjectSavedDir:()=>'/saved/'},EasyCsv:{LoadStringFromLocalFile:()=>false,SaveStringToFileWithFullPath:()=>true},
        AbilitySystemBlueprintLibrary:{GetAbilitySystemComponent:()=>({HasMatchingGameplayTag:()=>state.dead})}};
    const dependencies={'ue':UE,'puerts':{$ref:v=>({value:v}),$unref:o=>o.value},
        '../Library/TsHelper':{default:{getWorldSubsystem:()=>({IsInSequence:()=>state.sequence}),constructGameplayTag:name=>name}},
        './camera-settings':{Settings,decode},'./owned-scalar':{OwnedScalar},'./diagnostics':{record:m=>state.logs.push(m)}};
    const module={exports:{}};
    const source=fs.readFileSync(require.resolve('../src/PBZCamera/runtime'),'utf8');
    vm.runInNewContext(source,{require:name=>{if(!(name in dependencies))throw Error(name);return dependencies[name];},module,
        setInterval:callback=>{state.intervals++;state.tick=callback;return state.intervals;},clearInterval:()=>{state.tick=null;},console});
    state.api=module.exports;state.camera=camera;state.manager=manager;state.mode=mode;state.controller=controller;
    state.api.start(state.world);return state;
}
test('render CineCameraComponent and gameplay NBCameraComponent are distinct',()=>{
    const s=fixture();s.tick();
    assert.equal(s.writes.length,1);assert.ok(Math.abs(s.writes[0].value-30)<1e-6);
    assert.equal(s.manager.CameraShakeScale,0.6);s.tick();assert.equal(s.writes.length,1);
    s.api.stop(s.world);assert.equal(s.manager.CameraShakeScale,1);assert.deepEqual(s.removed,['PBZCamera.Distance']);
});

test('framing uses one owned additive local Y/Z vector, preserves zero forward offset, and avoids repeated writes',()=>{
    const s=fixture();s.tick();assert.equal(s.offsetWrites.length,0);
    const m=s.api.getSettings();m.edit('offsetX',-75);m.edit('offsetY',25);m.apply(()=>true);s.tick();
    assert.equal(s.offsetWrites.length,1);const w=s.offsetWrites[0];
    assert.equal(w.name,'PBZCamera.Framing');assert.equal(w.value.X,0);assert.equal(w.value.Y,-75);assert.equal(w.value.Z,25);assert.equal(w.blend,0.2);
    s.tick();assert.equal(s.offsetWrites.length,1);
    m.edit('offsetY',-30);m.apply(()=>true);s.tick();assert.equal(s.offsetWrites.length,2);assert.equal(s.offsetWrites[1].value.Z,-30);
    s.api.stop(s.world);assert.ok(s.removed.includes('PBZCamera.Framing'));
});

test('paused Apply previews signed framing and zero removes only the owned additive entry',()=>{
    const s=fixture();s.tick();s.paused=true;const m=s.api.getSettings();
    m.edit('offsetX',50);m.edit('offsetY',-20);m.apply(()=>true);s.tick();assert.equal(s.offsetWrites.length,0);
    assert.equal(s.api.refreshCameraPreview({}),true);assert.equal(s.offsetWrites[0].blend,0);
    m.edit('offsetX',0);m.edit('offsetY',0);m.apply(()=>true);assert.equal(s.api.refreshCameraPreview({}),true);
    assert.deepEqual(s.removed,['PBZCamera.Framing']);
    s.tick();assert.equal(s.removed.length,1);assert.equal(s.offsetWrites.length,1);
});

test('framing is released on a foreign view and excluded contexts never receive new offset writes',()=>{
    const s=fixture();const m=s.api.getSettings();m.edit('offsetX',-50);m.apply(()=>true);s.tick();
    s.foreign=true;s.tick();assert.ok(s.removed.includes('PBZCamera.Framing'));assert.equal(s.offsetWrites.length,1);
    for(const flag of ['foreign','dead','sequence','cine']){
        const s=fixture();const m=s.api.getSettings();m.edit('offsetX',50);m.apply(()=>true);s[flag]=true;s.paused=true;
        assert.equal(s.api.refreshCameraPreview({}),false);assert.equal(s.offsetWrites.length,0);
    }
});

test('explicit Apply refreshes a paused gameplay camera without ordinary paused writes',()=>{
    const s=fixture();s.tick();s.paused=true;
    const model=s.api.getSettings();model.edit('distance',2);model.edit('fov',40);model.apply(()=>true);
    s.tick();assert.equal(s.writes.length,1);assert.equal(s.mode.CameraModeSettings.FOVSettings.CameraFOV,90);
    assert.equal(s.api.refreshCameraPreview({}),true);
    assert.equal(s.writes.at(-1).value,300);assert.equal(s.writes.at(-1).blend,0);
    assert.equal(s.mode.CameraModeSettings.FOVSettings.CameraFOV,130);
    assert.deepEqual(s.previewCalls,['flush','fov','view']);
    s.tick();assert.equal(s.previewCalls.length,3);assert.equal(s.writes.length,2);
});

test('preview refuses excluded camera contexts and an already stopped world',()=>{
    for(const flag of ['foreign','dead','sequence','cine']){
        const s=fixture();s.tick();s.paused=true;s[flag]=true;
        assert.equal(s.api.refreshCameraPreview({}),false);assert.deepEqual(s.previewCalls,[]);
    }
    const s=fixture('DA_CameraMode_Execute');s.paused=true;
    assert.equal(s.api.refreshCameraPreview({}),false);assert.deepEqual(s.previewCalls,[]);
    s.api.stop(s.world);assert.equal(s.api.refreshCameraPreview({}),false);
});

test('failed paused view refresh preserves saved settings and can be retried',()=>{
    const s=fixture();s.tick();s.paused=true;
    s.api.getSettings().edit('fov',20);s.api.getSettings().apply(()=>true);
    s.controller.ForceUpdateCameraView=()=>{throw Error('view unavailable');};
    assert.equal(s.api.refreshCameraPreview({}),false);
    assert.equal(s.api.getSettings().active().fov,20);assert.equal(s.mode.CameraModeSettings.FOVSettings.CameraFOV,110);
    assert.deepEqual(s.removed,[]);
    s.controller.ForceUpdateCameraView=()=>s.previewCalls.push('recovered');
    assert.equal(s.api.refreshCameraPreview({}),true);assert.equal(s.previewCalls.at(-1),'recovered');
});

test('paused original preset removes owned overrides immediately and refreshes exactly once',()=>{
    const s=fixture();s.tick();s.paused=true;const model=s.api.getSettings();
    model.edit('distance',2);model.edit('fov',40);model.apply(()=>true);s.api.refreshCameraPreview({});
    model.preset('original');model.apply(()=>true);s.previewCalls.length=0;
    assert.equal(s.api.refreshCameraPreview({}),true);
    assert.deepEqual(s.removed,['PBZCamera.Distance']);
    assert.equal(s.mode.CameraModeSettings.FOVSettings.CameraFOV,90);assert.equal(s.manager.CameraShakeScale,1);
    assert.deepEqual(s.previewCalls,['flush','fov','view']);
});
test('a foreign cinematic view releases only owned camera changes',()=>{
    const s=fixture();s.tick();s.foreign=true;s.tick();
    assert.equal(s.writes.length,1);assert.deepEqual(s.removed,['PBZCamera.Distance']);assert.equal(s.manager.CameraShakeScale,1);
});
test('death suspends control and a later gameplay context reacquires its baseline',()=>{
    const s=fixture();s.tick();s.dead=true;s.tick();
    assert.equal(s.manager.CameraShakeScale,1);
    s.dead=false;s.tick();assert.equal(s.writes.length,2);assert.equal(s.manager.CameraShakeScale,0.6);
});
test('the build-verified ShouderDefault asset is supported; transient and forced assets are excluded',()=>{
    const normal=fixture('DA_CameraMode_ShouderDefault');normal.tick();assert.equal(normal.writes.length,1);
    for(const mode of ['ATPCCameraModeDataAsset_2147478596','DA_CameraMode_Execute']){
        const other=fixture(mode);other.tick();assert.equal(other.writes.length,0);
    }
});
test('EndPlay tolerates a collected component and still restores surviving camera properties',()=>{
    const s=fixture();s.tick();s.invalid.add(s.camera);
    assert.doesNotThrow(()=>s.api.stop(s.world));
    assert.equal(s.manager.CameraShakeScale,1);assert.equal(s.tick,null);
});
test('one native cleanup error does not skip other restoration or retain the world service',()=>{
    const s=fixture();s.tick();s.camera.RemoveOverrideParameter=()=>{throw Error('native teardown');};
    assert.doesNotThrow(()=>s.api.stop(s.world));assert.equal(s.manager.CameraShakeScale,1);
    assert.equal(s.tick,null);s.api.start(s.world);assert.equal(typeof s.tick,'function');
});
test('paused gameplay keeps its overrides instead of releasing or rewriting them',()=>{
    const s=fixture();s.tick();
    assert.equal(s.writes.length,1);assert.equal(s.manager.CameraShakeScale,0.6);
    s.paused=true;s.tick();
    assert.deepEqual(s.removed,[]);assert.equal(s.manager.CameraShakeScale,0.6);assert.equal(s.writes.length,1);
    s.paused=false;s.tick();
    assert.equal(s.manager.CameraShakeScale,0.6);assert.equal(s.writes.length,1);
});
test('a transient native failure is logged once and retried on the next tick',()=>{
    const s=fixture();s.tick();
    s.mode.CameraModeSettings.LocationSettings.DefaultCameraDistance=NaN;
    s.tick();s.tick();
    assert.equal(s.logs.filter(m=>m.startsWith('Camera suspended')).length,1);
    s.mode.CameraModeSettings.LocationSettings.DefaultCameraDistance=300;
    s.tick();
    s.mode.CameraModeSettings.LocationSettings.DefaultCameraDistance=NaN;
    s.tick();
    assert.equal(s.logs.filter(m=>m.startsWith('Camera suspended')).length,2);
});
test('a second start for the same world does not add a second poll or duplicate writes',()=>{
    const s=fixture();s.api.start(s.world);
    assert.equal(s.intervals,1);
    s.tick();assert.equal(s.writes.length,1);assert.equal(s.manager.CameraShakeScale,0.6);
});
test('an unchanged owned value is not rewritten on every poll',()=>{
    const state={value:10,writes:0};
    const scalar=new OwnedScalar(()=>state.value,v=>{state.value=v;state.writes++;},()=>true);
    scalar.apply(base=>base*2);scalar.apply(base=>base*2);scalar.apply(base=>base*2);
    assert.equal(state.writes,1);
    state.value=12;scalar.apply(base=>base*2);assert.equal(state.writes,2);assert.equal(state.value,24);
    scalar.release();assert.equal(state.value,12);
});

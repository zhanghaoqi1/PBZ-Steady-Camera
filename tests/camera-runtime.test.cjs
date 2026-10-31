const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const {Settings,decode}=require('../src/PBZCamera/camera-settings');
const {OwnedScalar}=require('../src/PBZCamera/owned-scalar');
function fixture(modeName='DA_CameraMode_Combat'){
    const state={writes:[],removed:[],logs:[],loadedPaths:[],savedPaths:[],world:{},foreign:false,dead:false,paused:false,intervals:0,invalid:new Set()};
    const pawn={GetComponentByClass:()=>camera};
    // Matches the reflected native return type: the render camera is a CineCameraComponent.
    const render={GetOwner:()=>state.foreign?{}:pawn,GetName:()=>'CineCamera1',IsA:()=>false};
    const mode={GetName:()=>modeName,CameraModeSettings:{LocationSettings:{DefaultCameraDistance:300},FOVSettings:{CameraFOV:90}}};
    const camera={GetOwner:()=>pawn,GetName:()=>'NBCamera',IsCineCameraActive:()=>false,GetCurrentCameraMode:()=>mode,
        SetAdditiveParameter_Distance:(name,value)=>state.writes.push({name,value}),RemoveOverrideParameter:name=>state.removed.push(name)};
    const manager={GetCurrentActivateCameraComponent:()=>render,CameraShakeScale:1};
    const UE={KismetSystemLibrary:{IsValid:o=>{if(state.invalid.has(o))throw Error('passing a invalid object');return !!o;}},GameplayStatics:{GetPlayerPawn:()=>pawn,GetPlayerCameraManager:()=>manager,IsGamePaused:()=>state.paused},
        PBZLevelSequenceManager:{StaticClass:()=>1},ATPCCameraComponent:{StaticClass:()=>2},NBCameraComponent:{StaticClass:()=>3},
        BlueprintPathsLibrary:{ProjectSavedDir:()=>'/saved/'},EasyCsv:{LoadStringFromLocalFile:path=>{state.loadedPaths.push(path);return false;},SaveStringToFileWithFullPath:(text,path)=>{state.savedPaths.push(path);return true;}},
        AbilitySystemBlueprintLibrary:{GetAbilitySystemComponent:()=>({HasMatchingGameplayTag:()=>state.dead})}};
    const dependencies={'ue':UE,'puerts':{$ref:v=>({value:v}),$unref:o=>o.value},
        '../Library/TsHelper':{default:{getWorldSubsystem:()=>null,constructGameplayTag:name=>name}},
        './camera-settings':{Settings,decode},'./owned-scalar':{OwnedScalar},'./diagnostics':{record:m=>state.logs.push(m)}};
    const module={exports:{}};
    const source=fs.readFileSync(require.resolve('../src/PBZCamera/runtime'),'utf8');
    vm.runInNewContext(source,{require:name=>{if(!(name in dependencies))throw Error(name);return dependencies[name];},module,
        setInterval:callback=>{state.intervals++;state.tick=callback;return state.intervals;},clearInterval:()=>{state.tick=null;},console});
    state.api=module.exports;state.camera=camera;state.manager=manager;state.mode=mode;
    state.api.start(state.world);return state;
}
test('render CineCameraComponent and gameplay NBCameraComponent are distinct',()=>{
    const s=fixture();s.tick();
    assert.equal(s.writes.length,1);assert.ok(Math.abs(s.writes[0].value-30)<1e-6);
    assert.equal(s.manager.CameraShakeScale,0.6);s.tick();assert.equal(s.writes.length,1);
    s.api.stop(s.world);assert.equal(s.manager.CameraShakeScale,1);assert.deepEqual(s.removed,['PBZCamera.Distance']);
});

test('standalone configuration reads and writes the documented PBZCamera.json only',()=>{
    const s=fixture();assert.deepEqual(s.loadedPaths,['/saved/PBZCamera.json']);
    s.api.persist('{}');assert.deepEqual(s.savedPaths,['/saved/PBZCamera.json']);
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

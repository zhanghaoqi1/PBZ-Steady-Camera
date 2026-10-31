const test = require('node:test');
const assert = require('node:assert/strict');
const {Settings, presets, decode} = require('../src/PBZCamera/camera-settings');
const {OwnedScalar} = require('../src/PBZCamera/owned-scalar');

test('draft changes cancel without touching active settings', () => {
    const s = new Settings(); s.edit('distance', 1.3); s.cancel();
    assert.equal(s.active().distance, 1.1); assert.equal(s.draft().distance, 1.1);
});
test('persistence failure leaves applied state intact and draft available', () => {
    const s = new Settings(); s.edit('shake', 0);
    assert.throws(() => s.apply(() => false), /save/i);
    assert.equal(s.active().shake, 0.6); assert.equal(s.draft().shake, 0);
    assert.throws(() => s.apply(() => {throw Error('disk');}), /disk/);
    s.apply(() => true); assert.equal(s.active().shake, 0);
});
test('settings return independent copies and preserve zero through restart', () => {
    const s = new Settings(); s.edit('fov', 10); s.edit('shake', 0);
    let saved; s.apply(text => {saved=text; return true;});
    const reopened=new Settings(decode(saved));
    assert.equal(reopened.active().shake, 0); assert.equal(reopened.active().fov, 10);
    const copy=reopened.active(); copy.distance=5;
    assert.equal(reopened.active().distance, 1.1);
});
test('restore original is a draft operation until applied', () => {
    const s = new Settings(); s.preset('original');
    assert.deepEqual(s.draft(), presets.original); assert.deepEqual(s.active(), presets.steady);
});
test('bad values, schema versions, unknown settings and oversized config fail closed', () => {
    const s=new Settings();
    for(const [key,value] of [['distance',Infinity],['distance',1.41],['shake',-1],['fov','2'],['unknown',1]])
        assert.throws(()=>s.edit(key,value));
    for(const value of ['{}','{"version":99,"settings":{}}','{"version":1,"settings":{"cheat":1}}','x'.repeat(5000)])
        assert.throws(()=>decode(value));
});
test('prototype names cannot be accepted as camera fields or presets',()=>{
    const s=new Settings();
    for(const key of ['constructor','toString','__proto__']){
        assert.throws(()=>s.edit(key,1));
        assert.throws(()=>s.preset(key));
        assert.throws(()=>decode('{"version":1,"settings":{"'+key+'":1}}'));
    }
});
test('repeated camera application derives from original baseline', () => {
    let value=90; const x=new OwnedScalar(()=>value,v=>{value=v;});
    x.apply(base=>base+10); x.apply(base=>base+10); assert.equal(value,100);
    x.apply(base=>base+5); assert.equal(value,95); x.release(); assert.equal(value,90);
});
test('an external camera update becomes the new baseline', () => {
    let value=0.8; const x=new OwnedScalar(()=>value,v=>{value=v;});
    x.apply(base=>base*0.5); value=0.6; x.apply(base=>base*0.5);
    assert.equal(value,0.3); x.release(); assert.equal(value,0.6);
});

test('native resets to the original baseline reapply the owned adjustment', () => {
    for(const [baseline,transform,expected] of [[1,base=>base*0.6,0.6],[90,base=>base+5,95]]){
        let value=baseline,writes=0;
        const x=new OwnedScalar(()=>value,v=>{value=v;writes++;});
        x.apply(transform); assert.equal(value,expected);
        value=baseline;
        x.apply(transform); assert.equal(value,expected);
        assert.equal(writes,2);
        x.apply(transform); assert.equal(writes,2);
        x.release(); assert.equal(value,baseline);
    }
});
test('release does not overwrite another camera owner or a destroyed camera', () => {
    let value=80,alive=true; const x=new OwnedScalar(()=>value,v=>{value=v;},()=>alive);
    x.apply(base=>base+5); value=99; x.release(); assert.equal(value,99);
    x.apply(base=>base+5); alive=false; x.release(); assert.equal(value,104);
});

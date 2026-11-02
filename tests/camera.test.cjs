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
    for(const [key,value] of [['distance',Infinity],['distance',2.01],['shake',-1],['fov','2'],['unknown',1]])
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

test('expanded distance and FOV survive apply and restart while out-of-range values refuse',()=>{
    const s=new Settings();s.edit('distance',2);s.edit('fov',40);
    let saved;s.apply(text=>{saved=text;return true;});
    assert.deepEqual(decode(saved),{distance:2,fov:40,shake:0.6,offsetX:0,offsetY:0});
    for(const [key,value] of [['distance',2.01],['fov',41],['fov',-1]])assert.throws(()=>s.edit(key,value));
    assert.equal(new Settings(decode('{"version":1,"settings":{"distance":1.4,"fov":10,"shake":1}}')).active().fov,10);
});

test('legacy configs default to original framing; signed offsets persist, cancel and reset with presets',()=>{
    const s=new Settings(decode('{"version":1,"settings":{"distance":1.4,"fov":10,"shake":1}}'));
    assert.equal(s.active().offsetX,0);assert.equal(s.active().offsetY,0);
    s.edit('offsetX',-300);s.edit('offsetY',300);let saved;s.apply(text=>{saved=text;return true;});
    const reopened=new Settings(decode(saved));assert.equal(reopened.active().offsetX,-300);assert.equal(reopened.active().offsetY,300);
    reopened.edit('offsetX',150);reopened.cancel();assert.equal(reopened.draft().offsetX,-300);
    for(const preset of ['steady','original']){reopened.preset(preset);assert.equal(reopened.draft().offsetX,0);assert.equal(reopened.draft().offsetY,0);}
    for(const [key,value] of [['offsetX',301],['offsetX',-301],['offsetY',301],['offsetY',-301],['offsetX',NaN],['offsetY','5']])assert.throws(()=>s.edit(key,value));
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
test('release does not overwrite another camera owner or a destroyed camera', () => {
    let value=80,alive=true; const x=new OwnedScalar(()=>value,v=>{value=v;},()=>alive);
    x.apply(base=>base+5); value=99; x.release(); assert.equal(value,99);
    x.apply(base=>base+5); alive=false; x.release(); assert.equal(value,104);
});

"use strict";
const presets=Object.freeze({
    original:Object.freeze({distance:1,fov:0,shake:1,offsetX:0,offsetY:0}),
    steady:Object.freeze({distance:1.1,fov:0,shake:0.6,offsetX:0,offsetY:0})
});
const bounds={distance:[0.9,2],fov:[0,40],shake:[0,1],offsetX:[-300,300],offsetY:[-300,300]};
function validate(settings) {
    if(!settings || typeof settings!=='object' || Array.isArray(settings)) throw Error('Invalid settings');
    const result={...presets.steady};
    for(const key of Object.keys(settings)) {
        const b=Object.prototype.hasOwnProperty.call(bounds,key)?bounds[key]:undefined,value=settings[key];
        if(!b || typeof value!=='number' || !Number.isFinite(value) || value<b[0] || value>b[1])
            throw Error('Invalid camera setting: '+key);
        result[key]=value;
    }
    return result;
}
function decode(text) {
    if(typeof text!=='string' || text.length>4096) throw Error('Invalid config size');
    const data=JSON.parse(text);
    if(!data || data.version!==1 || !data.settings || Object.keys(data).some(k=>k!=='version' && k!=='settings'))
        throw Error('Unsupported camera config');
    return validate(data.settings);
}
class Settings {
    constructor(initial=presets.steady) {this.current=validate(initial);this.pending={...this.current};}
    active(){return {...this.current};}
    draft(){return {...this.pending};}
    edit(key,value){this.pending=validate({...this.pending,[key]:value});}
    preset(name){if(!Object.prototype.hasOwnProperty.call(presets,name))throw Error('Unknown preset');this.pending={...presets[name]};}
    cancel(){this.pending={...this.current};}
    apply(persist){
        const next=validate(this.pending);
        if(persist(JSON.stringify({version:1,settings:next}))!==true)throw Error('Could not save camera settings');
        this.current=next;
    }
}
module.exports={Settings,presets,decode};

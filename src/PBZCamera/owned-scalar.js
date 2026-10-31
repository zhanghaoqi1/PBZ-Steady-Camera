"use strict";
// Each instance belongs to one exact runtime object/property, never a class default.
class OwnedScalar {
    constructor(read,write,valid=()=>true){this.read=read;this.write=write;this.valid=valid;this.base=undefined;this.last=undefined;}
    apply(transform){
        if(!this.valid())return;
        const actual=this.read();
        if(!Number.isFinite(actual))throw Error('Invalid camera baseline');
        if(this.base===undefined || this.last===undefined || Math.abs(actual-this.last)>0.0001)this.base=actual;
        const next=transform(this.base);
        if(!Number.isFinite(next))throw Error('Invalid camera result');
        // The poll runs 10x/s; writing an unchanged value only fights native
        // interpolation and burns property setters.
        if(this.last!==undefined && Math.abs(actual-next)<=0.0001)return;
        this.write(next);this.last=next;
    }
    release(){
        if(this.base!==undefined && this.last!==undefined && this.valid() && Math.abs(this.read()-this.last)<=0.0001)
            this.write(this.base);
        this.base=undefined;this.last=undefined;
    }
}
module.exports={OwnedScalar};

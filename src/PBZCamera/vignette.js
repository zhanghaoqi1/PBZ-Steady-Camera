"use strict";
// Slate solid-colour quads share the native dimming brush and can batch together.
// Normalized anchors keep the centre clear at different viewport sizes/DPI.
function vignetteStrips(){
    const rows=[],count=48;
    for(let i=0;i<count;i++){
        const falloff=Math.pow(1-(i+0.5)/count,1.5);
        const x0=0.4*i/count,x1=0.4*(i+1)/count;
        const y0=0.3*i/count,y1=0.3*(i+1)/count;
        rows.push({x0,y0:0,x1,y1:1,alpha:0.6*falloff});
        rows.push({x0:1-x1,y0:0,x1:1-x0,y1:1,alpha:0.6*falloff});
        rows.push({x0:0,y0,x1:1,y1,alpha:0.28*falloff});
        rows.push({x0:0,y0:1-y1,x1:1,y1:1-y0,alpha:0.28*falloff});
    }
    return rows;
}
module.exports={vignetteStrips};

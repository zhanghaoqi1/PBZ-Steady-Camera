const test=require('node:test');
const assert=require('node:assert/strict');
const {vignetteStrips}=require('../src/PBZCamera/vignette');
function opacityAt(strips,x,y){
    return 1-strips.filter(r=>x>=r.x0&&x<r.x1&&y>=r.y0&&y<r.y1).reduce((a,r)=>a*(1-r.alpha),1);
}
test('vignette preserves the centre, darkens edges smoothly, and deepens corners',()=>{
    const strips=vignetteStrips();
    assert.equal(opacityAt(strips,0.5,0.5),0);
    assert.ok(opacityAt(strips,0.01,0.5)>0.4);
    assert.ok(opacityAt(strips,0.01,0.01)>opacityAt(strips,0.01,0.5));
    let previous=opacityAt(strips,0.001,0.5);
    for(let x=0.005;x<0.5;x+=0.01){const a=opacityAt(strips,x,0.5);assert.ok(a<=previous+1e-8);assert.ok(previous-a<0.1);previous=a;}
});
test('vignette geometry stays normalized and symmetric at any viewport size',()=>{
    const strips=vignetteStrips();assert.ok(strips.length<=256);
    for(const r of strips){assert.ok(r.x0>=0&&r.y0>=0&&r.x1<=1&&r.y1<=1&&r.x1>r.x0&&r.y1>r.y0);assert.ok(r.alpha>=0&&r.alpha<=1);}
    // Sample inside quads; exact shared boundaries are rasterized by Slate.
    for(const [x,y] of [[0.0337,0.1337],[0.2137,0.4237],[0.5,0.2037]]){
        const a=opacityAt(strips,x,y);
        assert.ok(Math.abs(a-opacityAt(strips,1-x,y))<1e-6);
        assert.ok(Math.abs(a-opacityAt(strips,x,1-y))<1e-6);
    }
});

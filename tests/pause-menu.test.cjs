const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {Settings}=require('../src/PBZCamera/camera-settings');
function signal(){const set=new Set();return {Add:f=>set.add(f),Remove:f=>set.delete(f),emit:v=>{for(const f of set)f(v);},count:()=>set.size};}
function fixture(){
    const s={settings:new Settings(),backCount:0,previewed:[],previewOk:true,saveOk:true,sliders:[],buttons:[],texts:[],tabs:new Map(),saved:[],ids:['System'],descriptors:[],pages:[{}],indices:new Map([['System',0]])};
    function widget(){return {SetNavigationRuleExplicit(){},SetUserFocus(){},RemoveFromParent(){},SetDesiredFocusWidget(){},SetRenderOpacity(){}};}
    function button(){const b={...widget(),selectable:true,selectOnFocus:true,bSetSelectedOnHover:true,selected:false,GetSelected(){return this.selected;},Text:{SetPBZFormatText(t){this.text=t;},SetColorAndOpacity(v){this.color=v;},SetRenderOpacity(){}},
        OnButtonBaseClicked:signal(),SetButtonText(t){this.text=t;},SetWidthOverride(){},SetIsSelectable(v){this.selectable=v;},SetShouldSelectUponReceivingFocus(v){this.selectOnFocus=v;},SetIsSelected(v){this.selected=v;},
        pointerEnter(){this.hovered=true;if(this.selectable&&this.bSetSelectedOnHover)this.selected=true;},pointerLeave(){this.hovered=false;},click(){if(this.selectable)this.selected=true;this.OnButtonBaseClicked.emit();}};s.buttons.push(b);return b;}
    function panel(){return {...widget(),AddChildToOverlay:()=>({SetPadding(){},SetHorizontalAlignment(){},SetVerticalAlignment(){}}),AddChildToVerticalBox:()=>({SetPadding(){},SetHorizontalAlignment(){}}),AddChildToHorizontalBox:()=>({SetPadding(){},SetVerticalAlignment(){}})};}
    const nativeTemplate={Text_SettingName:{Font:{FontObject:'native-font',Size:19.5}},Slider_SettingValue:{WidgetStyle:{native:true},SliderBarColor:{},SliderHandleColor:{}},Button_Decrease:{NormalStyle:{native:true}}};
    const UE={Class:{Load:path=>path.includes('W_SettingsListEntry_Scalar')?'template':'button'},PBZSystemWidgetBase:class{static StaticClass(){return 'page';}PopSystemWidget(){s.backCount++;}},CanvasPanel:{StaticClass:()=> 'canvas'},Anchors:class{},Vector2D:class{},Overlay:{StaticClass:()=> 'overlay'},Image:{StaticClass:()=> 'image'},VerticalBox:{StaticClass:()=> 'box'},HorizontalBox:{StaticClass:()=> 'hbox'},SizeBox:{StaticClass:()=> 'size'},Button:{StaticClass:()=> 'step'},
        TextBlock:{StaticClass:()=> 'text'},Slider:{StaticClass:()=> 'slider'},PBZTabDescriptor:class{},FlowLocText:class{},Margin:class{},LinearColor:class{constructor(R,G,B,A){Object.assign(this,{R,G,B,A});}},SlateColor:class{constructor(SpecifiedColor){this.SpecifiedColor=SpecifiedColor;}},ESlateColorStylingMode:{UseColor_Specified:0},ESlateBrushDrawType:{NoDrawType:0},ESlateVisibility:{HitTestInvisible:0},EUINavigation:{Up:1,Down:2,Left:3,Right:4},EVerticalAlignment:{VAlign_Center:1,VAlign_Fill:2},EHorizontalAlignment:{HAlign_Left:1,HAlign_Center:2,HAlign_Fill:3},EPBZButtonAutoSelectMode:{Manual:0},
        WidgetBlueprintLibrary:{Create:(host,cls)=>typeof cls==='function'?Object.assign(new cls(),widget(),{WidgetTree:{}}):cls==='page'?{...widget(),WidgetTree:{}}:cls==='template'?nativeTemplate:button()},
        NewObject:cls=>{
            if(cls==='box'||cls==='hbox'||cls==='overlay')return panel();
            if(cls==='canvas')return {SetVisibility(){},AddChildToCanvas:()=>({SetAnchors(){},SetOffsets(){}})};
            if(cls==='image')return {SetBrush(){},SetColorAndOpacity(){},SetVisibility(){},SetRenderOpacity(){}};
            if(cls==='size')return {SetWidthOverride(v){this.width=v;},SetHeightOverride(){},AddChild(w){this.child=w;}};
            if(cls==='step'){const b={...widget(),WidgetStyle:{Normal:{},Hovered:{},Pressed:{},Disabled:{}},OnClicked:signal(),SetStyle(){},AddChild(w){this.label=w;return {SetHorizontalAlignment(){},SetVerticalAlignment(){}};}};s.buttons.push(b);return b;}
            if(cls==='text'){const t={SetText(v){this.text=v;},SetFont(f){this.Font={...f};},SetAutoWrapText(){},SetRenderOpacity(){}};s.texts.push(t);return t;}
            const slider={...widget(),OnValueChanged:signal(),SetSliderBarColor(){},SetSliderHandleColor(){},SetMinValue(){},SetMaxValue(){},SetStepSize(){},SetValue(v){this.value=v;this.OnValueChanged.emit(v);}};
            s.sliders.push(slider);return slider;
        }};
    // This build's reflected UE constructors have a null static prototype.
    // makeUClass's bundled JS preflight still calls cls.hasOwnProperty(...).
    Object.setPrototypeOf(UE.PBZSystemWidgetBase,null);
    s.host={Image_160:{Brush:{},ColorAndOpacity:{}},GetOwningPlayer:()=>({}),VisibilitySwitcher:{AddChild:p=>s.pages.push(p),GetChildIndex:p=>s.pages.indexOf(p)},
        TabToSwitcherIndexMap:{Add:(k,v)=>s.indices.set(k,v)},TabList:{OnTabSelected:signal(),
        TabButtonIDs:{Add:id=>s.ids.push(id)},PreregisteredTabInfoArray:{Add:d=>s.descriptors.push(d)},
        GetIndexByID:id=>s.ids.indexOf(id),GetPreregisteredTabInfo:(id,r)=>{r.value={};return true;},
        GetTabButton:id=>s.tabs.get(id),RegisterDynamicTab:d=>{s.tabs.set(d.TabId,button());s.registered=d;return true;}}};
    const deps={'ue':UE,'puerts':{$ref:v=>({value:v}),$unref:r=>r.value,makeUClass:cls=>{
        if(cls.hasOwnProperty('StaticClass'))throw Error('must inherit StaticClass');return cls;
    }},'cpp':{FText:{FromString:v=>v}},
        './runtime':{getSettings:()=>s.settings,persist:t=>{s.saved.push(t);return s.saveOk;},refreshCameraPreview:host=>{s.previewed.push({host,active:s.settings.active()});return s.previewOk;},valid:o=>!!o,log(){}},
        './vignette':require('../src/PBZCamera/vignette')};
    const module={exports:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../src/PBZCamera/menus'),'utf8'),{require:n=>deps[n],module});
    s.api=module.exports;s.api.attachPause(s.host);return s;
}
test('native page edits draft, applies explicitly, and cancels later edits on close',()=>{
    const s=fixture();s.sliders[0].OnValueChanged.emit(1.3);assert.equal(s.settings.active().distance,1.1);
    s.buttons.find(b=>b.text==='应用').OnButtonBaseClicked.emit();assert.equal(s.settings.active().distance,1.3);assert.equal(s.saved.length,1);
    s.sliders[0].OnValueChanged.emit(1.4);s.api.detachPause(s.host);assert.equal(s.settings.draft().distance,1.3);
});
test('closing removes page delegates; a pooled host can reopen with one binding per control',()=>{
    const s=fixture();const slider=s.sliders[0];
    s.api.detachPause(s.host);assert.equal(slider.OnValueChanged.count(),0);
    slider.OnValueChanged.emit(1.4);assert.equal(s.settings.draft().distance,1.1);
    s.api.attachPause(s.host);assert.equal(s.sliders.length,5);assert.equal(s.tabs.size,1);
    assert.equal(slider.OnValueChanged.count(),1);slider.OnValueChanged.emit(1.2);assert.equal(s.settings.draft().distance,1.2);
    s.api.detachPause(s.host);s.api.detachPause(s.host);assert.equal(slider.OnValueChanged.count(),0);
});
test('dynamic tab has a native selection index, content mapping, and independent localized title',()=>{
    const s=fixture();assert.equal(s.host.TabList.GetIndexByID('PBZCamera'),1);
    assert.equal(s.indices.get('PBZCamera'),1);assert.equal(s.pages[1],s.registered.CreatedTabContentWidget);
    assert.equal(s.descriptors.length,1);assert.equal(s.registered.TabText.Key,'');assert.equal(s.registered.TabText.ValueCache,'镜头设置');
});

test('camera actions do not latch a selected highlight after pointer leave or click',()=>{
    const s=fixture();
    for(const title of ['稳镜预设','恢复原版','应用','取消']){
        const b=s.buttons.find(b=>b.text===title);b.pointerEnter();b.click();b.pointerLeave();
        assert.equal(b.hovered,false);assert.equal(b.selected,false,title+' retained selection after mouse leave');
    }
});

test('camera tab sets visible text on the native localized text child',()=>{
    const s=fixture();assert.equal(s.tabs.get('PBZCamera').Text.text,'镜头设置');
});

test('step buttons use the field increment, clamp bounds, and only edit the draft',()=>{
    const s=fixture();const steps=s.buttons.filter(b=>b.OnClicked);
    assert.equal(steps.length,10);
    steps[1].OnClicked.emit();assert.equal(s.settings.draft().distance,1.15);
    for(let i=0;i<30;i++)steps[0].OnClicked.emit();assert.equal(s.settings.draft().distance,0.9);
    for(let i=0;i<50;i++)steps[3].OnClicked.emit();assert.equal(s.settings.draft().fov,40);
    steps[4].OnClicked.emit();assert.equal(s.settings.draft().shake,0.5);
    assert.equal(s.saved.length,0);assert.equal(s.settings.active().distance,1.1);
});

test('signed framing arrows edit five-centimetre drafts, clamp both directions and only preview after Apply',()=>{
    const s=fixture();assert.equal(s.sliders.length,5);const steps=s.buttons.filter(b=>b.OnClicked);
    steps[6].OnClicked.emit();assert.equal(s.settings.draft().offsetX,-5);assert.equal(s.settings.active().offsetX,0);
    steps[9].OnClicked.emit();assert.equal(s.settings.draft().offsetY,5);assert.equal(s.previewed.length,0);
    for(let i=0;i<70;i++)steps[6].OnClicked.emit();assert.equal(s.settings.draft().offsetX,-300);
    for(let i=0;i<130;i++)steps[7].OnClicked.emit();assert.equal(s.settings.draft().offsetX,300);
    for(let i=0;i<130;i++)steps[8].OnClicked.emit();assert.equal(s.settings.draft().offsetY,-300);
    s.buttons.find(b=>b.text==='应用').click();assert.equal(s.previewed[0].active.offsetX,300);assert.equal(s.previewed[0].active.offsetY,-300);
    s.sliders[3].OnValueChanged.emit(-50);s.buttons.find(b=>b.text==='取消').click();assert.equal(s.settings.draft().offsetX,300);
});

test('Apply previews only persisted values and reports unavailable preview separately from save failure',()=>{
    const s=fixture();s.sliders[1].OnValueChanged.emit(30);
    assert.equal(s.previewed.length,0);
    s.buttons.find(b=>b.text==='应用').click();
    assert.equal(s.previewed.length,1);assert.equal(s.previewed[0].host,s.host);assert.equal(s.previewed[0].active.fov,30);
    s.previewOk=false;s.sliders[1].OnValueChanged.emit(35);s.buttons.find(b=>b.text==='应用').click();
    assert.equal(s.settings.active().fov,35);assert.ok(s.texts.some(t=>String(t.text).includes('已保存')&&String(t.text).includes('预览')));
});

test('failed persistence never previews or changes active settings and keeps the edited draft',()=>{
    const s=fixture();s.saveOk=false;s.sliders[1].OnValueChanged.emit(30);
    s.buttons.find(b=>b.text==='应用').click();
    assert.equal(s.previewed.length,0);assert.equal(s.settings.active().fov,0);assert.equal(s.settings.draft().fov,30);
    assert.ok(s.texts.some(t=>String(t.text).includes('保存失败')));
});

test('native BackInput cancels unapplied edits and delegates to the original page pop',()=>{
    const s=fixture();s.sliders[1].OnValueChanged.emit(8);
    const page=s.registered.CreatedTabContentWidget;assert.equal(typeof page.BackInput,'function');page.BackInput();
    assert.equal(s.backCount,1);assert.equal(s.settings.draft().fov,s.settings.active().fov);assert.equal(s.saved.length,0);
});

test('camera tab uses black text when selected and white text when deselected',()=>{
    const s=fixture(),tab=s.tabs.get('PBZCamera');
    tab.selected=true;s.host.TabList.OnTabSelected.emit('PBZCamera');
    assert.equal(tab.Text.color?.SpecifiedColor.R,0);
    tab.selected=false;s.host.TabList.OnTabSelected.emit('System');assert.equal(tab.Text.color.SpecifiedColor.R,1);
});

test('reentering a tab or pooled menu clears discarded-draft status',()=>{
    const s=fixture();const notice=s.texts.find(t=>t.text.includes('调整后选择'));
    s.host.TabList.OnTabSelected.emit('PBZCamera');s.sliders[1].OnValueChanged.emit(8);assert.equal(notice.text,'尚未应用');
    s.host.TabList.OnTabSelected.emit('System');s.host.TabList.OnTabSelected.emit('PBZCamera');
    assert.equal(s.settings.draft().fov,s.settings.active().fov);assert.notEqual(notice.text,'尚未应用');
    s.sliders[1].OnValueChanged.emit(8);s.api.detachPause(s.host);s.api.attachPause(s.host);
    assert.notEqual(notice.text,'尚未应用');
});

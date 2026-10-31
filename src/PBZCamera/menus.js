"use strict";
const UE=require('ue');
const {$ref,$unref,makeUClass}=require('puerts');
const {FText}=require('cpp');
const {getSettings,persist,log,valid}=require('./runtime');
const {vignetteStrips}=require('./vignette');
const pauseStates=new WeakMap();
const cameraHint='调整后选择“应用”；返回会放弃未应用的修改。';
let cameraPageClass;
function getCameraPageClass(){
    if(!cameraPageClass)cameraPageClass=makeUClass(class PBZCameraPage extends UE.PBZSystemWidgetBase{
        // Reflected constructors in this build do not inherit Object.prototype;
        // the bundled makeUClass preflight nevertheless calls this method.
        static hasOwnProperty(key){return Object.prototype.hasOwnProperty.call(this,key);}
        BackInput(){
            getSettings().cancel();
            // The base event has no implementation. Use the same native page
            // pop as original System pages, so host animation/input cleanup runs.
            this.PopSystemWidget();
        }
    });
    return cameraPageClass;
}
const text=value=>FText.FromString(String(value));
function label(owner,value,font){
    const widget=UE.NewObject(UE.TextBlock.StaticClass(),owner);
    widget.SetText(text(value));if(font)widget.SetFont(font);
    return widget;
}
function subscribe(state,signal,callback){
    signal.Add(callback);state.bindings.push({signal,callback});
}
function unbind(state){
    for(const {signal,callback} of state.bindings){
        try{signal.Remove(callback);}catch(error){log('Menu callback cleanup: '+String(error));}
    }
    state.bound=false;
}
function button(owner,cls,value,callback,state,momentary=false){
    const widget=UE.WidgetBlueprintLibrary.Create(owner,cls,owner.GetOwningPlayer());
    if(!widget)throw Error('Native button creation failed');
    widget.SetButtonText(text(value));
    if(momentary){
        // These are commands, not members of a native selection group. PBZ's
        // hover-to-select default otherwise leaves every visited command selected.
        widget.AutoSelectMode=UE.EPBZButtonAutoSelectMode.Manual;
        widget.bSetSelectedOnHover=false;
        widget.SetShouldSelectUponReceivingFocus(false);
        widget.SetIsSelected(false);
        widget.SetIsSelectable(false);
    }
    if(state)subscribe(state,widget.OnButtonBaseClicked,callback);else widget.OnButtonBaseClicked.Add(callback);
    return widget;
}
function add(container,widget){
    const slot=container.AddChildToVerticalBox(widget);
    slot.SetPadding(new UE.Margin(16,6,16,6));
    return widget;
}
function makeCameraPage(host,buttonClass){
    const page=UE.WidgetBlueprintLibrary.Create(host,getCameraPageClass(),host.GetOwningPlayer());
    if(!page || !page.WidgetTree)throw Error('Native settings page has no WidgetTree');
    const overlay=UE.NewObject(UE.Overlay.StaticClass(),page.WidgetTree);
    const root=UE.NewObject(UE.HorizontalBox.StaticClass(),page.WidgetTree);
    page.WidgetTree.RootWidget=overlay;
    const background=UE.NewObject(UE.CanvasPanel.StaticClass(),page.WidgetTree);
    // Native settings have additional edge shading. Draw it locally using the
    // host's solid dimming brush, without copying its inactive paper texture or
    // depending on world-map material parameters/animations.
    for(const r of vignetteStrips()){
        const image=UE.NewObject(UE.Image.StaticClass(),page.WidgetTree);
        image.SetBrush(host.Image_160.Brush);
        // The host brush has a warm brown tint. Multiply it by black so this
        // layer always darkens the scene, including already-dark backgrounds.
        image.SetColorAndOpacity(new UE.LinearColor(0,0,0,1));
        image.SetRenderOpacity(r.alpha);
        const slot=background.AddChildToCanvas(image);
        slot.SetAnchors(new UE.Anchors(new UE.Vector2D(r.x0,r.y0),new UE.Vector2D(r.x1,r.y1)));
        slot.SetOffsets(new UE.Margin(0,0,0,0));
    }
    background.SetVisibility(UE.ESlateVisibility.HitTestInvisible);
    const bgSlot=overlay.AddChildToOverlay(background);
    bgSlot.SetHorizontalAlignment(UE.EHorizontalAlignment.HAlign_Fill);
    bgSlot.SetVerticalAlignment(UE.EVerticalAlignment.VAlign_Fill);
    overlay.AddChildToOverlay(root).SetPadding(new UE.Margin(80,165,80,95));
    const state={page,controls:[],sliders:[],bindings:[],bound:false,notice:null,selected:false,refreshing:false};
    try{
    const model=getSettings();model.cancel();
    // Use the game's own scalar entry as an inert style source. Its controls are
    // never shown or bound to our data; original settings remain independent.
    state.styleSource=UE.WidgetBlueprintLibrary.Create(host,UE.Class.Load('/Game/PBZContent/UI/Settings/Editors/W_SettingsListEntry_Scalar.W_SettingsListEntry_Scalar_C'),host.GetOwningPlayer());
    const source=state.styleSource,nativeFont=source.Text_SettingName.Font;
    const make=cls=>UE.NewObject(cls.StaticClass(),page.WidgetTree);
    const size=(widget,width,height)=>{
        const frame=make(UE.SizeBox);frame.SetWidthOverride(width);
        if(height!==undefined)frame.SetHeightOverride(height);
        frame.AddChild(widget);return frame;
    };
    const horizontal=(container,widget,padding=0)=>{
        const slot=container.AddChildToHorizontalBox(widget);
        slot.SetVerticalAlignment(UE.EVerticalAlignment.VAlign_Center);
        slot.SetPadding(new UE.Margin(padding,0,padding,0));return widget;
    };
    const nativeLabel=(value,opacity=1,fontSize=22)=>{
        const w=label(page,value,nativeFont);
        // SetFont copies the template; resize only the new text's private font.
        const font=w.Font;font.Size=fontSize;w.SetFont(font);
        w.SetRenderOpacity(opacity);return w;
    };
    const box=make(UE.VerticalBox),help=make(UE.VerticalBox);
    root.AddChildToHorizontalBox(size(box,1000));
    root.AddChildToHorizontalBox(size(help,500)).SetPadding(new UE.Margin(180,95,0,0));
    add(box,nativeLabel('镜头设置',1,24));
    add(box,size(nativeLabel('战斗镜头',0.55,20),960,60));
    const fields=[['distance','战斗镜头距离',0.9,1.4,0.05,v=>Math.round(v*100)+'%'],['fov','视野角增量',0,10,1,v=>v.toFixed(0)+'°'],['shake','战斗抖动幅度',0,1,0.1,v=>Math.round(v*100)+'%']];
    for(const [key,title,min,max,step,format] of fields){
        const row=make(UE.HorizontalBox);add(box,size(row,960,64));
        horizontal(row,size(nativeLabel(title),520));
        const caption=nativeLabel('');
        const slider=make(UE.Slider);
        slider.WidgetStyle=source.Slider_SettingValue.WidgetStyle;
        slider.SetSliderBarColor(source.Slider_SettingValue.SliderBarColor);
        slider.SetSliderHandleColor(source.Slider_SettingValue.SliderHandleColor);
        slider.SetMinValue(min);slider.SetMaxValue(max);slider.SetStepSize(step);slider.IsFocusable=true;
        slider.MouseUsesStep=true;slider.RequiresControllerLock=false;
        const edit=value=>{
            if(state.refreshing)return;
            const next=Math.max(min,Math.min(max,Math.round(value/step)*step));
            model.edit(key,Number(next.toFixed(4)));state.refresh();
            state.notice.SetText(text('尚未应用'));
        };
        const stepButton=(glyph,direction)=>{
            const b=make(UE.Button);
            const style=b.WidgetStyle;
            style.Normal.DrawAs=UE.ESlateBrushDrawType.NoDrawType;
            style.Disabled.DrawAs=UE.ESlateBrushDrawType.NoDrawType;
            for(const [brush,alpha] of [[style.Hovered,0.12],[style.Pressed,0.2]]){
                brush.TintColor=new UE.SlateColor(new UE.LinearColor(1,1,1,alpha),UE.ESlateColorStylingMode.UseColor_Specified);
            }
            b.SetStyle(style);
            const slot=b.AddChild(nativeLabel(glyph));
            slot.SetHorizontalAlignment(UE.EHorizontalAlignment.HAlign_Center);
            slot.SetVerticalAlignment(UE.EVerticalAlignment.VAlign_Center);
            subscribe(state,b.OnClicked,()=>edit(model.draft()[key]+direction*step));
            horizontal(row,size(b,34,38),6);return b;
        };
        const decrease=stepButton('<',-1);
        horizontal(row,size(slider,220,38),6);
        horizontal(row,size(caption,76),6);
        const increase=stepButton('>',1);
        slider.SetNavigationRuleExplicit(UE.EUINavigation.Left,decrease);
        slider.SetNavigationRuleExplicit(UE.EUINavigation.Right,increase);
        state.controls.push(decrease,slider,increase);state.sliders.push({slider,caption,key,title,format});
        subscribe(state,slider.OnValueChanged,edit);
    }
    state.refresh=()=>{
        state.refreshing=true;
        try{const draft=model.draft();for(const row of state.sliders){row.slider.SetValue(draft[row.key]);row.caption.SetText(text(row.format(draft[row.key])));}}
        finally{state.refreshing=false;}
    };
    const presets=make(UE.HorizontalBox),commands=make(UE.HorizontalBox);
    add(box,size(presets,960,70));add(box,size(commands,960,70));
    const action=(container,title,callback)=>{
        const b=button(host,buttonClass,title,callback,state,true);
        b.SetWidthOverride(260);
        if(valid(b.ButtonTextBlock))b.ButtonTextBlock.SetFont(nativeFont);
        horizontal(container,size(b,260,54),12);state.controls.push(b);return b;
    };
    action(presets,'稳镜预设',()=>{model.preset('steady');state.refresh();state.notice.SetText(text('尚未应用'));});
    action(presets,'恢复原版',()=>{model.preset('original');state.refresh();state.notice.SetText(text('尚未应用'));});
    action(commands,'应用',()=>{
        try{model.apply(persist);state.notice.SetText(text('已应用并保存'));log('Camera settings applied '+JSON.stringify(model.active()));}
        catch(error){state.notice.SetText(text('保存失败，设置未应用'));log('Camera save failed: '+String(error));}
    });
    action(commands,'取消',()=>{model.cancel();state.refresh();state.notice.SetText(text('已取消本次修改'));});
    state.notice=add(box,nativeLabel(cameraHint,0.65,20));
    for(const [title,description] of [
        ['战斗镜头距离','拉远镜头，扩大周边视野。每次调整 5%，范围为原版的 90% 至 140%。'],
        ['视野角增量','在原版视野角上增加 0° 至 10°，每次调整 1°。'],
        ['战斗抖动幅度','降低战斗中的镜头抖动。每次调整 10%；0% 关闭抖动，100% 保持原版。']]){
        add(help,nativeLabel(title));const body=nativeLabel(description,0.65,20);body.SetAutoWrapText(true);add(help,body);
        add(help,size(nativeLabel(''),400,26));
    }
    for(let i=0;i<state.controls.length;i++){
        const c=state.controls[i];
        c.SetNavigationRuleExplicit(UE.EUINavigation.Up,state.controls[(i+state.controls.length-1)%state.controls.length]);
        c.SetNavigationRuleExplicit(UE.EUINavigation.Down,state.controls[(i+1)%state.controls.length]);
    }
    page.SetDesiredFocusWidget(state.sliders[0].slider);
    state.refresh();return state;
    }catch(error){unbind(state);throw error;}
}
function attachPause(host){
    const previous=pauseStates.get(host);
    if(previous && valid(previous.page) && previous.tabList===host.TabList && valid(host.TabList.GetTabButton('PBZCamera'))){
        if(previous.bound)return;
        for(const {signal,callback} of previous.bindings)signal.Add(callback);
        previous.bound=true;previous.selected=false;getSettings().cancel();previous.refresh();previous.notice.SetText(text(cameraHint));previous.fixTitle();return;
    }
    if(previous){unbind(previous);pauseStates.delete(host);}
    const tabList=host.TabList;
    if(!valid(tabList))throw Error('System TabList unavailable');
    const info=$ref(new UE.PBZTabDescriptor());
    if(!tabList.GetPreregisteredTabInfo('System',info))throw Error('System tab descriptor unavailable');
    const desc=$unref(info);
    const actionClass=UE.Class.Load('/Game/PBZContent/UI/UINew/Common/W_MenuButton_V2_SelectedVersion.W_MenuButton_V2_SelectedVersion_C');
    const state=makeCameraPage(host,actionClass);
    try{
    desc.TabId='PBZCamera';desc.bHidden=false;desc.CreatedTabContentWidget=state.page;desc.TabContentType=getCameraPageClass();
    const title=new UE.FlowLocText();title.Namespace='';title.Key='';title.ValueCache=text('镜头设置');desc.TabText=title;
    if(!tabList.RegisterDynamicTab(desc))throw Error('Camera tab registration failed');
    // RegisterDynamicTab creates the button, but this build leaves the native index/content arrays unchanged.
    tabList.PreregisteredTabInfoArray.Add(desc);tabList.TabButtonIDs.Add('PBZCamera');
    if(host.VisibilitySwitcher.GetChildIndex(state.page)<0)host.VisibilitySwitcher.AddChild(state.page);
    host.TabToSwitcherIndexMap.Add('PBZCamera',host.VisibilitySwitcher.GetChildIndex(state.page));
    const tab=tabList.GetTabButton('PBZCamera');
    if(!tab)throw Error('Camera tab button unavailable');
    state.fixTitle=()=>{
        tab.SetButtonText(text('镜头设置'));tab.Text.SetPBZFormatText(text('镜头设置'));
        const selected=tab.GetSelected(),shade=selected?0:1;
        tab.Text.SetColorAndOpacity(new UE.SlateColor(new UE.LinearColor(shade,shade,shade,1),UE.ESlateColorStylingMode.UseColor_Specified));
        tab.Text.SetRenderOpacity(selected?1:0.64);
    };
    state.fixTitle();
    state.onTab=id=>{
        state.fixTitle();
        if(String(id)==='PBZCamera'){
            getSettings().cancel();state.refresh();state.notice.SetText(text(cameraHint));state.selected=true;
            state.sliders[0].slider.SetUserFocus(host.GetOwningPlayer());
        }else if(state.selected){getSettings().cancel();state.selected=false;}
    };
    subscribe(state,tabList.OnTabSelected,state.onTab);state.tabList=tabList;state.bound=true;
    pauseStates.set(host,state);log('Native ESC camera tab attached');
    }catch(error){unbind(state);throw error;}
}
function detachPause(host){
    const state=pauseStates.get(host);if(!state)return;
    getSettings().cancel();
    unbind(state);state.selected=false;
}
module.exports={attachPause,detachPause};

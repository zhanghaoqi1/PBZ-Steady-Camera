"use strict";
const UE=require('ue');
const entries=[];
function record(message){
    const line=String(message).slice(0,1200);
    entries.push(new Date().toISOString()+' '+line);
    if(entries.length>100)entries.shift();
    console.log('[PBZCamera] '+line);
    try{
        UE.EasyCsv.SaveStringToFileWithFullPath(entries.join('\n')+'\n',UE.BlueprintPathsLibrary.ProjectSavedDir()+'PBZCamera-diagnostics.txt');
    }catch(error){console.error('[PBZCamera] Diagnostic file unavailable: '+String(error));}
}
module.exports={record};

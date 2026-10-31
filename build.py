"""Build a camera-only PBZ package from fingerprinted, locally extracted scripts."""
from pathlib import Path
import argparse
import datetime
import hashlib
import json
import re
import shutil
import subprocess
import sys
import zipfile

ROOT=Path(__file__).resolve().parent
MODULES=('camera-settings.js','owned-scalar.js','runtime.js','menus.js','diagnostics.js','vignette.js')
HOOKS={
    'UI/Widget/SystemBase.js':('SystemBaseMixinInterface',{
        'TsConstruct':('after',"require('../../PBZCamera/menus').attachPause(this);"),
        'TsDestruct':('before',"require('../../PBZCamera/menus').detachPause(this);")}),
    'Gameplay/GameModeBuild.js':('GameModeBuildMixinInterface',{
        'bindSaveTipExtension':('after',"require('../PBZCamera/runtime').start(this);"),
        'ReceiveEndPlay':('before',"require('../PBZCamera/runtime').stop(this);")})}

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()

def validate_modules(directory):
    names={p.name for p in directory.iterdir()}
    if names!=set(MODULES):raise ValueError('Unexpected or missing camera module: '+str(sorted(names^set(MODULES))))
    external={'ue','puerts','cpp','../Library/TsHelper'}
    for name in MODULES:
        source=(directory/name).read_text(encoding='utf-8')
        if re.search(r'boss|rematch|probe|ue4ss|readBossRecord',source,re.I):raise ValueError('Forbidden camera dependency/content: '+name)
        if re.search(r'[A-Za-z]:[\\/]',source):raise ValueError('Local machine path in camera source: '+name)
        for _,dep in re.findall(r"require\((['\"])([^'\"]+)\1\)",source):
            if dep not in external and not (dep.startswith('./') and dep[2:]+'.js' in MODULES):
                raise ValueError('Unexpected camera dependency: '+dep)
    return sorted(names)

def patch_script(source,export,methods,diagnostic_import):
    footer=['\n// PBZCamera extension; original method bodies retained.','{',
            "const diagnostic=require('"+diagnostic_import+"').record;",
            'const prototype=exports.'+export+'.prototype;']
    for method,(order,statement) in methods.items():
        if order not in ('before','after') or method+'(' not in source:raise ValueError('Missing original lifecycle: '+method)
        callback='try {'+statement+'} catch(error) {diagnostic("'+method+': "+String(error));}'
        footer.append('{ const original=prototype.'+method+'; prototype.'+method+'=function(...args){'+
            (callback if order=='before' else '')+'const result=original.apply(this,args);'+
            (callback if order=='after' else '')+'return result;}; }')
    return source+'\n'.join(footer)+'\n}\n'

def prepare_payload(project,originals,stage):
    meta=json.loads((project/'mod.json').read_text(encoding='utf-8'))
    validate_modules(project/'src/PBZCamera')
    # Verify every original before creating any staging output.
    for relative in HOOKS:
        path=originals/relative
        if not path.is_file() or sha(path)!=meta['original_scripts'][relative]:raise ValueError('Original fingerprint mismatch: '+relative)
    scripts=stage/'ProjectPBZ/Content/JavaScript';scripts.mkdir(parents=True)
    shutil.copytree(project/'src/PBZCamera',scripts/'PBZCamera')
    for relative,(export,methods) in HOOKS.items():
        target=scripts/relative;target.parent.mkdir(parents=True,exist_ok=True)
        diagnostic='../../PBZCamera/diagnostics' if relative.startswith('UI/') else '../PBZCamera/diagnostics'
        target.write_text(patch_script((originals/relative).read_text(encoding='utf-8'),export,methods,diagnostic),encoding='utf-8')
    return {p.relative_to(stage).as_posix():sha(p) for p in stage.rglob('*') if p.is_file()}

def run(args):
    result=subprocess.run([str(x) for x in args],check=True,capture_output=True,text=True,encoding='utf-8')
    if result.stdout:print(result.stdout,end='')
    if result.stderr:print(result.stderr,end='',file=sys.stderr)
    return result.stdout+result.stderr

def zip_tree(directory,target,root_name):
    with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for p in sorted(directory.rglob('*')):
            if p.is_file():z.write(p,root_name+'/'+p.relative_to(directory).as_posix())

def build(args):
    meta=json.loads((ROOT/'mod.json').read_text(encoding='utf-8'))
    stamp=datetime.datetime.now().strftime('%Y%m%d-%H%M%S-%f')
    work=args.out.resolve()/('build-'+stamp);stage=work/'stage'
    run([sys.executable,'-X','utf8','-m','unittest','discover','-s',ROOT/'tests','-p','test_*.py','-v'])
    node_result=run(['node','--test','--test-reporter=spec',*sorted((ROOT/'tests').glob('*.test.cjs'))])
    counts=re.findall(r'(?m)^.*?tests (\d+)\s*$',node_result)
    payload=prepare_payload(ROOT,args.originals.resolve(),stage)
    for p in sorted(stage.rglob('*.js')):run(['node','--check',p])
    package=work/'player';paks=package/'ProjectPBZ/Content/Paks/~mods';paks.mkdir(parents=True)
    name=meta['pak_name']
    run([args.repak,'pack','--version','V11','--quiet',stage,paks/(name+'.pak')])
    empty=work/'empty';empty.mkdir();zen=work/'zen';zen.mkdir()
    run([args.retoc,'to-zen','--version','UE5_7',empty,zen/(name+'.utoc')])
    for suffix in ('.utoc','.ucas'):shutil.copyfile(zen/(name+suffix),paks/(name+suffix))
    verify=work/'unpacked';run([args.repak,'unpack','--quiet','-o',verify,paks/(name+'.pak')])
    actual={p.relative_to(verify).as_posix():sha(p) for p in verify.rglob('*') if p.is_file()}
    if actual!=payload:raise ValueError('PAK roundtrip mismatch')
    expected={'ProjectPBZ/Content/JavaScript/PBZCamera/'+n for n in MODULES}|{'ProjectPBZ/Content/JavaScript/'+p for p in HOOKS}
    if set(payload)!=expected:raise ValueError('Unexpected archive payload')
    for p in (ROOT/'docs').iterdir():
        if p.is_file():shutil.copyfile(p,package/p.name)
    report={
        'mod':meta['name'],'version':meta['version'],'game':meta['game'],
        'config_file':'%LOCALAPPDATA%/ProjectPBZ/Saved/PBZCamera.json',
        'external_loader_required':False,'boss_features_included':False,'developer_probe_included':False,
        'validation':{'python_release_tests':'PASS','node_camera_tests':int(counts[-1]) if counts else 'PASS',
            'javascript_syntax':'PASS','pak_roundtrip':'PASS','payload_allowlist':'PASS',
            'standalone_in_game_test':'NOT RUN; prior in-game evidence applies to the shared camera implementation only'},
        'containers':{p.name:{'sha256':sha(p),'bytes':p.stat().st_size} for p in sorted(paks.iterdir())},'payload':payload}
    (package/'MANIFEST.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    sums=['%s  %s'%(sha(p),p.relative_to(package).as_posix()) for p in sorted(package.rglob('*')) if p.is_file()]
    (package/'SHA256SUMS.txt').write_text('\n'.join(sums)+'\n',encoding='utf-8')
    stem='PBZ_SteadyCamera_v'+meta['version'];player_zip=args.out/(stem+'.zip')
    zip_tree(package,player_zip,stem)
    source_zip=args.out/(stem+'_source.zip')
    source_paths=[ROOT/'build.py',ROOT/'mod.json',ROOT/'README_BUILD.md']+list((ROOT/'src/PBZCamera').glob('*.js'))+list((ROOT/'tests').glob('*.cjs'))+list((ROOT/'tests').glob('test_*.py'))+list((ROOT/'docs').glob('*'))
    with zipfile.ZipFile(source_zip,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for p in sorted(source_paths):
            if p.is_file():z.write(p,stem+'_source/'+p.relative_to(ROOT).as_posix())
    for path in (player_zip,source_zip):
        with zipfile.ZipFile(path) as z:
            if z.testzip() is not None:raise ValueError('ZIP CRC failure')
    checksum=args.out/(stem+'_SHA256.txt')
    checksum.write_text('\n'.join(sha(p)+'  '+p.name for p in (player_zip,source_zip))+'\n',encoding='utf-8')
    receipt={'player_zip':str(player_zip.resolve()),'source_zip':str(source_zip.resolve()),'checksums':str(checksum.resolve()),'work':str(work),'manifest':report}
    (args.out/'latest-release.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2),encoding='utf-8')
    print('CAMERA-ONLY SHARE PACKAGE:',player_zip)

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--originals',type=Path,required=True,help='Extracted original JavaScript directory; game files are read only')
    parser.add_argument('--repak',required=True);parser.add_argument('--retoc',required=True)
    parser.add_argument('--out',type=Path,default=ROOT/'out')
    a=parser.parse_args();a.out.mkdir(parents=True,exist_ok=True);build(a)

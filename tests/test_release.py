from pathlib import Path
import importlib.util
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('camera_release_build',ROOT/'build.py')
build=importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)

class ReleaseTests(unittest.TestCase):
    def test_wrapper_preserves_original_and_orders_cleanup_before_endplay(self):
        source='exports.Foo=class { ReceiveEndPlay(){} };\n'
        patched=build.patch_script(source,'Foo',{'ReceiveEndPlay':('before',"require('../PBZCamera/runtime').stop(this);")},'../PBZCamera/diagnostics')
        self.assertTrue(patched.startswith(source))
        self.assertLess(patched.index('stop(this)'),patched.index('original.apply(this,args)'))
        self.assertIn('return result;',patched)

    def test_camera_sources_resolve_without_boss_or_developer_modules(self):
        names=build.validate_modules(ROOT/'src/PBZCamera')
        self.assertEqual(set(names),set(build.MODULES))

    def test_unexpected_module_or_dependency_is_refused(self):
        with tempfile.TemporaryDirectory() as tmp:
            target=Path(tmp)
            for name in build.MODULES:(target/name).write_text('module.exports={};',encoding='utf-8')
            (target/'runtime.js').write_text("require('./probe');",encoding='utf-8')
            with self.assertRaisesRegex(ValueError,'dependency'):build.validate_modules(target)
            (target/'runtime.js').write_text('module.exports={};',encoding='utf-8')
            (target/'probe.js').write_text('',encoding='utf-8')
            with self.assertRaisesRegex(ValueError,'module'):build.validate_modules(target)

    def test_original_fingerprint_mismatch_refuses_before_staging(self):
        with tempfile.TemporaryDirectory() as tmp:
            originals=Path(tmp)/'originals';stage=Path(tmp)/'stage'
            for relative in build.HOOKS:
                p=originals/relative;p.parent.mkdir(parents=True,exist_ok=True);p.write_text('changed original',encoding='utf-8')
            with self.assertRaisesRegex(ValueError,'Original fingerprint'):build.prepare_payload(ROOT,originals,stage)
            self.assertFalse(stage.exists())

if __name__=='__main__':unittest.main()

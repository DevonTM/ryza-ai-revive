/* i18n parity and leakage regression test.
   Asserts:
   1. Key parity between zh, ja, and en in UI dictionary T.
   2. Key parity between ja, zh, and en in CONTENT dictionary.
   3. No CJK characters leaking into T.en.
   Run: node scripts/i18n_check.js */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const ctx = { window: {}, document: {}, console };
ctx.window = ctx;
ctx.global = ctx;
vm.createContext(ctx);

vm.runInContext(fs.readFileSync(path.join(ROOT, 'web/js/util.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'web/js/config.js'), 'utf8'), ctx);

let i18nCode = fs.readFileSync(path.join(ROOT, 'web/js/i18n.js'), 'utf8');
i18nCode = i18nCode.replace(
  'global.I18n = I18n;',
  'global.I18n = I18n; global.__T = T; global.__CONTENT = CONTENT;'
);
vm.runInContext(i18nCode, ctx);

let failures = 0;
const bad = (msg) => { failures++; console.error('  FAIL ' + msg); };
const ok = (cond, name) => { if (cond) console.log('  PASS ' + name); else bad(name); };

const parsedT = ctx.window.__T || {};
const parsedContent = ctx.window.__CONTENT || {};

console.log('--- Checking UI dictionary (T) parity ---');
const zhKeys = Object.keys(parsedT.zh || {}).sort();
const jaKeys = Object.keys(parsedT.ja || {}).sort();
const enKeys = Object.keys(parsedT.en || {}).sort();

const missingInJa = zhKeys.filter((k) => !(k in parsedT.ja));
const missingInEn = zhKeys.filter((k) => !(k in parsedT.en));
const missingInZh = jaKeys.filter((k) => !(k in parsedT.zh));

ok(missingInJa.length === 0, 'All zh keys exist in ja' + (missingInJa.length ? ' (missing: ' + missingInJa.join(', ') + ')' : ''));
ok(missingInEn.length === 0, 'All zh keys exist in en' + (missingInEn.length ? ' (missing: ' + missingInEn.join(', ') + ')' : ''));
ok(missingInZh.length === 0, 'All ja keys exist in zh' + (missingInZh.length ? ' (missing: ' + missingInZh.join(', ') + ')' : ''));

console.log('--- Checking English UI for CJK leaks ---');
const cjkRegex = /[\u4e00-\u9fff\u3040-\u30ff]/;
let cjkLeaks = [];
for (const k of Object.keys(parsedT.en || {})) {
  if (k.startsWith('lang.')) continue; /* native endonyms intentionally allowed */
  const val = String(parsedT.en[k]);
  if (cjkRegex.test(val)) {
    cjkLeaks.push(k + ': ' + val);
  }
}
ok(cjkLeaks.length === 0, 'No CJK characters in T.en' + (cjkLeaks.length ? ' (leaks: ' + cjkLeaks.join('; ') + ')' : ''));

console.log('--- Checking CONTENT dictionary parity ---');
if (parsedContent.ja && parsedContent.zh && parsedContent.en) {
  const cJaKeys = Object.keys(parsedContent.ja).sort();
  const cZhKeys = Object.keys(parsedContent.zh).sort();
  const cEnKeys = Object.keys(parsedContent.en).sort();

  const cMissingZh = cJaKeys.filter((k) => !(k in parsedContent.zh));
  const cMissingEn = cJaKeys.filter((k) => !(k in parsedContent.en));
  ok(cMissingZh.length === 0, 'All ja content keys exist in zh' + (cMissingZh.length ? ' (missing: ' + cMissingZh.join(', ') + ')' : ''));
  ok(cMissingEn.length === 0, 'All ja content keys exist in en' + (cMissingEn.length ? ' (missing: ' + cMissingEn.join(', ') + ')' : ''));

  if (parsedContent.id) {
    const cMissingId = cJaKeys.filter((k) => !(k in parsedContent.id));
    ok(cMissingId.length === 0, 'All ja content keys exist in id' + (cMissingId.length ? ' (missing: ' + cMissingId.join(', ') + ')' : ''));
  }
}

if (failures === 0) {
  console.log('\nI18N CHECK: ALL PASS (' + zhKeys.length + ' UI keys verified across zh/ja/en)');
  process.exit(0);
} else {
  console.error('\nI18N CHECK: ' + failures + ' FAILURE(S)');
  process.exit(1);
}

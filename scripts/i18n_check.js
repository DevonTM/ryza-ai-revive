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

console.log('--- Checking non-CJK UI dictionaries for CJK leaks ---');
const cjkRegex = /[\u4e00-\u9fff\u3040-\u30ff]/;
['en', 'id', 'hi', 'pt-br'].forEach((lang) => {
  let cjkLeaks = [];
  const dict = parsedT[lang] || {};
  for (const k of Object.keys(dict)) {
    if (k.startsWith('lang.')) continue; /* native endonyms intentionally allowed */
    const val = String(dict[k]);
    if (cjkRegex.test(val)) {
      cjkLeaks.push(k + ': ' + val);
    }
  }
  ok(cjkLeaks.length === 0, 'No CJK characters in T.' + lang + (cjkLeaks.length ? ' (leaks: ' + cjkLeaks.join('; ') + ')' : ''));
});

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

console.log('--- Checking World Hierarchy and NPC Notes coverage ---');
const wh = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/assets/world_map/world_hierarchy.json'), 'utf8'));
const npcPlacement = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/assets/world_map/npc_placement.json'), 'utf8'));

const hierarchyPlaceIds = [];
wh.areas.forEach((a) => {
  hierarchyPlaceIds.push(a.id);
  a.fields.forEach((f) => {
    hierarchyPlaceIds.push(f.id);
    f.stages.forEach((s) => {
      hierarchyPlaceIds.push(s.id);
    });
  });
});

['zh', 'en', 'id'].forEach((lang) => {
  const missingPlaces = hierarchyPlaceIds.filter((id) => !parsedContent[lang] || !(('place.' + id) in parsedContent[lang]));
  ok(missingPlaces.length === 0, 'All ' + hierarchyPlaceIds.length + ' hierarchy places have place.* in ' + lang + (missingPlaces.length ? ' (missing: ' + missingPlaces.slice(0, 5).join(', ') + '...)' : ''));
});

const noteNpcIds = npcPlacement.npcs.filter((n) => n.note).map((n) => n.id.replace(/^npc_/, ''));
['zh', 'en', 'id'].forEach((lang) => {
  const missingNotes = noteNpcIds.filter((id) => !parsedContent[lang] || !(('npcnote.' + id) in parsedContent[lang]));
  ok(missingNotes.length === 0, 'All ' + noteNpcIds.length + ' NPC notes have npcnote.* in ' + lang + (missingNotes.length ? ' (missing: ' + missingNotes.join(', ') + ')' : ''));
});

const allNpcIds = npcPlacement.npcs.map((n) => n.id.replace(/^npc_/, ''));
['ja', 'zh', 'en', 'id'].forEach((lang) => {
  const missingNpcs = allNpcIds.filter((id) => !parsedContent[lang] || !(('npc.' + id) in parsedContent[lang]));
  ok(missingNpcs.length === 0, 'All ' + allNpcIds.length + ' placement NPCs have npc.* in ' + lang + (missingNpcs.length ? ' (missing: ' + missingNpcs.join(', ') + ')' : ''));
});

console.log('--- Checking index.html for unlocalized tooltips ---');
const html = fs.readFileSync(path.join(ROOT, 'web/index.html'), 'utf8');
const tagRegex = /<[^>]+>/g;
let unlocalizedTitles = [];
let missingTitleKeys = [];
let match;
while ((match = tagRegex.exec(html)) !== null) {
  const tag = match[0];
  const titleMatch = tag.match(/\btitle="([^"]*)"/);
  if (titleMatch && cjkRegex.test(titleMatch[1])) {
    const i18nMatch = tag.match(/\bdata-i18n-title="([^"]+)"/);
    if (!i18nMatch) {
      unlocalizedTitles.push(tag);
    } else {
      const key = i18nMatch[1];
      if (!(key in (parsedT.en || {})) && !(key in (parsedT.zh || {}))) {
        missingTitleKeys.push(key);
      }
    }
  }
}
ok(unlocalizedTitles.length === 0, 'All CJK titles carry data-i18n-title' + (unlocalizedTitles.length ? ' (' + unlocalizedTitles.join(', ') + ')' : ''));
ok(missingTitleKeys.length === 0, 'All data-i18n-title keys exist in dictionary' + (missingTitleKeys.length ? ' (' + missingTitleKeys.join(', ') + ')' : ''));

console.log('--- Checking index.html for unlocalized text content ---');
const cleanHtml = html.replace(/<!--[\s\S]*?-->/g, '');
const dynamicIds = new Set([
  'drawer-day', 'voice-pill-label', 'btn-posture', 'btn-tod-label',
  'hud-place', 'hud-tod', 'hud-mode', 'log-sub'
]);

const elemRegex = /<([a-zA-Z0-9]+)\b([^>]*)>([\s\S]*?)<\/\1>/g;
let unlocalizedTexts = [];
let em;
while ((em = elemRegex.exec(cleanHtml)) !== null) {
  const tag = em[1];
  const attrs = em[2];
  const body = em[3];
  if (cjkRegex.test(body)) {
    const idMatch = attrs.match(/\bid="([^"]+)"/);
    const id = idMatch ? idMatch[1] : null;
    if (id && dynamicIds.has(id)) continue;
    const hasI18n = attrs.includes('data-i18n=') || body.includes('data-i18n=');
    if (!hasI18n) {
      unlocalizedTexts.push('<' + tag + (id ? ' id="' + id + '"' : '') + '>' + body.replace(/\s+/g, ' ').trim() + '</' + tag + '>');
    }
  }
}
ok(unlocalizedTexts.length === 0, 'All CJK text tags carry data-i18n' + (unlocalizedTexts.length ? ' (' + unlocalizedTexts.join(', ') + ')' : ''));

if (failures === 0) {
  console.log('\nI18N CHECK: ALL PASS (' + zhKeys.length + ' UI keys verified across zh/ja/en)');
  process.exit(0);
} else {
  console.error('\nI18N CHECK: ' + failures + ' FAILURE(S)');
  process.exit(1);
}

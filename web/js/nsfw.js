/* Screen clothing vs atlas variant. No costume ids, no player-keyword lists.

   The LLM decides (including refuse). The tag-line field is `undress:on` /
   `undress:off` (`nsfw` still parsed as an alias). Player words never force
   it. Copying the filled prefix (or omit / keep) leaves the screen.
   Atlas files stay `{page}nsfw.png`. Policy text lives once in api.js. */
(function (global) {
  'use strict';

  var VARIANT = 'nsfw';

  function apply(on) {
    on = !!on;
    Nsfw._on = on;
    try {
      if (global.Config && typeof global.Config.set === 'function') {
        global.Config.set('state.undressed', on);
      }
    } catch (e) {}
    var av = global.Avatar;
    if (av && typeof av.setAtlasVariant === 'function') {
      av.setAtlasVariant(on ? VARIANT : 'default');
    }
  }

  function currentOutfit() {
    try {
      var av = global.Avatar;
      var skin = (global.Config && typeof global.Config.section === 'function' &&
                  global.Config.section('state').skin) || 'crf_skn_002_0001';
      if (av && typeof av.outfitName === 'function') return av.outfitName(skin);
      if (av && typeof av.outfitOf === 'function') {
        var oid = av.outfitOf(skin);
        var NAMES = {
          'crf_skn_002_0001': '普段着',
          'crf_skn_002_0002': 'ディヴェルの抱擁',
          'crf_skn_002_0003': 'お気に入りの普段着',
          'crf_skn_002_0004': '百夏の礼装'
        };
        return NAMES[oid] || oid;
      }
    } catch (e) {}
    return '普段の服';
  }

  function init() {
    try {
      if (global.Config && typeof global.Config.section === 'function') {
        var app = global.Config.section('app');
        if (app && app.restoreChat === false) {
          apply(false);
          return;
        }
        var nsfw = global.Config.section('nsfw');
        if (nsfw && nsfw.enabled === false) {
          apply(false);
          return;
        }
        var st = global.Config.section('state');
        if (st && st.undressed) apply(true);
      }
    } catch (e) {}
  }

  var Nsfw = {
    VARIANT: VARIANT,
    _on: false,
    init: init,
    active: function () { return !!Nsfw._on; },
    apply: apply,
    reset: function () { apply(false); },
    /* One fact for the system prompt. Not a rule list. */
    screenFact: function () {
      var outfit = currentOutfit();
      return Nsfw._on
        ? 'いまの画面：肌が見えている（' + outfit + 'は脱いだあと）。'
        : 'いまの画面：' + outfit + 'を着ている。';
    },
    onTurn: function (reply) {
      var flag = reply && typeof reply.nsfw === 'boolean' ? reply.nsfw : null;
      if (flag === true) {
        try {
          var nsfw = global.Config && typeof global.Config.section === 'function' && global.Config.section('nsfw');
          if (nsfw && nsfw.enabled === false) return;
        } catch (e) {}
        apply(true);
      } else if (flag === false) {
        apply(false);
      }
    }
  };

  global.Nsfw = Nsfw;
  init();
})(typeof window !== 'undefined' ? window : globalThis);

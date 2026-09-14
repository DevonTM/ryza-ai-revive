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

  function init() {
    try {
      if (global.Config && typeof global.Config.section === 'function') {
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
      return Nsfw._on
        ? 'いまの画面：肌が見えている（服は脱いだあと）。'
        : 'いまの画面：普段の服を着ている。';
    },
    onTurn: function (reply) {
      var flag = reply && typeof reply.nsfw === 'boolean' ? reply.nsfw : null;
      if (flag === true) apply(true);
      else if (flag === false) apply(false);
    }
  };

  global.Nsfw = Nsfw;
  init();
})(typeof window !== 'undefined' ? window : globalThis);

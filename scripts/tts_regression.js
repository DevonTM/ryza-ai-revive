/* Headless regression for TTS endpoint URL and request body formatting.
   Run: node scripts/tts_regression.js
   Exit code 0 = pass.
*/
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Stub browser environment for api.js
global.window = global;
global.location = { origin: 'http://127.0.0.1:8765' };
global.Config = {
  section: function () { return {}; }
};

const apiCode = fs.readFileSync(path.join(__dirname, '../web/js/api.js'), 'utf8');
eval(apiCode);

const Api = global.Api;
assert(Api, 'Api module must be exported');
assert(typeof Api._speechEndpointUrl === 'function', '_speechEndpointUrl must be a function');
assert(typeof Api._buildSpeechBody === 'function', '_buildSpeechBody must be a function');

console.log('Testing _speechEndpointUrl...');
assert.strictEqual(
  Api._speechEndpointUrl('https://api.inworld.ai/v1'),
  'https://api.inworld.ai/v1/audio/speech'
);
assert.strictEqual(
  Api._speechEndpointUrl('https://api.inworld.ai/v1/'),
  'https://api.inworld.ai/v1/audio/speech'
);
assert.strictEqual(
  Api._speechEndpointUrl('https://api.inworld.ai/v1/audio/speech'),
  'https://api.inworld.ai/v1/audio/speech'
);
assert.strictEqual(
  Api._speechEndpointUrl('https://openrouter.ai/api/v1'),
  'https://openrouter.ai/api/v1/audio/speech'
);
assert.strictEqual(
  Api._speechEndpointUrl('https://openrouter.ai/api/v1/audio/speech'),
  'https://openrouter.ai/api/v1/audio/speech'
);

console.log('Testing _buildSpeechBody preset mode (direct host)...');
const directPreset = Api._buildSpeechBody(
  'inworld-tts-2',
  'Hello world',
  { speechMode: 'preset', speechVoice: 'Dennis' },
  'warm tone',
  'https://api.inworld.ai/v1/audio/speech'
);
assert.strictEqual(directPreset.model, 'inworld-tts-2');
assert.strictEqual(directPreset.input, 'Hello world');
assert.strictEqual(directPreset.voice, 'Dennis');
assert.strictEqual(directPreset.response_format, 'mp3');
assert.strictEqual(directPreset.instructions, 'warm tone');
assert.strictEqual(directPreset.provider, undefined);

console.log('Testing _buildSpeechBody preset mode (OpenRouter)...');
const openrouterPreset = Api._buildSpeechBody(
  'openai/gpt-4o-mini-tts-2025-12-15',
  'Hello openrouter',
  { speechMode: 'preset', speechVoice: 'alloy' },
  'cheerful voice',
  'https://openrouter.ai/api/v1/audio/speech'
);
assert.strictEqual(openrouterPreset.model, 'openai/gpt-4o-mini-tts-2025-12-15');
assert.strictEqual(openrouterPreset.voice, 'alloy');
assert.strictEqual(openrouterPreset.response_format, 'mp3');
assert.strictEqual(openrouterPreset.instructions, undefined, 'OpenRouter must not have top-level instructions');
assert.deepStrictEqual(openrouterPreset.provider, {
  options: {
    openai: { instructions: 'cheerful voice' }
  }
});

console.log('Testing _buildSpeechBody azure model on OpenRouter...');
const openrouterAzure = Api._buildSpeechBody(
  'microsoft/mai-voice-2',
  'Hello azure',
  { speechMode: 'preset', speechVoice: 'en-US-Harper:MAI-Voice-2' },
  'calm style',
  'https://openrouter.ai/api/v1/audio/speech'
);
assert.deepStrictEqual(openrouterAzure.provider, {
  options: {
    azure: { instructions: 'calm style' }
  }
});

console.log('Testing _buildSpeechBody clone mode (OpenRouter)...');
const openrouterClone = Api._buildSpeechBody(
  'fish-audio/s2.1-pro',
  'Cloned speech',
  { speechMode: 'clone', speechVoice: 'b347db033a6549378b48d00acb0d06cd' },
  'whisper tone',
  'https://openrouter.ai/api/v1/audio/speech'
);
assert.strictEqual(openrouterClone.model, 'fish-audio/s2.1-pro');
assert.strictEqual(openrouterClone.voice, undefined, 'Clone mode must omit voice parameter');
assert.strictEqual(openrouterClone.response_format, 'mp3');
assert.deepStrictEqual(openrouterClone.provider, {
  options: {
    'fish-audio': { instructions: 'whisper tone' }
  }
});

console.log('All TTS regression checks passed!');

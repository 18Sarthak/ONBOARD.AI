/**
 * sharpMock.cjs — loaded via --require before the main server module.
 *
 * @xenova/transformers requires 'sharp' for image pre-processing.
 * Since ms2 only uses text feature-extraction (no image pipelines),
 * we intercept Node's require() to return a stub when 'sharp' is requested.
 *
 * The stub must handle:
 *   - import sharp from 'sharp'  → sharp is called as a function/constructor
 *   - sharp.versions, sharp.cache(), etc. — static property access
 */
const Module = require('module');
const originalLoad = Module._load;

// Create a callable stub that also works as a constructor
function SharpStub() {
  if (!(this instanceof SharpStub)) return new SharpStub();
  // chainable stub methods
  const methods = ['resize', 'png', 'jpeg', 'webp', 'toBuffer', 'toFile',
    'metadata', 'stats', 'raw', 'rotate', 'flip', 'flop', 'sharpen',
    'median', 'blur', 'flatten', 'gamma', 'negate', 'normalise', 'normalize',
    'clahe', 'convolve', 'threshold', 'boolean', 'linear', 'recomb', 'modulate',
    'tint', 'greyscale', 'grayscale', 'pipelinePipeline', 'toColorspace',
    'removeAlpha', 'ensureAlpha', 'extractChannel', 'joinChannel', 'bandbool',
    'extract', 'trim', 'extend', 'composite', 'tile', 'timeout', 'withMetadata',
    'keepExif', 'withExif', 'withExifMerge', 'keepIccProfile', 'withIccProfile',
    'clone', 'on', 'once', 'removeListener', 'pipe', 'toFormat'];
  const obj = {};
  methods.forEach(m => { obj[m] = () => obj; });
  obj.toBuffer = () => Promise.resolve(Buffer.alloc(0));
  obj.toFile = () => Promise.resolve({});
  obj.metadata = () => Promise.resolve({ width: 0, height: 0, format: 'png', channels: 3 });
  return obj;
}

// Static properties
SharpStub.versions = { vips: '0.0.0' };
SharpStub.cache = () => ({});
SharpStub.counters = () => ({});
SharpStub.concurrency = () => 1;
SharpStub.queue = { on: () => {} };
SharpStub.format = {};
SharpStub.interpolators = {};

Module._load = function (request, parent, isMain) {
  if (request === 'sharp') {
    return SharpStub;
  }
  return originalLoad.apply(this, arguments);
};

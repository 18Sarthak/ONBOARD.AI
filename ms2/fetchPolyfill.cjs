/**
 * fetchPolyfill.cjs — loaded via --require before any other module.
 *
 * In some network environments Node's built-in fetch (undici) cannot reach
 * external HTTPS endpoints even though Node's native `https` module works fine.
 * (undici uses a different TLS/socket path than http.request.)
 *
 * This replaces global.fetch with node-fetch@2, which uses Node's native
 * http/https module — allowing LangChain/Groq API calls to succeed.
 */
const nodeFetch = require('node-fetch');

// Polyfill global fetch with node-fetch (uses native https internally)
if (typeof global.fetch === 'undefined' || !global.fetch._isNodeFetchPolyfill) {
  global.fetch = nodeFetch.default || nodeFetch;
  global.Headers = nodeFetch.Headers;
  global.Request = nodeFetch.Request;
  global.Response = nodeFetch.Response;

  // Mark so we don't double-polyfill
  global.fetch._isNodeFetchPolyfill = true;
  // eslint-disable-next-line no-console
  console.log('[fetchPolyfill] global.fetch replaced with node-fetch (native https)');
}

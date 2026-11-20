const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const appRoot = path.resolve(__dirname, '../../../artifacts/vyde');

// Execute production modules with only their platform/network boundaries mocked.
// Each loader has an isolated module cache, so tests cannot share task/DB state.
function createLoader(stubs = {}, fetch = async () => { throw new Error('Unexpected network request'); }) {
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText;
    function requireMock(name) {
      if (Object.hasOwn(stubs, name)) return stubs[name];
      const base = name.startsWith('@/') ? path.join(appRoot, name.slice(2))
        : name.startsWith('.') ? path.resolve(path.dirname(filename), name) : null;
      if (!base) throw new Error(`Unmocked platform dependency: ${name}`);
      const resolved = ['.ts', '.tsx', '/index.ts'].map(ext => base + ext).find(fs.existsSync);
      if (!resolved) throw new Error(`Unresolved module: ${name}`);
      return load(resolved);
    }
    vm.runInNewContext(`(function(require, module, exports) { ${code}\n})`, {
      URL, URLSearchParams, fetch, setTimeout, clearTimeout,
      console: { warn() {}, log() {} }, process: { env: {} },
    }, { filename })(requireMock, module, module.exports);
    return module.exports;
  }
  return relative => load(path.resolve(appRoot, relative));
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

const settle = () => new Promise(resolve => setImmediate(resolve));
module.exports = { createLoader, deferred, settle };

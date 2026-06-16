// Stub for react-native-nitro-modules.
// @metamask/native-utils calls NitroModules.createHybridObject() at module load
// time.  The daemon never exercises the resulting hybrid object — it only needs
// the constant values that live alongside the native-utils import in
// @metamask/transaction-controller.  Returning a Proxy that silently absorbs
// every property access and function call keeps the module graph intact without
// pulling in real native code.
'use strict';

const noop = () => noopProxy;
const noopProxy = new Proxy(noop, {
  get(_target, prop) {
    if (prop === Symbol.toPrimitive) return () => '';
    if (prop === 'then') return undefined; // not thenable
    return noopProxy;
  },
  apply() {
    return noopProxy;
  },
});

const NitroModules = { createHybridObject: (_name) => noopProxy };

module.exports = { NitroModules };
module.exports.__esModule = true;
module.exports.default = module.exports;

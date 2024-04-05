import wasm from '@blockaid/ppom_release/ppom_bg.wasm';
import invoke from 'react-native-webview-invoke/browser';
import asyncInvoke from './invoke-lib.js';
import ppomInit, { PPOM } from './ppom';
// eslint-disable-next-line import/no-nodejs-modules
import { Buffer } from 'buffer';

(async () => {
  asyncInvoke(invoke);
  // eslint-disable-next-line no-console
  console.log = invoke.bind('console.log');
  console.error = invoke.bind('console.error');
  console.warn = invoke.bind('console.warn');

  function base64ToUint8Array(b64) {
    return Buffer.from(b64, 'base64');
  }

  function convertBase64ToFiles(base64Array) {
    return base64Array.map(([key, base64]) => [
      key,
      base64ToUint8Array(base64),
    ]);
  }

  let ppom;

  invoke.defineAsync('ppomInit', async () => {
    await ppomInit(base64ToUint8Array(wasm));
  });

  invoke.defineAsync('PPOM.new', async (files) => {
    const jsonRpc = invoke.bindAsync('PPOM.jsonRpc');
    files = convertBase64ToFiles(files);
    ppom = await PPOM.new((method, params) => jsonRpc(method, params), files);
  });

  invoke.define('PPOM.free', (...args) => {
    ppom.free(...args);
    ppom = undefined;
  });

  invoke.defineAsync('PPOM.test', async (...args) => await ppom.test(...args));

  invoke.defineAsync(
    'PPOM.validateJsonRpc',
    async (...args) => await ppom.validateJsonRpc(...args),
  );

  await invoke.bind('finishedLoading')();
})();

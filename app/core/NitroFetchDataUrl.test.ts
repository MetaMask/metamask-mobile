/**
 * Regression test for https://github.com/MetaMask/metamask-mobile/issues/38849
 *
 * `react-native-nitro-fetch` decodes `data:` URLs in JS and lazily loads
 * `react-native-nitro-text-decoder` the first time one is fetched. Upstream
 * loads it via an aliased `require` (`const dynamicRequire = require`), which
 * Metro does not collect as a dependency. In release bundles metro-runtime
 * then reports "Requiring unknown module" straight to
 * `ErrorUtils.reportFatalError` (bypassing the library's try/catch), crashing
 * the app on e.g. manual import of an NFT whose tokenURI is a `data:` URL.
 *
 * Jest does not use Metro, so this test runs the installed (patched) decoder
 * code through Metro's real dependency collection, module wrapping and
 * release (`__DEV__ = false`) require runtime. The collectDependencies /
 * wrapModule options mirror metro-transform-worker@0.84.5 (release build) and
 * the source slicing targets react-native-nitro-fetch@1.5.1: revisit this test
 * and the yarn patch when bumping either, and delete both once nitro-fetch
 * ships a static require upstream.
 */
/* eslint-disable import-x/no-nodejs-modules, import-x/no-extraneous-dependencies */
import fs from 'fs';
import path from 'path';
import { parseSync, transformFromAstSync } from '@babel/core';
import collectDependencies from 'metro/private/ModuleGraph/worker/collectDependencies';
import { wrapModule } from 'metro/private/ModuleGraph/worker/JsFileWrapping';
/* eslint-enable import-x/no-nodejs-modules, import-x/no-extraneous-dependencies */

const TEXT_DECODER_MODULE = 'react-native-nitro-text-decoder';

interface DataUrlResponse {
  status: number;
  bodyString?: string;
}

interface DataUrlModuleExports {
  decodeDataUrl: (url: string) => DataUrlResponse;
}

interface MetroGlobal {
  ErrorUtils: { reportFatalError: jest.Mock };
  __d?: (
    factory: unknown,
    moduleId: number,
    dependencyMap: number[],
    verboseName?: string,
  ) => void;
  __r?: (moduleId: number) => unknown;
}

/**
 * Extracts nitro-fetch's import-free `data:` URL helpers (base64ToBytes …
 * decodeDataUrl) from the installed, patched `lib/module/fetch.js` — the file
 * Metro resolves via the package `exports` default condition.
 */
const readDataUrlHelpers = (): string => {
  const source = fs.readFileSync(
    path.join(
      path.dirname(require.resolve('react-native-nitro-fetch/package.json')),
      'lib/module/fetch.js',
    ),
    'utf8',
  );
  const start = source.indexOf('function base64ToBytes(');
  const end = source.indexOf('async function fetchLocalResource(');
  if (start < 0 || end < 0) {
    throw new Error(
      'nitro-fetch data: URL helpers not found in lib/module/fetch.js. ' +
        'react-native-nitro-fetch was likely bumped: re-check the yarn patch ' +
        'for #38849 and update this test.',
    );
  }
  return `${source.slice(start, end)}\nexports.decodeDataUrl = decodeDataUrl;\n`;
};

/** Transforms a module the way metro-transform-worker does for a release (non-dev) bundle. */
const toReleaseMetroModule = (code: string) => {
  const ast = parseSync(code, {
    configFile: false,
    babelrc: false,
    sourceType: 'script',
  });
  if (!ast) throw new Error('parse failed');
  const collected = collectDependencies(ast, {
    asyncRequireModulePath: 'metro-runtime/src/modules/asyncRequire',
    dependencyMapName: null,
    dynamicRequires: 'throwAtRuntime',
    inlineableCalls: ['$$_IMPORT_DEFAULT', '$$_IMPORT_ALL'],
    keepRequireNames: false,
    allowOptionalDependencies: false,
    unstable_allowRequireContext: false,
  });
  const { ast: wrappedAst } = wrapModule(
    collected.ast,
    '$$_IMPORT_DEFAULT',
    '$$_IMPORT_ALL',
    collected.dependencyMapName,
    '',
    false,
  );
  const output = transformFromAstSync(wrappedAst, undefined, {
    configFile: false,
    babelrc: false,
    code: true,
  });
  return {
    code: output?.code ?? '',
    dependencyNames: collected.dependencies.map(({ name }) => name),
  };
};

/**
 * Loads `moduleCode` into a fresh release-mode metro-runtime (so nitro-fetch's
 * per-module `_decoder` cache starts empty) alongside a stub text decoder.
 */
const loadInReleaseMetroRuntime = (moduleCode: string) => {
  const runtimeSource = fs.readFileSync(
    require.resolve('metro-runtime/src/polyfills/require.js'),
    'utf8',
  );
  const reportFatalError = jest.fn();
  const metroGlobal: MetroGlobal = { ErrorUtils: { reportFatalError } };
  // eslint-disable-next-line no-new-func
  new Function('global', '__DEV__', '__METRO_GLOBAL_PREFIX__', runtimeSource)(
    metroGlobal,
    false,
    '',
  );

  const { code, dependencyNames } = toReleaseMetroModule(moduleCode);
  const define = metroGlobal.__d;
  const metroRequire = metroGlobal.__r;
  if (!define || !metroRequire) throw new Error('metro runtime not installed');

  // Module 1: stub nitro-text-decoder (the real one is a native HybridObject).
  define(
    (
      _global: unknown,
      _require: unknown,
      _importDefault: unknown,
      _importAll: unknown,
      _module: unknown,
      decoderExports: Record<string, unknown>,
    ) => {
      decoderExports.TextDecoder = globalThis.TextDecoder;
    },
    1,
    [],
  );
  // Module 0: nitro-fetch data: URL helpers, dependency map resolved by name.
  // eslint-disable-next-line no-new-func
  new Function('__d', code)((factory: unknown) =>
    define(
      factory,
      0,
      dependencyNames.map((name) => (name === TEXT_DECODER_MODULE ? 1 : -1)),
    ),
  );

  return {
    dataUrlModule: metroRequire(0) as DataUrlModuleExports,
    dependencyNames,
    reportFatalError,
  };
};

const NFT_METADATA = {
  name: 'Test Dapp NFTs #1',
  image: 'data:image/svg+xml;base64,PHN2Zz4=',
};
const NFT_TOKEN_URI = `data:application/json;base64,${Buffer.from(
  JSON.stringify(NFT_METADATA),
).toString('base64')}`;

describe('react-native-nitro-fetch data: URL decoding in a release Metro bundle', () => {
  it('bundles nitro-text-decoder and decodes a data: URL without reporting a fatal error', () => {
    const { dataUrlModule, dependencyNames, reportFatalError } =
      loadInReleaseMetroRuntime(readDataUrlHelpers());

    const response = dataUrlModule.decodeDataUrl(NFT_TOKEN_URI);

    expect(dependencyNames).toContain(TEXT_DECODER_MODULE);
    expect(reportFatalError).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(JSON.parse(response.bodyString ?? '')).toEqual(NFT_METADATA);
  });

  it('reports a fatal error for the unpatched aliased require (guards the harness)', () => {
    const patched = readDataUrlHelpers();
    const unpatched = patched.replace(
      `require('${TEXT_DECODER_MODULE}')`,
      `(() => { const dynamicRequire = require; return dynamicRequire('${TEXT_DECODER_MODULE}'); })()`,
    );
    expect(unpatched).not.toBe(patched);
    const { dataUrlModule, dependencyNames, reportFatalError } =
      loadInReleaseMetroRuntime(unpatched);

    dataUrlModule.decodeDataUrl(NFT_TOKEN_URI);

    expect(dependencyNames).not.toContain(TEXT_DECODER_MODULE);
    expect(reportFatalError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          `Requiring unknown module "${TEXT_DECODER_MODULE}"`,
        ),
      }),
    );
  });
});

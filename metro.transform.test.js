/* eslint-disable import-x/no-commonjs, import-x/no-nodejs-modules */
const fs = require('node:fs');
const path = require('node:path');
const { removeFencedCode } = require('@metamask/build-utils');

jest.mock('@expo/metro-config/babel-transformer', () => ({
  transform: jest.fn(),
}));
jest.mock('react-native-svg-transformer/expo', () => ({
  transform: jest.fn(),
}));

const {
  availableFeatures,
  getBuildTypeFeatures,
} = require('./metro.transform');

const ROOT_PATH = path.join(__dirname, 'app/components/Views/Root/index.tsx');
const SIGNER_PAGE_PATH = path.join(
  __dirname,
  'app/components/UI/Perps/Lighter/wasm-wrapper.standalone.html',
);

describe('Lighter signer code fencing', () => {
  function transformRoot(enabled) {
    const source = fs.readFileSync(ROOT_PATH, 'utf8');

    return removeFencedCode(ROOT_PATH, source, {
      all: availableFeatures,
      active: getBuildTypeFeatures({
        METAMASK_BUILD_TYPE: 'main',
        METAMASK_ENVIRONMENT: 'production',
        MM_PERPS_LIGHTER_PROVIDER_ENABLED: String(enabled),
      }),
    })[0];
  }

  it('removes the signer dependency when Lighter is disabled', () => {
    const transformed = transformRoot(false);

    expect(transformed).not.toContain('LighterSignerWebView');
    expect(transformed).not.toContain('wasm-wrapper.standalone.html');
    expect(fs.statSync(SIGNER_PAGE_PATH).size).toBeGreaterThan(9_000_000);
  });

  it('retains the signer dependency when Lighter is enabled', () => {
    const transformed = transformRoot(true);

    expect(transformed).toContain('LighterSignerWebView');
  });
});

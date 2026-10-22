import fs from 'node:fs';
import path from 'node:path';
import metroTransformer from '../metro.transform';

jest.mock('@expo/metro-config/babel-transformer', () => ({
  transform: jest.fn((input: { src: string }) => input),
}));
jest.mock('react-native-svg-transformer/expo', () => ({
  transform: jest.fn(),
}));

const { getBuildTypeFeatures } = metroTransformer;

describe('Lighter signer code fencing', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Exercise the real fence removal on Root: a disabled render alone still
  // leaves its static import and the 10 MB signer in Metro's dependency graph.
  it.each([
    ['production', undefined, false],
    ['production', 'false', false],
    ['dev', undefined, false],
    ['dev', 'false', false],
    ['production', 'true', true],
    ['dev', 'true', true],
  ])(
    'includes the Root signer import=%s/%s only when enabled=%s',
    async (environment, flag, enabled) => {
      jest.replaceProperty(process, 'env', {
        ...process.env,
        METAMASK_ENVIRONMENT: environment,
        MM_PERPS_LIGHTER_PROVIDER_ENABLED: flag,
        CODE_FENCING_FEATURES: '["snaps","keyring-snaps","multi-srp","solana","bitcoin","tron"]',
        SKIP_TRANSFORM_LINT: 'true',
      });
      const filename = path.resolve(
        __dirname,
        '../app/components/Views/Root/index.tsx',
      );

      const result = await metroTransformer.transform({
        src: fs.readFileSync(filename, 'utf8'),
        filename,
        options: {},
      });

      expect(result.src.includes('LighterSignerWebView')).toBe(enabled);
      expect(result.src.includes('isLighterProviderEnabled')).toBe(enabled);
    },
  );

  it('excludes the Lighter fence from production without an override', () => {
    const features = getBuildTypeFeatures({
      NODE_ENV: 'test',
      METAMASK_BUILD_TYPE: 'main',
      METAMASK_ENVIRONMENT: 'production',
    });

    expect(features).not.toContain('lighter');
  });

  it('excludes the Lighter fence in development without an opt-in', () => {
    const features = getBuildTypeFeatures({
      NODE_ENV: 'test',
      METAMASK_BUILD_TYPE: 'main',
      METAMASK_ENVIRONMENT: 'dev',
      MM_PERPS_LIGHTER_PROVIDER_ENABLED: 'false',
    });

    expect(features).not.toContain('lighter');
  });

  it('includes the Lighter fence for an explicit production override', () => {
    const features = getBuildTypeFeatures({
      NODE_ENV: 'test',
      METAMASK_BUILD_TYPE: 'main',
      METAMASK_ENVIRONMENT: 'production',
      MM_PERPS_LIGHTER_PROVIDER_ENABLED: 'true',
    });

    expect(features).toContain('lighter');
  });
});

import metroTransformer from './metro.transform';

jest.mock('@expo/metro-config/babel-transformer', () => ({
  transform: jest.fn(),
}));
jest.mock('react-native-svg-transformer/expo', () => ({
  transform: jest.fn(),
}));

const { getBuildTypeFeatures } = metroTransformer;

describe('Lighter signer code fencing', () => {
  it('excludes the Lighter fence from production without an override', () => {
    const features = getBuildTypeFeatures({
      METAMASK_BUILD_TYPE: 'main',
      METAMASK_ENVIRONMENT: 'production',
    });

    expect(features).not.toContain('lighter');
  });

  it('includes the Lighter fence by default in development', () => {
    const features = getBuildTypeFeatures({
      METAMASK_BUILD_TYPE: 'main',
      METAMASK_ENVIRONMENT: 'dev',
    });

    expect(features).toContain('lighter');
  });

  it('includes the Lighter fence for an explicit production override', () => {
    const features = getBuildTypeFeatures({
      METAMASK_BUILD_TYPE: 'main',
      METAMASK_ENVIRONMENT: 'production',
      MM_PERPS_LIGHTER_PROVIDER_ENABLED: 'true',
    });

    expect(features).toContain('lighter');
  });
});

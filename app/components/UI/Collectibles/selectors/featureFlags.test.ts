import type { FeatureFlags } from '@metamask/remote-feature-flag-controller';
import { isCollectiblesBuildEnabled } from '../../../../constants/featureFlags';
import { selectCollectiblesEnabled } from './featureFlags';

jest.mock('../../../../constants/featureFlags', () => ({
  ...jest.requireActual('../../../../constants/featureFlags'),
  isCollectiblesBuildEnabled: jest.fn(() => false),
}));

jest.mock('react-native-device-info', () => ({
  getVersion: () => '8.23.0',
}));

jest.mock(
  '#app/core/Engine/controllers/remote-feature-flag-controller',
  () => ({
    __esModule: true,
    isRemoteFeatureFlagOverrideActivated: false,
  }),
);

describe('selectCollectiblesEnabled', () => {
  it.each([
    [
      'enabled and version met',
      { collectiblesEnabled: { enabled: true, minimumVersion: '8.0.0' } },
      true,
    ],
    [
      'disabled',
      { collectiblesEnabled: { enabled: false, minimumVersion: '8.0.0' } },
      false,
    ],
    [
      'version not met',
      { collectiblesEnabled: { enabled: true, minimumVersion: '999.0.0' } },
      false,
    ],
    ['missing', {}, false],
    ['invalid', { collectiblesEnabled: 'invalid' }, false],
  ])('returns %s', (_case, remoteFlags, expected) => {
    expect(selectCollectiblesEnabled.resultFunc(remoteFlags)).toBe(expected);
  });
});

describe('Collectibles local development fallback', () => {
  const devGlobal = globalThis as typeof globalThis &
    Record<'__DEV__', boolean>;
  const originalDev = devGlobal.__DEV__;
  afterEach(() => {
    devGlobal.__DEV__ = originalDev;
    jest.mocked(isCollectiblesBuildEnabled).mockReturnValue(false);
  });

  it.each<[string, boolean, FeatureFlags, boolean]>([
    ['enables a dev build when the remote flag is absent', true, {}, true],
    [
      'enables a dev build when the remote flag is malformed',
      true,
      { collectiblesEnabled: 'invalid' },
      true,
    ],
    [
      'honors a remote kill switch in dev',
      true,
      { collectiblesEnabled: { enabled: false, minimumVersion: '8.0.0' } },
      false,
    ],
    [
      'honors the minimum version in dev',
      true,
      { collectiblesEnabled: { enabled: true, minimumVersion: '99.0.0' } },
      false,
    ],
    ['ignores the local flag in release builds', false, {}, false],
  ])('%s', (_case, dev, remoteFlags, expected) => {
    devGlobal.__DEV__ = dev;
    jest.mocked(isCollectiblesBuildEnabled).mockReturnValue(true);
    expect(selectCollectiblesEnabled.resultFunc(remoteFlags)).toBe(expected);
  });

  it('uses the local flag in dev when remote flags are explicitly overridden', () => {
    const controller = jest.requireMock<{
      isRemoteFeatureFlagOverrideActivated: boolean;
    }>('#app/core/Engine/controllers/remote-feature-flag-controller');
    const override = jest.replaceProperty(
      controller,
      'isRemoteFeatureFlagOverrideActivated',
      true,
    );
    try {
      devGlobal.__DEV__ = true;
      jest.mocked(isCollectiblesBuildEnabled).mockReturnValue(true);
      expect(
        selectCollectiblesEnabled.resultFunc({
          collectiblesEnabled: { enabled: false, minimumVersion: '8.0.0' },
        }),
      ).toBe(true);
    } finally {
      override.restore();
    }
  });
});

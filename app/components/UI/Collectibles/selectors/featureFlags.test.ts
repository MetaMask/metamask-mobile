import { selectCollectiblesEnabled } from './featureFlags';

jest.mock('react-native-device-info', () => ({
  getVersion: () => '8.23.0',
}));

jest.mock(
  '#app/core/Engine/controllers/remote-feature-flag-controller',
  () => ({
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

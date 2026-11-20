import { selectCollectiblesEnabled } from './featureFlags';

jest.mock('react-native-device-info', () => ({
  getVersion: () => '8.23.0',
}));

describe('selectCollectiblesEnabled', () => {
  it.each([
    [
      'enabled and version met',
      { enabled: true, minimumVersion: '8.0.0' },
      true,
    ],
    ['disabled', { enabled: false, minimumVersion: '8.0.0' }, false],
    ['version not met', { enabled: true, minimumVersion: '999.0.0' }, false],
    ['invalid', 'invalid', false],
  ])('returns %s', (_case, collectiblesEnabled, expected) => {
    const remoteFlags = collectiblesEnabled ? { collectiblesEnabled } : {};

    expect(selectCollectiblesEnabled.resultFunc(remoteFlags)).toBe(expected);
  });
});

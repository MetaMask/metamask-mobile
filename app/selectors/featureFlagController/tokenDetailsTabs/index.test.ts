import {
  selectTokenDetailsTabsEnabled,
  TOKEN_DETAILS_TABS_FLAG_KEY,
  TOKEN_DETAILS_TABS_MOCK_ENABLED,
} from '.';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('7.73.0'),
}));

jest.mock(
  '../../../core/Engine/controllers/remote-feature-flag-controller',
  () => ({
    isRemoteFeatureFlagOverrideActivated: false,
  }),
);

describe('selectTokenDetailsTabsEnabled', () => {
  it('exposes the LD flag key', () => {
    expect(TOKEN_DETAILS_TABS_FLAG_KEY).toBe('tokenDetailsTabs');
  });

  it('is force-enabled while the remote flag is mocked', () => {
    expect(TOKEN_DETAILS_TABS_MOCK_ENABLED).toBe(true);
    expect(selectTokenDetailsTabsEnabled.resultFunc({})).toBe(true);
  });

  it('returns true when the remote flag is enabled', () => {
    const result = selectTokenDetailsTabsEnabled.resultFunc({
      [TOKEN_DETAILS_TABS_FLAG_KEY]: {
        value: { enabled: true, minimumVersion: '7.73' },
      },
    });

    expect(result).toBe(true);
  });
});

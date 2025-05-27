import generateUserProfileAnalyticsMetaData from './generateUserProfileAnalyticsMetaData';
import { UserProfileProperty } from './UserProfileAnalyticsMetaData.types';
import {Appearance} from 'react-native';

const mockGetState = jest.fn();
jest.mock('../../../store', () => ({
    store: {
      getState: jest.fn(() => mockGetState()),
    },
  }));

const mockIsMetricsEnabled = jest.fn();
jest.mock('../../../core/Analytics', () => ({
  MetaMetrics: {
    getInstance: jest.fn(() => ({ isEnabled: mockIsMetricsEnabled })),
  },
}));

jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('dark');

describe('generateUserProfileAnalyticsMetaData', () => {
  const mockState = {
    engine: {
      backgroundState: {
        PreferencesController: {
          displayNftMedia: true,
          useNftDetection: false,
          useTokenDetection: true,
          isMultiAccountBalancesEnabled: false,
          securityAlertsEnabled: true,
        },
      },
    },
    user: { appTheme: 'os' },
    security: { dataCollectionForMarketing: true },
  };

  it('returns metadata', () => {
    mockGetState.mockReturnValue(mockState);
    mockIsMetricsEnabled.mockReturnValue(true);

    const metadata = generateUserProfileAnalyticsMetaData();
    expect(metadata).toEqual({
      [UserProfileProperty.ENABLE_OPENSEA_API]: UserProfileProperty.ON,
      [UserProfileProperty.NFT_AUTODETECTION]: UserProfileProperty.OFF,
      [UserProfileProperty.THEME]: 'dark',
      [UserProfileProperty.TOKEN_DETECTION]: UserProfileProperty.ON,
      [UserProfileProperty.MULTI_ACCOUNT_BALANCE]: UserProfileProperty.OFF,
      [UserProfileProperty.SECURITY_PROVIDERS]: 'blockaid',
      [UserProfileProperty.HAS_MARKETING_CONSENT]: UserProfileProperty.ON,
    });
  });

  it.each([
    [UserProfileProperty.ON, true],
    [UserProfileProperty.OFF, false],
  ])('returns marketing consent "%s"', (expected, stateConsentValue) => {
    mockGetState.mockReturnValue({ ...mockState, security: { dataCollectionForMarketing: stateConsentValue } });

    const metadata = generateUserProfileAnalyticsMetaData();
    expect(metadata[UserProfileProperty.HAS_MARKETING_CONSENT]).toEqual(expected);
  });

  it('returns default metadata when missing preferences controller', () => {
    mockGetState.mockReturnValue({ ...mockState, engine: {} });

    const metadata = generateUserProfileAnalyticsMetaData();
    expect(metadata).toMatchObject({
      [UserProfileProperty.ENABLE_OPENSEA_API]: UserProfileProperty.OFF,
      [UserProfileProperty.NFT_AUTODETECTION]: UserProfileProperty.OFF,
      [UserProfileProperty.TOKEN_DETECTION]: UserProfileProperty.OFF,
      [UserProfileProperty.MULTI_ACCOUNT_BALANCE]: UserProfileProperty.OFF,
      [UserProfileProperty.SECURITY_PROVIDERS]: '',
    });
  });

  it('returns user preference for theme', () => {
    mockGetState.mockReturnValue({ ...mockState, user: { appTheme: 'light' } });

    const metadata = generateUserProfileAnalyticsMetaData();
    expect(metadata[UserProfileProperty.THEME]).toBe('light');
  });
});

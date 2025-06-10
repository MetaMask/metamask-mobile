import generateUserProfileAnalyticsMetaData from './generateUserProfileAnalyticsMetaData';
import { UserProfileProperty } from './UserProfileAnalyticsMetaData.types';
import { Appearance } from 'react-native';
import ExtendedKeyringTypes from '../../../constants/keyringTypes';

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

const mockSelectNetworkConfigurations = jest.fn();
jest.mock('../../../selectors/networkController', () => ({
  selectNetworkConfigurations: jest.fn(() => mockSelectNetworkConfigurations()),
}));

describe('generateUserProfileAnalyticsMetaData', () => {
  beforeEach(() => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('dark');

    mockSelectNetworkConfigurations.mockReturnValue({
      '0x1': {
        chainId: '0x1',
        name: 'Ethereum Mainnet',
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

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
        KeyringController: {
          keyrings: [
            {
              type: ExtendedKeyringTypes.hd,
              accounts: ['0x1', '0x2'],
              metadata: {
                id: '01JPM6NFVGW8V8KKN34053JVFT',
                name: '',
              },
            },
          ],
        },
      },
    },
    user: { appTheme: 'os' },
    security: { dataCollectionForMarketing: true },
  };

  describe('NUMBER_OF_HD_ENTROPIES', () => {
    const testCases = [
      {
        name: 'with empty keyrings array',
        state: {
          engine: {
            backgroundState: {
              KeyringController: {
                keyrings: [],
              },
            },
          },
        },
        expected: 0,
      },
      {
        name: 'with one HD keyring',
        state: {
          engine: {
            backgroundState: {
              KeyringController: {
                keyrings: [
                  {
                    type: ExtendedKeyringTypes.hd,
                    accounts: ['0x123'],
                    metadata: {
                      id: '01JPM7NFVHW8V9KKN34053JVFU',
                      name: '',
                    },
                  },
                ],
              },
            },
          },
        },
        expected: 1,
      },
      {
        name: 'with two HD keyrings',
        state: {
          engine: {
            backgroundState: {
              KeyringController: {
                keyrings: [
                  {
                    type: ExtendedKeyringTypes.hd,
                    accounts: ['0x123'],
                    metadata: {
                      id: '01JPM7NFVHW8V9KKN34053JVFU',
                      name: '',
                    },
                  },
                  {
                    type: ExtendedKeyringTypes.hd,
                    accounts: ['0x456'],
                    metadata: {
                      id: '01JPM8NFVHW8V9KKN34055JVFV',
                      name: '',
                    },
                  },
                ],
              },
            },
          },
        },
        expected: 2,
      },
      {
        name: 'with mixed keyring types',
        state: {
          engine: {
            backgroundState: {
              KeyringController: {
                keyrings: [
                  {
                    type: ExtendedKeyringTypes.hd,
                    accounts: ['0x123'],
                    metadata: {
                      id: '01JPM7NFVHW8V9KKN34053JVFU',
                      name: '',
                    },
                  },
                  {
                    type: ExtendedKeyringTypes.simple,
                    accounts: ['0x456'],
                    metadata: {
                      id: '01JPM8NFVHW8V9KKN34055JVFV',
                      name: '',
                    },
                  },
                  {
                    type: ExtendedKeyringTypes.qr,
                    accounts: ['0x789'],
                    metadata: {
                      id: '01JPM9NFVHW8V9KKN34056JVFW',
                      name: '',
                    },
                  },
                  {
                    type: ExtendedKeyringTypes.hd,
                    accounts: ['0xabc'],
                    metadata: {
                      id: '01JPM10NFVHW8V9KKN34057JVFX',
                      name: '',
                    },
                  },
                ],
              },
            },
          },
        },
        expected: 2,
      },
    ];

    testCases.forEach(({ name, state, expected }) => {
      it(name, () => {
        mockGetState.mockReturnValue({
          ...mockState,
          ...state,
        });

        const metadata = generateUserProfileAnalyticsMetaData();
        expect(metadata[UserProfileProperty.NUMBER_OF_HD_ENTROPIES]).toBe(
          expected,
        );
      });
    });
  });

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
      [UserProfileProperty.NUMBER_OF_HD_ENTROPIES]: 1,
      [UserProfileProperty.CHAIN_IDS]: ['eip155:1'],
    });
  });

  it.each([
    [UserProfileProperty.ON, true],
    [UserProfileProperty.OFF, false],
  ])('returns marketing consent "%s"', (expected, stateConsentValue) => {
    mockGetState.mockReturnValue({
      ...mockState,
      security: { dataCollectionForMarketing: stateConsentValue },
    });

    const metadata = generateUserProfileAnalyticsMetaData();
    expect(metadata[UserProfileProperty.HAS_MARKETING_CONSENT]).toEqual(
      expected,
    );
  });

  it('returns default metadata when missing preferences controller', () => {
    mockGetState.mockReturnValue({
      ...mockState,
      engine: {
        backgroundState: {
          KeyringController: {
            keyrings: [],
          },
        },
      },
    });

    const metadata = generateUserProfileAnalyticsMetaData();
    expect(metadata).toMatchObject({
      [UserProfileProperty.ENABLE_OPENSEA_API]: UserProfileProperty.OFF,
      [UserProfileProperty.NFT_AUTODETECTION]: UserProfileProperty.OFF,
      [UserProfileProperty.TOKEN_DETECTION]: UserProfileProperty.OFF,
      [UserProfileProperty.MULTI_ACCOUNT_BALANCE]: UserProfileProperty.OFF,
      [UserProfileProperty.SECURITY_PROVIDERS]: '',
      [UserProfileProperty.NUMBER_OF_HD_ENTROPIES]: 0,
      [UserProfileProperty.CHAIN_IDS]: ['eip155:1'],
    });
  });

  it('returns user preference for theme', () => {
    mockGetState.mockReturnValue({ ...mockState, user: { appTheme: 'light' } });

    const metadata = generateUserProfileAnalyticsMetaData();
    expect(metadata[UserProfileProperty.THEME]).toBe('light');
  });
});

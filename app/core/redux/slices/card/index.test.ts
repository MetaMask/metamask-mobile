import { RootState } from '../../../../reducers';
import cardReducer, {
  CardSliceState,
  selectCardholderAccounts,
  selectIsCardholder,
  selectCardPriorityToken,
  selectCardPriorityTokenLastFetched,
  selectIsCardCacheValid,
  loadCardholderAccounts,
  resetCardState,
  setCardPriorityToken,
  setCardPriorityTokenLastFetched,
  initialState,
  setHasViewedCardButton,
  selectHasViewedCardButton,
  selectCardGeoLocation,
  selectDisplayCardButton,
  selectAlwaysShowCardButton,
  setAlwaysShowCardButton,
  selectIsAuthenticatedCard,
  selectUserCardLocation,
  setIsAuthenticatedCard,
  setUserCardLocation,
  setAuthenticatedPriorityToken,
  setAuthenticatedPriorityTokenLastFetched,
  verifyCardAuthentication,
  setOnboardingId,
  setSelectedCountry,
  setContactVerificationId,
  setConsentSetId,
  resetOnboardingState,
  setCacheData,
  clearCacheData,
  clearAllCache,
  selectOnboardingId,
  selectSelectedCountry,
  selectContactVerificationId,
  selectConsentSetId,
  resetAuthenticatedData,
} from '.';
import {
  CardTokenAllowance,
  AllowanceState,
} from '../../../../components/UI/Card/types';
import { Region } from '../../../../components/UI/Card/components/Onboarding/RegionSelectorModal';

// Mock the multichain selectors
jest.mock('../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: jest.fn(),
}));

// Mock the multichain utils
jest.mock('../../../Multichain/utils', () => ({
  isEthAccount: jest.fn(),
}));

// Mock feature flag selectors
jest.mock('../../../../selectors/featureFlagController/card', () => ({
  selectCardExperimentalSwitch: jest.fn(),
  selectCardSupportedCountries: jest.fn(),
  selectDisplayCardButtonFeatureFlag: jest.fn(),
}));

// Mock handleLocalAuthentication
jest.mock(
  '../../../../components/UI/Card/util/handleLocalAuthentication',
  () => ({
    handleLocalAuthentication: jest.fn(),
  }),
);

import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { isEthAccount } from '../../../Multichain/utils';
import {
  selectCardExperimentalSwitch,
  selectCardSupportedCountries,
  selectDisplayCardButtonFeatureFlag,
} from '../../../../selectors/featureFlagController/card';

const mockSelectSelectedInternalAccountByScope =
  selectSelectedInternalAccountByScope as jest.MockedFunction<
    typeof selectSelectedInternalAccountByScope
  >;

const mockIsEthAccount = isEthAccount as jest.MockedFunction<
  typeof isEthAccount
>;

const mockSelectCardExperimentalSwitch =
  selectCardExperimentalSwitch as jest.MockedFunction<
    typeof selectCardExperimentalSwitch
  >;

const mockSelectCardSupportedCountries =
  selectCardSupportedCountries as jest.MockedFunction<
    typeof selectCardSupportedCountries
  >;

const mockSelectDisplayCardButtonFeatureFlag =
  selectDisplayCardButtonFeatureFlag as jest.MockedFunction<
    typeof selectDisplayCardButtonFeatureFlag
  >;

const CARDHOLDER_ACCOUNTS_MOCK: string[] = [
  '0x1234567890123456789012345678901234567890',
  '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
];

const MOCK_PRIORITY_TOKEN: CardTokenAllowance = {
  address: '0xToken1',
  caipChainId: 'eip155:1' as const,
  decimals: 18,
  symbol: 'USDC',
  name: 'USD Coin',
  allowanceState: AllowanceState.Enabled,
  allowance: '5000000000000',
};

const testAddress = '0x1234567890123456789012345678901234567890';

// Mock Region objects for testing
const MOCK_REGION_US: Region = {
  key: 'US',
  name: 'United States',
  emoji: '🇺🇸',
};
const MOCK_REGION_GB: Region = {
  key: 'GB',
  name: 'United Kingdom',
  emoji: '🇬🇧',
};
const MOCK_REGION_CA: Region = { key: 'CA', name: 'Canada', emoji: '🇨🇦' };
const MOCK_REGION_DE: Region = { key: 'DE', name: 'Germany', emoji: '🇩🇪' };
const MOCK_REGION_FR: Region = { key: 'FR', name: 'France', emoji: '🇫🇷' };
const MOCK_REGION_JP: Region = { key: 'JP', name: 'Japan', emoji: '🇯🇵' };

const CARD_STATE_MOCK: CardSliceState = {
  cardholderAccounts: CARDHOLDER_ACCOUNTS_MOCK,
  isDaimoDemo: false,
  priorityTokensByAddress: {
    [testAddress.toLowerCase()]: MOCK_PRIORITY_TOKEN,
  },
  lastFetchedByAddress: {
    [testAddress.toLowerCase()]: new Date('2025-08-21T10:00:00Z'),
  },
  authenticatedPriorityToken: MOCK_PRIORITY_TOKEN,
  authenticatedPriorityTokenLastFetched: new Date('2025-08-21T10:00:00Z'),
  isLoaded: true,
  hasViewedCardButton: true,
  alwaysShowCardButton: false,
  geoLocation: 'US',
  isAuthenticated: false,
  userCardLocation: 'international',
  onboarding: {
    onboardingId: null,
    selectedCountry: null,
    contactVerificationId: null,
    consentSetId: null,
  },
  cache: {
    data: {},
    timestamps: {},
  },
};

const EMPTY_CARD_STATE_MOCK: CardSliceState = {
  cardholderAccounts: [],
  isDaimoDemo: false,
  priorityTokensByAddress: {},
  lastFetchedByAddress: {},
  authenticatedPriorityToken: null,
  authenticatedPriorityTokenLastFetched: null,
  isLoaded: false,
  hasViewedCardButton: false,
  alwaysShowCardButton: false,
  geoLocation: 'UNKNOWN',
  isAuthenticated: false,
  userCardLocation: 'international',
  onboarding: {
    onboardingId: null,
    selectedCountry: null,
    contactVerificationId: null,
    consentSetId: null,
  },
  cache: {
    data: {},
    timestamps: {},
  },
};

// Mock account object that matches the expected structure
const createMockAccount = (address: string) => ({
  address: address.toLowerCase(),
  id: `mock-id-${address}`,
  metadata: {
    name: 'Mock Account',
    importTime: Date.now(),
    keyring: {
      type: 'HD Key Tree',
    },
  },
  options: {},
  methods: [],
  type: 'eip155:eoa' as const,
  scopes: ['eip155:59144' as const],
});

describe('Card Selectors', () => {
  describe('selectCardholderAccounts', () => {
    it('returns the cardholder accounts array from the card state', () => {
      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      expect(selectCardholderAccounts(mockRootState)).toEqual(
        CARDHOLDER_ACCOUNTS_MOCK,
      );
    });

    it('returns an empty array when no cardholder accounts exist', () => {
      const mockRootState = {
        card: EMPTY_CARD_STATE_MOCK,
      } as unknown as RootState;

      expect(selectCardholderAccounts(mockRootState)).toEqual([]);
    });
  });

  describe('selectHasViewedCardButton', () => {
    it('returns false by default from initial state', () => {
      const mockRootState = { card: initialState } as unknown as RootState;
      expect(selectHasViewedCardButton(mockRootState)).toBe(false);
    });

    it('returns true when hasViewedCardButton is true', () => {
      const stateWithFlag: CardSliceState = {
        ...initialState,
        hasViewedCardButton: true,
      };
      const mockRootState = { card: stateWithFlag } as unknown as RootState;
      expect(selectHasViewedCardButton(mockRootState)).toBe(true);
    });
  });

  describe('selectCardGeoLocation', () => {
    it('returns UNKNOWN by default from initial state', () => {
      const mockRootState = { card: initialState } as unknown as RootState;
      expect(selectCardGeoLocation(mockRootState)).toBe('UNKNOWN');
    });

    it('returns the geolocation from the card state', () => {
      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;
      expect(selectCardGeoLocation(mockRootState)).toBe('US');
    });

    it('returns different geolocation values correctly', () => {
      const geoLocations = ['US', 'GB', 'CA', 'DE', 'FR', 'UNKNOWN'];

      geoLocations.forEach((geoLocation) => {
        const stateWithGeoLocation: CardSliceState = {
          ...initialState,
          geoLocation,
        };
        const mockRootState = {
          card: stateWithGeoLocation,
        } as unknown as RootState;
        expect(selectCardGeoLocation(mockRootState)).toBe(geoLocation);
      });
    });
  });

  describe('selectIsCardholder', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns true when selected account is in cardholder accounts', () => {
      const selectedAccount = createMockAccount(CARDHOLDER_ACCOUNTS_MOCK[0]);

      // Mock the selector to return a function that returns the account
      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        () => selectedAccount,
      );
      mockIsEthAccount.mockReturnValue(true);

      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      expect(selectIsCardholder(mockRootState)).toBe(true);
    });

    it('returns false when selected account is not in cardholder accounts', () => {
      const selectedAccount = createMockAccount(
        '0x9999999999999999999999999999999999999999',
      );

      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        () => selectedAccount,
      );
      mockIsEthAccount.mockReturnValue(true);

      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      expect(selectIsCardholder(mockRootState)).toBe(false);
    });

    it('returns false when no account is selected', () => {
      mockSelectSelectedInternalAccountByScope.mockReturnValue(() => undefined);
      mockIsEthAccount.mockReturnValue(false);

      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      expect(selectIsCardholder(mockRootState)).toBe(false);
    });

    it('returns false when selected account is not an ETH account', () => {
      const selectedAccount = createMockAccount(CARDHOLDER_ACCOUNTS_MOCK[0]);

      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        () => selectedAccount,
      );
      mockIsEthAccount.mockReturnValue(false);

      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      expect(selectIsCardholder(mockRootState)).toBe(false);
    });

    it('returns false when no cardholder accounts exist', () => {
      const selectedAccount = createMockAccount(
        '0x1234567890123456789012345678901234567890',
      );

      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        () => selectedAccount,
      );
      mockIsEthAccount.mockReturnValue(true);

      const mockRootState = {
        card: EMPTY_CARD_STATE_MOCK,
      } as unknown as RootState;

      expect(selectIsCardholder(mockRootState)).toBe(false);
    });
  });

  describe('Onboarding Selectors', () => {
    describe('selectOnboardingId', () => {
      it('should return null by default from initial state', () => {
        const mockRootState = { card: initialState } as unknown as RootState;
        expect(selectOnboardingId(mockRootState)).toBe(null);
      });

      it('should return the onboarding ID when set', () => {
        const onboardingId = 'test-onboarding-123';
        const stateWithOnboardingId: CardSliceState = {
          ...initialState,
          onboarding: {
            ...initialState.onboarding,
            onboardingId,
          },
        };
        const mockRootState = {
          card: stateWithOnboardingId,
        } as unknown as RootState;
        expect(selectOnboardingId(mockRootState)).toBe(onboardingId);
      });
    });

    describe('selectSelectedCountry', () => {
      it('should return null by default from initial state', () => {
        const mockRootState = { card: initialState } as unknown as RootState;
        expect(selectSelectedCountry(mockRootState)).toBe(null);
      });

      it('should return the selected country when set', () => {
        const selectedCountry = MOCK_REGION_US;
        const stateWithCountry: CardSliceState = {
          ...initialState,
          onboarding: {
            ...initialState.onboarding,
            selectedCountry,
          },
        };
        const mockRootState = {
          card: stateWithCountry,
        } as unknown as RootState;
        expect(selectSelectedCountry(mockRootState)).toBe(selectedCountry);
      });

      it('should handle different country codes', () => {
        const regions: Region[] = [
          MOCK_REGION_US,
          MOCK_REGION_GB,
          MOCK_REGION_CA,
          MOCK_REGION_DE,
          MOCK_REGION_FR,
          MOCK_REGION_JP,
        ];

        regions.forEach((region) => {
          const stateWithCountry: CardSliceState = {
            ...initialState,
            onboarding: {
              ...initialState.onboarding,
              selectedCountry: region,
            },
          };
          const mockRootState = {
            card: stateWithCountry,
          } as unknown as RootState;
          expect(selectSelectedCountry(mockRootState)).toBe(region);
        });
      });
    });

    describe('selectContactVerificationId', () => {
      it('should return null by default from initial state', () => {
        const mockRootState = { card: initialState } as unknown as RootState;
        expect(selectContactVerificationId(mockRootState)).toBe(null);
      });

      it('should return the contact verification ID when set', () => {
        const contactVerificationId = 'verification-456';
        const stateWithVerificationId: CardSliceState = {
          ...initialState,
          onboarding: {
            ...initialState.onboarding,
            contactVerificationId,
          },
        };
        const mockRootState = {
          card: stateWithVerificationId,
        } as unknown as RootState;
        expect(selectContactVerificationId(mockRootState)).toBe(
          contactVerificationId,
        );
      });
    });

    describe('selectConsentSetId', () => {
      it('should return null by default from initial state', () => {
        const mockRootState = { card: initialState } as unknown as RootState;
        expect(selectConsentSetId(mockRootState)).toBe(null);
      });

      it('should return the consent set ID when set', () => {
        const consentSetId = 'consent-789';
        const stateWithConsentSetId: CardSliceState = {
          ...initialState,
          onboarding: {
            ...initialState.onboarding,
            consentSetId,
          },
        };
        const mockRootState = {
          card: stateWithConsentSetId,
        } as unknown as RootState;
        expect(selectConsentSetId(mockRootState)).toBe(consentSetId);
      });
    });
  });
});

describe('Card Reducer', () => {
  describe('extraReducers', () => {
    describe('loadCardholderAccounts', () => {
      it('should set cardholder accounts, geolocation, and update state when fulfilled', () => {
        const mockPayload = {
          cardholderAddresses: ['0x123', '0x456'],
          geoLocation: 'US',
        };
        const action = {
          type: loadCardholderAccounts.fulfilled.type,
          payload: mockPayload,
        };
        const state = cardReducer(initialState, action);

        expect(state.cardholderAccounts).toEqual(['0x123', '0x456']);
        expect(state.geoLocation).toBe('US');
        expect(state.isLoaded).toBe(true);
      });

      it('should handle empty cardholderAddresses in payload when fulfilled', () => {
        const mockPayload = {
          cardholderAddresses: [],
          geoLocation: 'GB',
        };
        const action = {
          type: loadCardholderAccounts.fulfilled.type,
          payload: mockPayload,
        };
        const state = cardReducer(initialState, action);

        expect(state.cardholderAccounts).toEqual([]);
        expect(state.geoLocation).toBe('GB');
        expect(state.isLoaded).toBe(true);
      });

      it('should handle null cardholderAddresses and fallback to UNKNOWN geolocation', () => {
        const mockPayload = {
          cardholderAddresses: null,
          geoLocation: null,
        };
        const action = {
          type: loadCardholderAccounts.fulfilled.type,
          payload: mockPayload,
        };
        const state = cardReducer(initialState, action);

        expect(state.cardholderAccounts).toEqual([]);
        expect(state.geoLocation).toBe('UNKNOWN');
        expect(state.isLoaded).toBe(true);
      });

      it('should set isLoaded to true when rejected', () => {
        const errorMessage = 'Failed to load accounts';
        const action = {
          type: loadCardholderAccounts.rejected.type,
          error: {
            message: errorMessage,
          },
        };
        const state = cardReducer(initialState, action);

        expect(state.isLoaded).toBe(true);
        expect(state.cardholderAccounts).toEqual([]); // Should remain empty on error
        expect(state.geoLocation).toBe('UNKNOWN'); // Should remain UNKNOWN on error
      });

      it('should handle different geolocation values', () => {
        const geoLocations = ['US', 'GB', 'CA', 'DE', 'FR', 'UNKNOWN'];

        geoLocations.forEach((geoLocation) => {
          const mockPayload = {
            cardholderAddresses: ['0x123'],
            geoLocation,
          };
          const action = {
            type: loadCardholderAccounts.fulfilled.type,
            payload: mockPayload,
          };
          const state = cardReducer(initialState, action);

          expect(state.geoLocation).toBe(geoLocation);
        });
      });
    });
  });

  describe('reducers', () => {
    it('should reset card state', () => {
      const currentState: CardSliceState = {
        cardholderAccounts: ['0x123'],
        isDaimoDemo: false,
        priorityTokensByAddress: {
          '0x123': MOCK_PRIORITY_TOKEN,
        },
        lastFetchedByAddress: {
          '0x123': new Date(),
        },
        authenticatedPriorityToken: MOCK_PRIORITY_TOKEN,
        authenticatedPriorityTokenLastFetched: new Date('2025-08-21T10:00:00Z'),
        isLoaded: true,
        hasViewedCardButton: true,
        alwaysShowCardButton: true,
        geoLocation: 'US',
        isAuthenticated: false,
        userCardLocation: 'us',
        onboarding: {
          onboardingId: null,
          selectedCountry: null,
          contactVerificationId: null,
          consentSetId: null,
        },
        cache: {
          data: {},
          timestamps: {},
        },
      };

      const state = cardReducer(currentState, resetCardState());

      expect(state).toEqual(initialState);
      expect(state.geoLocation).toBe('UNKNOWN');
      expect(state.alwaysShowCardButton).toBe(false);
    });

    describe('setHasViewedCardButton', () => {
      it('should set hasViewedCardButton to true', () => {
        const state = cardReducer(initialState, setHasViewedCardButton(true));
        expect(state.hasViewedCardButton).toBe(true);
        // ensure other parts of state untouched
        expect(state.cardholderAccounts).toEqual(
          initialState.cardholderAccounts,
        );
      });

      it('should set hasViewedCardButton to false when previously true', () => {
        const current: CardSliceState = {
          ...initialState,
          hasViewedCardButton: true,
        };
        const state = cardReducer(current, setHasViewedCardButton(false));
        expect(state.hasViewedCardButton).toBe(false);
      });
    });

    describe('onboarding actions', () => {
      describe('setOnboardingId', () => {
        it('should set onboardingId', () => {
          const onboardingId = 'test-onboarding-123';
          const state = cardReducer(
            initialState,
            setOnboardingId(onboardingId),
          );
          expect(state.onboarding.onboardingId).toBe(onboardingId);
          // ensure other parts of state untouched
          expect(state.onboarding.selectedCountry).toBe(null);
          expect(state.onboarding.contactVerificationId).toBe(null);
          expect(state.onboarding.consentSetId).toBe(null);
        });

        it('should update onboardingId when previously set', () => {
          const current: CardSliceState = {
            ...initialState,
            onboarding: {
              ...initialState.onboarding,
              onboardingId: 'old-id',
            },
          };
          const newId = 'new-onboarding-456';
          const state = cardReducer(current, setOnboardingId(newId));
          expect(state.onboarding.onboardingId).toBe(newId);
        });

        it('should set onboardingId to null', () => {
          const current: CardSliceState = {
            ...initialState,
            onboarding: {
              ...initialState.onboarding,
              onboardingId: 'existing-id',
            },
          };
          const state = cardReducer(current, setOnboardingId(null));
          expect(state.onboarding.onboardingId).toBe(null);
        });
      });

      describe('setSelectedCountry', () => {
        it('should set selectedCountry', () => {
          const country = MOCK_REGION_US;
          const state = cardReducer(initialState, setSelectedCountry(country));
          expect(state.onboarding.selectedCountry).toBe(country);
          // ensure other parts of state untouched
          expect(state.onboarding.onboardingId).toBe(null);
          expect(state.onboarding.contactVerificationId).toBe(null);
          expect(state.onboarding.consentSetId).toBe(null);
        });

        it('should update selectedCountry when previously set', () => {
          const current: CardSliceState = {
            ...initialState,
            onboarding: {
              ...initialState.onboarding,
              selectedCountry: MOCK_REGION_GB,
            },
          };
          const newCountry = MOCK_REGION_CA;
          const state = cardReducer(current, setSelectedCountry(newCountry));
          expect(state.onboarding.selectedCountry).toBe(newCountry);
        });

        it('should set selectedCountry to null', () => {
          const current: CardSliceState = {
            ...initialState,
            onboarding: {
              ...initialState.onboarding,
              selectedCountry: MOCK_REGION_US,
            },
          };
          const state = cardReducer(current, setSelectedCountry(null));
          expect(state.onboarding.selectedCountry).toBe(null);
        });
      });

      describe('setContactVerificationId', () => {
        it('should set contactVerificationId', () => {
          const verificationId = 'verification-123';
          const state = cardReducer(
            initialState,
            setContactVerificationId(verificationId),
          );
          expect(state.onboarding.contactVerificationId).toBe(verificationId);
          // ensure other parts of state untouched
          expect(state.onboarding.onboardingId).toBe(null);
          expect(state.onboarding.selectedCountry).toBe(null);
          expect(state.onboarding.consentSetId).toBe(null);
        });

        it('should update contactVerificationId when previously set', () => {
          const current: CardSliceState = {
            ...initialState,
            onboarding: {
              ...initialState.onboarding,
              contactVerificationId: 'old-verification',
            },
          };
          const newVerificationId = 'new-verification-456';
          const state = cardReducer(
            current,
            setContactVerificationId(newVerificationId),
          );
          expect(state.onboarding.contactVerificationId).toBe(
            newVerificationId,
          );
        });

        it('should set contactVerificationId to null', () => {
          const current: CardSliceState = {
            ...initialState,
            onboarding: {
              ...initialState.onboarding,
              contactVerificationId: 'existing-verification',
            },
          };
          const state = cardReducer(current, setContactVerificationId(null));
          expect(state.onboarding.contactVerificationId).toBe(null);
        });
      });

      describe('setConsentSetId', () => {
        it('should set consentSetId', () => {
          const consentSetId = 'consent-123';
          const state = cardReducer(
            initialState,
            setConsentSetId(consentSetId),
          );
          expect(state.onboarding.consentSetId).toBe(consentSetId);
          // ensure other parts of state untouched
          expect(state.onboarding.onboardingId).toBe(null);
          expect(state.onboarding.selectedCountry).toBe(null);
          expect(state.onboarding.contactVerificationId).toBe(null);
        });

        it('should update consentSetId when previously set', () => {
          const current: CardSliceState = {
            ...initialState,
            onboarding: {
              ...initialState.onboarding,
              consentSetId: 'old-consent',
            },
          };
          const newConsentSetId = 'new-consent-456';
          const state = cardReducer(current, setConsentSetId(newConsentSetId));
          expect(state.onboarding.consentSetId).toBe(newConsentSetId);
        });

        it('should set consentSetId to null', () => {
          const current: CardSliceState = {
            ...initialState,
            onboarding: {
              ...initialState.onboarding,
              consentSetId: 'existing-consent',
            },
          };
          const state = cardReducer(current, setConsentSetId(null));
          expect(state.onboarding.consentSetId).toBe(null);
        });
      });

      describe('resetOnboardingState', () => {
        it('should reset all onboarding state to initial values', () => {
          const current: CardSliceState = {
            ...initialState,
            onboarding: {
              onboardingId: 'test-id',
              selectedCountry: MOCK_REGION_US,
              contactVerificationId: 'verification-123',
              consentSetId: 'consent-456',
            },
          };
          const state = cardReducer(current, resetOnboardingState());
          expect(state.onboarding).toEqual({
            onboardingId: null,
            selectedCountry: null,
            contactVerificationId: null,
            consentSetId: null,
          });
          // ensure other parts of state untouched
          expect(state.cardholderAccounts).toEqual(current.cardholderAccounts);
          expect(state.geoLocation).toBe(current.geoLocation);
        });

        it('should reset onboarding state when already at initial values', () => {
          const state = cardReducer(initialState, resetOnboardingState());
          expect(state.onboarding).toEqual({
            onboardingId: null,
            selectedCountry: null,
            contactVerificationId: null,
            consentSetId: null,
          });
        });
      });
    });

    describe('Cache Actions', () => {
      describe('setCacheData', () => {
        it('should set cache data with key, data, and timestamp', () => {
          const cacheKey = 'test-key';
          const cacheData = { value: 'test-data' };
          const timestamp = Date.now();

          const state = cardReducer(
            initialState,
            setCacheData({
              key: cacheKey,
              data: cacheData,
              timestamp,
            }),
          );

          expect(state.cache.data[cacheKey]).toEqual(cacheData);
          expect(state.cache.timestamps[cacheKey]).toBe(timestamp);
        });

        it('should handle different data types', () => {
          const testCases = [
            { key: 'string-data', data: 'test string', timestamp: 1000 },
            { key: 'number-data', data: 42, timestamp: 2000 },
            { key: 'boolean-data', data: true, timestamp: 3000 },
            { key: 'array-data', data: [1, 2, 3], timestamp: 4000 },
            {
              key: 'object-data',
              data: { nested: { value: 'test' } },
              timestamp: 5000,
            },
            { key: 'null-data', data: null, timestamp: 6000 },
          ];

          let state = initialState;
          testCases.forEach(({ key, data, timestamp }) => {
            state = cardReducer(state, setCacheData({ key, data, timestamp }));
          });

          testCases.forEach(({ key, data, timestamp }) => {
            expect(state.cache.data[key]).toEqual(data);
            expect(state.cache.timestamps[key]).toBe(timestamp);
          });
        });

        it('should overwrite existing cache data for the same key', () => {
          const cacheKey = 'overwrite-test';
          const oldData = { value: 'old' };
          const newData = { value: 'new' };
          const oldTimestamp = 1000;
          const newTimestamp = 2000;

          let state = cardReducer(
            initialState,
            setCacheData({
              key: cacheKey,
              data: oldData,
              timestamp: oldTimestamp,
            }),
          );

          state = cardReducer(
            state,
            setCacheData({
              key: cacheKey,
              data: newData,
              timestamp: newTimestamp,
            }),
          );

          expect(state.cache.data[cacheKey]).toEqual(newData);
          expect(state.cache.timestamps[cacheKey]).toBe(newTimestamp);
        });

        it('should not affect other cache entries', () => {
          const existingKey = 'existing';
          const existingData = { value: 'existing' };
          const existingTimestamp = 1000;

          const newKey = 'new';
          const newData = { value: 'new' };
          const newTimestamp = 2000;

          let state = cardReducer(
            initialState,
            setCacheData({
              key: existingKey,
              data: existingData,
              timestamp: existingTimestamp,
            }),
          );

          state = cardReducer(
            state,
            setCacheData({
              key: newKey,
              data: newData,
              timestamp: newTimestamp,
            }),
          );

          expect(state.cache.data[existingKey]).toEqual(existingData);
          expect(state.cache.timestamps[existingKey]).toBe(existingTimestamp);
          expect(state.cache.data[newKey]).toEqual(newData);
          expect(state.cache.timestamps[newKey]).toBe(newTimestamp);
        });
      });

      describe('clearCacheData', () => {
        it('should clear cache data for specific key', () => {
          const cacheKey = 'test-key';
          const cacheData = { value: 'test-data' };
          const timestamp = Date.now();

          let state = cardReducer(
            initialState,
            setCacheData({
              key: cacheKey,
              data: cacheData,
              timestamp,
            }),
          );

          state = cardReducer(state, clearCacheData(cacheKey));

          expect(state.cache.data[cacheKey]).toBeUndefined();
          expect(state.cache.timestamps[cacheKey]).toBeUndefined();
        });

        it('should only clear the specified key, not others', () => {
          const key1 = 'key1';
          const key2 = 'key2';
          const data1 = { value: 'data1' };
          const data2 = { value: 'data2' };
          const timestamp1 = 1000;
          const timestamp2 = 2000;

          let state = cardReducer(
            initialState,
            setCacheData({ key: key1, data: data1, timestamp: timestamp1 }),
          );

          state = cardReducer(
            state,
            setCacheData({ key: key2, data: data2, timestamp: timestamp2 }),
          );

          state = cardReducer(state, clearCacheData(key1));

          expect(state.cache.data[key1]).toBeUndefined();
          expect(state.cache.timestamps[key1]).toBeUndefined();
          expect(state.cache.data[key2]).toEqual(data2);
          expect(state.cache.timestamps[key2]).toBe(timestamp2);
        });

        it('should handle clearing non-existent key gracefully', () => {
          const nonExistentKey = 'non-existent';
          const existingKey = 'existing';
          const existingData = { value: 'existing' };
          const existingTimestamp = 1000;

          let state = cardReducer(
            initialState,
            setCacheData({
              key: existingKey,
              data: existingData,
              timestamp: existingTimestamp,
            }),
          );

          state = cardReducer(state, clearCacheData(nonExistentKey));

          expect(state.cache.data[existingKey]).toEqual(existingData);
          expect(state.cache.timestamps[existingKey]).toBe(existingTimestamp);
          expect(state.cache.data[nonExistentKey]).toBeUndefined();
          expect(state.cache.timestamps[nonExistentKey]).toBeUndefined();
        });
      });

      describe('clearAllCache', () => {
        it('should clear all cache data and timestamps', () => {
          const testData = [
            { key: 'key1', data: { value: 'data1' }, timestamp: 1000 },
            { key: 'key2', data: { value: 'data2' }, timestamp: 2000 },
            { key: 'key3', data: { value: 'data3' }, timestamp: 3000 },
          ];

          let state = initialState;
          testData.forEach(({ key, data, timestamp }) => {
            state = cardReducer(state, setCacheData({ key, data, timestamp }));
          });

          // Verify data was set
          testData.forEach(({ key, data, timestamp }) => {
            expect(state.cache.data[key]).toEqual(data);
            expect(state.cache.timestamps[key]).toBe(timestamp);
          });

          state = cardReducer(state, clearAllCache());

          expect(state.cache.data).toEqual({});
          expect(state.cache.timestamps).toEqual({});
        });

        it('should not affect other state properties', () => {
          const testData = {
            key: 'test',
            data: { value: 'test' },
            timestamp: 1000,
          };

          let state = cardReducer(initialState, setCacheData(testData));

          state = cardReducer(state, clearAllCache());

          expect(state.cache.data).toEqual({});
          expect(state.cache.timestamps).toEqual({});
          expect(state.cardholderAccounts).toEqual(
            initialState.cardholderAccounts,
          );
          expect(state.priorityTokensByAddress).toEqual(
            initialState.priorityTokensByAddress,
          );
          expect(state.onboarding).toEqual(initialState.onboarding);
        });

        it('should work when cache is already empty', () => {
          const state = cardReducer(initialState, clearAllCache());

          expect(state.cache.data).toEqual({});
          expect(state.cache.timestamps).toEqual({});
        });
      });
    });

    describe('resetAuthenticatedData', () => {
      it('resets all authenticated-related state to initial values', () => {
        const currentState: CardSliceState = {
          ...initialState,
          authenticatedPriorityToken: MOCK_PRIORITY_TOKEN,
          authenticatedPriorityTokenLastFetched: new Date(
            '2025-08-21T10:00:00Z',
          ),
          userCardLocation: 'us',
          isAuthenticated: true,
        };

        const state = cardReducer(currentState, resetAuthenticatedData());

        expect(state.authenticatedPriorityToken).toBeNull();
        expect(state.authenticatedPriorityTokenLastFetched).toBeNull();
        expect(state.userCardLocation).toBe('international');
        expect(state.isAuthenticated).toBe(false);
      });

      it('does not affect other state properties', () => {
        const currentState: CardSliceState = {
          ...initialState,
          cardholderAccounts: ['0x123'],
          geoLocation: 'US',
          isLoaded: true,
          hasViewedCardButton: true,
          alwaysShowCardButton: true,
          authenticatedPriorityToken: MOCK_PRIORITY_TOKEN,
          authenticatedPriorityTokenLastFetched: new Date(
            '2025-08-21T10:00:00Z',
          ),
          userCardLocation: 'us',
          isAuthenticated: true,
          priorityTokensByAddress: {
            [testAddress.toLowerCase()]: MOCK_PRIORITY_TOKEN,
          },
          lastFetchedByAddress: {
            [testAddress.toLowerCase()]: new Date('2025-08-21T10:00:00Z'),
          },
          onboarding: {
            onboardingId: 'test-id',
            selectedCountry: MOCK_REGION_US,
            contactVerificationId: 'verification-123',
            consentSetId: 'consent-456',
          },
        };

        const state = cardReducer(currentState, resetAuthenticatedData());

        // Authenticated data is reset
        expect(state.authenticatedPriorityToken).toBeNull();
        expect(state.authenticatedPriorityTokenLastFetched).toBeNull();
        expect(state.userCardLocation).toBe('international');
        expect(state.isAuthenticated).toBe(false);

        // Other state properties remain unchanged
        expect(state.cardholderAccounts).toEqual(['0x123']);
        expect(state.geoLocation).toBe('US');
        expect(state.isLoaded).toBe(true);
        expect(state.hasViewedCardButton).toBe(true);
        expect(state.alwaysShowCardButton).toBe(true);
        expect(
          state.priorityTokensByAddress[testAddress.toLowerCase()],
        ).toEqual(MOCK_PRIORITY_TOKEN);
        expect(state.lastFetchedByAddress[testAddress.toLowerCase()]).toEqual(
          new Date('2025-08-21T10:00:00Z'),
        );
        expect(state.onboarding).toEqual({
          onboardingId: 'test-id',
          selectedCountry: MOCK_REGION_US,
          contactVerificationId: 'verification-123',
          consentSetId: 'consent-456',
        });
      });

      it('works when authenticated data is already at initial values', () => {
        const state = cardReducer(initialState, resetAuthenticatedData());

        expect(state.authenticatedPriorityToken).toBeNull();
        expect(state.authenticatedPriorityTokenLastFetched).toBeNull();
        expect(state.userCardLocation).toBe('international');
        expect(state.isAuthenticated).toBe(false);
      });

      it('resets userCardLocation to international from us', () => {
        const currentState: CardSliceState = {
          ...initialState,
          userCardLocation: 'us',
        };

        const state = cardReducer(currentState, resetAuthenticatedData());

        expect(state.userCardLocation).toBe('international');
      });

      it('resets string date format for authenticatedPriorityTokenLastFetched', () => {
        const currentState: CardSliceState = {
          ...initialState,
          authenticatedPriorityTokenLastFetched: '2025-08-21T10:00:00Z',
          isAuthenticated: true,
        };

        const state = cardReducer(currentState, resetAuthenticatedData());

        expect(state.authenticatedPriorityTokenLastFetched).toBeNull();
        expect(state.isAuthenticated).toBe(false);
      });
    });
  });
});

describe('Card Caching Functionality', () => {
  describe('selectCardPriorityToken', () => {
    it('should return the priority token when it exists for the given address', () => {
      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      const selector = selectCardPriorityToken(false, testAddress);
      expect(selector(mockRootState)).toEqual(MOCK_PRIORITY_TOKEN);
    });

    it('should return null when no priority token exists for the given address', () => {
      const mockRootState = {
        card: EMPTY_CARD_STATE_MOCK,
      } as unknown as RootState;

      const selector = selectCardPriorityToken(false, testAddress);
      expect(selector(mockRootState)).toBeNull();
    });

    it('should return null when address is not provided', () => {
      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      const selector = selectCardPriorityToken(false);
      expect(selector(mockRootState)).toBeNull();
    });

    it('should handle different address cases', () => {
      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      // Test with uppercase address
      const upperCaseSelector = selectCardPriorityToken(
        false,
        testAddress.toUpperCase(),
      );
      expect(upperCaseSelector(mockRootState)).toEqual(MOCK_PRIORITY_TOKEN);

      // Test with different address that doesn't exist
      const differentAddressSelector = selectCardPriorityToken(
        false,
        '0x9999999999999999999999999999999999999999',
      );
      expect(differentAddressSelector(mockRootState)).toBeNull();
    });
  });

  describe('selectCardPriorityTokenLastFetched', () => {
    it('should return the last fetched timestamp when it exists for the given address', () => {
      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      const selector = selectCardPriorityTokenLastFetched(false, testAddress);
      expect(selector(mockRootState)).toEqual(new Date('2025-08-21T10:00:00Z'));
    });

    it('should return null when no last fetched timestamp exists for the given address', () => {
      const mockRootState = {
        card: EMPTY_CARD_STATE_MOCK,
      } as unknown as RootState;

      const selector = selectCardPriorityTokenLastFetched(false, testAddress);
      expect(selector(mockRootState)).toBeNull();
    });

    it('should return null when address is not provided', () => {
      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      const selector = selectCardPriorityTokenLastFetched(false);
      expect(selector(mockRootState)).toBeNull();
    });

    it('should handle different address cases', () => {
      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      // Test with uppercase address
      const upperCaseSelector = selectCardPriorityTokenLastFetched(
        false,
        testAddress.toUpperCase(),
      );
      expect(upperCaseSelector(mockRootState)).toEqual(
        new Date('2025-08-21T10:00:00Z'),
      );

      // Test with different address that doesn't exist
      const differentAddressSelector = selectCardPriorityTokenLastFetched(
        false,
        '0x9999999999999999999999999999999999999999',
      );
      expect(differentAddressSelector(mockRootState)).toBeNull();
    });
  });

  describe('selectIsCardCacheValid', () => {
    let dateNowSpy: jest.SpyInstance;

    beforeEach(() => {
      dateNowSpy = jest.spyOn(Date, 'now');
    });

    afterEach(() => {
      dateNowSpy.mockRestore();
    });

    it('should return true when cache is within 5-minute window for the given address', () => {
      // Mock Date.now to return 4 minutes after fetch time
      dateNowSpy.mockReturnValue(new Date('2025-08-21T10:04:00Z').getTime());

      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      const selector = selectIsCardCacheValid(false, testAddress);
      expect(selector(mockRootState)).toBe(true);
    });

    it('should return false when cache is older than 5 minutes for the given address', () => {
      // Mock Date.now to return 6 minutes after fetch time
      dateNowSpy.mockReturnValue(new Date('2025-08-21T10:06:00Z').getTime());

      const stateWithOldCache: CardSliceState = {
        ...CARD_STATE_MOCK,
        lastFetchedByAddress: {
          [testAddress.toLowerCase()]: new Date('2025-08-21T10:00:00Z'),
        },
      };

      const mockRootState = {
        card: stateWithOldCache,
      } as unknown as RootState;

      const selector = selectIsCardCacheValid(false, testAddress);
      expect(selector(mockRootState)).toBe(false);
    });

    it('should return false when no last fetched timestamp exists for the given address', () => {
      // Mock Date.now to any time
      dateNowSpy.mockReturnValue(new Date('2025-08-21T10:04:00Z').getTime());

      const mockRootState = {
        card: EMPTY_CARD_STATE_MOCK,
      } as unknown as RootState;

      const selector = selectIsCardCacheValid(false, testAddress);
      expect(selector(mockRootState)).toBe(false);
    });

    it('should handle ISO date strings from redux-persist', () => {
      // Mock Date.now to return 4 minutes after fetch time
      dateNowSpy.mockReturnValue(new Date('2025-08-21T10:04:00Z').getTime());

      const stateWithStringDate: CardSliceState = {
        ...CARD_STATE_MOCK,
        lastFetchedByAddress: {
          [testAddress.toLowerCase()]: '2025-08-21T10:00:00Z', // String instead of Date object
        },
      };

      const mockRootState = {
        card: stateWithStringDate,
      } as unknown as RootState;

      const selector = selectIsCardCacheValid(false, testAddress);
      expect(selector(mockRootState)).toBe(true);
    });

    it('should return false when address is not provided', () => {
      // Mock Date.now to return 4 minutes after fetch time
      dateNowSpy.mockReturnValue(new Date('2025-08-21T10:04:00Z').getTime());

      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      const selector = selectIsCardCacheValid(false);
      expect(selector(mockRootState)).toBe(false);
    });

    it('should return false for cache exactly 5 minutes old', () => {
      // Mock Date.now to return exactly 5 minutes after fetch time
      dateNowSpy.mockReturnValue(new Date('2025-08-21T10:05:00Z').getTime());

      const stateWithExactlyOldCache: CardSliceState = {
        ...CARD_STATE_MOCK,
        lastFetchedByAddress: {
          [testAddress.toLowerCase()]: new Date('2025-08-21T10:00:00Z'),
        },
      };

      const mockRootState = {
        card: stateWithExactlyOldCache,
      } as unknown as RootState;

      const selector = selectIsCardCacheValid(false, testAddress);
      expect(selector(mockRootState)).toBe(false);
    });

    it('should return true for cache 4 minutes and 59 seconds old', () => {
      // Mock Date.now to return 4:59 after fetch time (still valid)
      dateNowSpy.mockReturnValue(new Date('2025-08-21T10:04:59Z').getTime());

      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      const selector = selectIsCardCacheValid(false, testAddress);
      expect(selector(mockRootState)).toBe(true);
    });
  });

  describe('setCardPriorityToken', () => {
    it('should set the priority token for the given address', () => {
      const state = cardReducer(
        initialState,
        setCardPriorityToken({
          address: testAddress,
          token: MOCK_PRIORITY_TOKEN,
        }),
      );

      expect(state.priorityTokensByAddress[testAddress.toLowerCase()]).toEqual(
        MOCK_PRIORITY_TOKEN,
      );
      expect(state.lastFetchedByAddress).toEqual(
        initialState.lastFetchedByAddress,
      );
    });

    it('should set priority token to null for the given address', () => {
      const stateWithToken = {
        ...initialState,
        priorityTokensByAddress: {
          [testAddress.toLowerCase()]: MOCK_PRIORITY_TOKEN,
        },
      };

      const state = cardReducer(
        stateWithToken,
        setCardPriorityToken({
          address: testAddress,
          token: null,
        }),
      );

      expect(
        state.priorityTokensByAddress[testAddress.toLowerCase()],
      ).toBeNull();
    });

    it('should update existing priority token for the given address', () => {
      const newToken: CardTokenAllowance = {
        ...MOCK_PRIORITY_TOKEN,
        symbol: 'UPDATED',
      };

      const stateWithToken = {
        ...initialState,
        priorityTokensByAddress: {
          [testAddress.toLowerCase()]: MOCK_PRIORITY_TOKEN,
        },
      };

      const state = cardReducer(
        stateWithToken,
        setCardPriorityToken({
          address: testAddress,
          token: newToken,
        }),
      );

      expect(state.priorityTokensByAddress[testAddress.toLowerCase()]).toEqual(
        newToken,
      );
    });

    it('should store tokens for different addresses separately', () => {
      const address1 = testAddress;
      const address2 = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      const token2: CardTokenAllowance = {
        ...MOCK_PRIORITY_TOKEN,
        symbol: 'TOKEN2',
      };

      let state = cardReducer(
        initialState,
        setCardPriorityToken({
          address: address1,
          token: MOCK_PRIORITY_TOKEN,
        }),
      );

      state = cardReducer(
        state,
        setCardPriorityToken({
          address: address2,
          token: token2,
        }),
      );

      expect(state.priorityTokensByAddress[address1.toLowerCase()]).toEqual(
        MOCK_PRIORITY_TOKEN,
      );
      expect(state.priorityTokensByAddress[address2.toLowerCase()]).toEqual(
        token2,
      );
    });

    it('should normalize address to lowercase', () => {
      const upperCaseAddress = testAddress.toUpperCase();

      const state = cardReducer(
        initialState,
        setCardPriorityToken({
          address: upperCaseAddress,
          token: MOCK_PRIORITY_TOKEN,
        }),
      );

      expect(state.priorityTokensByAddress[testAddress.toLowerCase()]).toEqual(
        MOCK_PRIORITY_TOKEN,
      );
      expect(state.priorityTokensByAddress[upperCaseAddress]).toBeUndefined();
    });
  });

  describe('setCardPriorityTokenLastFetched', () => {
    it('should set the last fetched timestamp for the given address', () => {
      const testDate = new Date('2025-08-21T10:00:00Z');

      const state = cardReducer(
        initialState,
        setCardPriorityTokenLastFetched({
          address: testAddress,
          lastFetched: testDate,
        }),
      );

      expect(state.lastFetchedByAddress[testAddress.toLowerCase()]).toEqual(
        testDate,
      );
      expect(state.priorityTokensByAddress).toEqual(
        initialState.priorityTokensByAddress,
      );
    });

    it('should handle ISO date strings', () => {
      const testDateString = '2025-08-21T10:00:00Z';

      const state = cardReducer(
        initialState,
        setCardPriorityTokenLastFetched({
          address: testAddress,
          lastFetched: testDateString,
        }),
      );

      expect(state.lastFetchedByAddress[testAddress.toLowerCase()]).toEqual(
        testDateString,
      );
    });

    it('should store last fetched timestamps for different addresses separately', () => {
      const address1 = testAddress;
      const address2 = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      const date1 = new Date('2025-08-21T10:00:00Z');
      const date2 = new Date('2025-08-21T11:00:00Z');

      let state = cardReducer(
        initialState,
        setCardPriorityTokenLastFetched({
          address: address1,
          lastFetched: date1,
        }),
      );

      state = cardReducer(
        state,
        setCardPriorityTokenLastFetched({
          address: address2,
          lastFetched: date2,
        }),
      );

      expect(state.lastFetchedByAddress[address1.toLowerCase()]).toEqual(date1);
      expect(state.lastFetchedByAddress[address2.toLowerCase()]).toEqual(date2);
    });

    it('should normalize address to lowercase', () => {
      const upperCaseAddress = testAddress.toUpperCase();
      const testDate = new Date('2025-08-21T10:00:00Z');

      const state = cardReducer(
        initialState,
        setCardPriorityTokenLastFetched({
          address: upperCaseAddress,
          lastFetched: testDate,
        }),
      );

      expect(state.lastFetchedByAddress[testAddress.toLowerCase()]).toEqual(
        testDate,
      );
      expect(state.lastFetchedByAddress[upperCaseAddress]).toBeUndefined();
    });

    it('should set lastFetched to null for the given address', () => {
      const stateWithTimestamp = {
        ...initialState,
        lastFetchedByAddress: {
          [testAddress.toLowerCase()]: new Date(),
        },
      };

      const state = cardReducer(
        stateWithTimestamp,
        setCardPriorityTokenLastFetched({
          address: testAddress,
          lastFetched: null,
        }),
      );

      expect(state.lastFetchedByAddress[testAddress.toLowerCase()]).toBeNull();
    });

    it('should overwrite existing timestamp for the given address', () => {
      const oldTimestamp = new Date('2025-08-21T10:00:00Z');
      const newTimestamp = new Date('2025-08-21T11:00:00Z');

      const stateWithTimestamp = {
        ...initialState,
        lastFetchedByAddress: {
          [testAddress.toLowerCase()]: oldTimestamp,
        },
      };

      const state = cardReducer(
        stateWithTimestamp,
        setCardPriorityTokenLastFetched({
          address: testAddress,
          lastFetched: newTimestamp,
        }),
      );

      expect(state.lastFetchedByAddress[testAddress.toLowerCase()]).toEqual(
        newTimestamp,
      );
    });
  });
});

describe('Card Button Display Selectors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('selectAlwaysShowCardButton', () => {
    it('should return false when experimental switch is disabled', () => {
      mockSelectCardExperimentalSwitch.mockReturnValue(false);

      const stateWithAlwaysShow: CardSliceState = {
        ...initialState,
        alwaysShowCardButton: true,
      };

      const mockRootState = {
        card: stateWithAlwaysShow,
      } as unknown as RootState;

      expect(selectAlwaysShowCardButton(mockRootState)).toBe(false);
    });

    it('should return stored value when experimental switch is enabled', () => {
      mockSelectCardExperimentalSwitch.mockReturnValue(true);

      const stateWithAlwaysShow: CardSliceState = {
        ...initialState,
        alwaysShowCardButton: true,
      };

      const mockRootState = {
        card: stateWithAlwaysShow,
      } as unknown as RootState;

      expect(selectAlwaysShowCardButton(mockRootState)).toBe(true);
    });

    it('should return false when experimental switch is enabled but stored value is false', () => {
      mockSelectCardExperimentalSwitch.mockReturnValue(true);

      const stateWithoutAlwaysShow: CardSliceState = {
        ...initialState,
        alwaysShowCardButton: false,
      };

      const mockRootState = {
        card: stateWithoutAlwaysShow,
      } as unknown as RootState;

      expect(selectAlwaysShowCardButton(mockRootState)).toBe(false);
    });

    it('should return false by default with initial state', () => {
      mockSelectCardExperimentalSwitch.mockReturnValue(false);

      const mockRootState = {
        card: initialState,
      } as unknown as RootState;

      expect(selectAlwaysShowCardButton(mockRootState)).toBe(false);
    });
  });

  describe('setAlwaysShowCardButton', () => {
    it('should set alwaysShowCardButton to true', () => {
      const state = cardReducer(initialState, setAlwaysShowCardButton(true));
      expect(state.alwaysShowCardButton).toBe(true);
    });

    it('should set alwaysShowCardButton to false', () => {
      const currentState: CardSliceState = {
        ...initialState,
        alwaysShowCardButton: true,
      };

      const state = cardReducer(currentState, setAlwaysShowCardButton(false));
      expect(state.alwaysShowCardButton).toBe(false);
    });

    it('should not affect other state properties', () => {
      const state = cardReducer(initialState, setAlwaysShowCardButton(true));
      expect(state.cardholderAccounts).toEqual(initialState.cardholderAccounts);
      expect(state.geoLocation).toEqual(initialState.geoLocation);
      expect(state.isLoaded).toEqual(initialState.isLoaded);
    });
  });

  describe('selectDisplayCardButton', () => {
    const mockAccountAddress = '0x1234567890123456789012345678901234567890';
    const mockAccount = {
      address: mockAccountAddress.toLowerCase(),
      id: 'mock-id',
      metadata: {
        name: 'Mock Account',
        importTime: Date.now(),
        keyring: { type: 'HD Key Tree' },
      },
      options: {},
      methods: [],
      type: 'eip155:eoa' as const,
      scopes: ['eip155:59144' as const],
    };

    beforeEach(() => {
      // Reset all mocks to default false/empty values
      mockSelectCardExperimentalSwitch.mockReturnValue(false);
      mockSelectCardSupportedCountries.mockReturnValue({});
      mockSelectDisplayCardButtonFeatureFlag.mockReturnValue(false);
      mockSelectSelectedInternalAccountByScope.mockReturnValue(() => undefined);
      mockIsEthAccount.mockReturnValue(false);
    });

    it('should return true when alwaysShowCardButton is true', () => {
      mockSelectCardExperimentalSwitch.mockReturnValue(true);

      const stateWithAlwaysShow: CardSliceState = {
        ...initialState,
        alwaysShowCardButton: true,
        geoLocation: 'XX', // Unsupported country
        cardholderAccounts: [], // Not a cardholder
      };

      const mockRootState = {
        card: stateWithAlwaysShow,
      } as unknown as RootState;

      expect(selectDisplayCardButton(mockRootState)).toBe(true);
    });

    it('should return true when user is a cardholder', () => {
      const stateWithCardholder: CardSliceState = {
        ...initialState,
        cardholderAccounts: [mockAccountAddress.toLowerCase()],
        alwaysShowCardButton: false,
        geoLocation: 'XX', // Unsupported country
      };

      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        () => mockAccount,
      );
      mockIsEthAccount.mockReturnValue(true);
      mockSelectCardExperimentalSwitch.mockReturnValue(false);

      const mockRootState = {
        card: stateWithCardholder,
      } as unknown as RootState;

      expect(selectDisplayCardButton(mockRootState)).toBe(true);
    });

    it('should return true when in supported country with feature flag enabled', () => {
      mockSelectCardSupportedCountries.mockReturnValue({ US: true });
      mockSelectDisplayCardButtonFeatureFlag.mockReturnValue(true);

      const stateWithGeoLocation: CardSliceState = {
        ...initialState,
        geoLocation: 'US',
        cardholderAccounts: [],
        alwaysShowCardButton: false,
      };

      const mockRootState = {
        card: stateWithGeoLocation,
      } as unknown as RootState;

      expect(selectDisplayCardButton(mockRootState)).toBe(true);
    });

    it('should return false when in supported country but feature flag is disabled', () => {
      mockSelectCardSupportedCountries.mockReturnValue({ US: true });
      mockSelectDisplayCardButtonFeatureFlag.mockReturnValue(false);

      const stateWithGeoLocation: CardSliceState = {
        ...initialState,
        geoLocation: 'US',
        cardholderAccounts: [],
        alwaysShowCardButton: false,
      };

      const mockRootState = {
        card: stateWithGeoLocation,
      } as unknown as RootState;

      expect(selectDisplayCardButton(mockRootState)).toBe(false);
    });

    it('should return false when feature flag is enabled but country is not supported', () => {
      mockSelectCardSupportedCountries.mockReturnValue({ US: true });
      mockSelectDisplayCardButtonFeatureFlag.mockReturnValue(true);

      const stateWithUnsupportedGeoLocation: CardSliceState = {
        ...initialState,
        geoLocation: 'CN', // Not in supported countries
        cardholderAccounts: [],
        alwaysShowCardButton: false,
      };

      const mockRootState = {
        card: stateWithUnsupportedGeoLocation,
      } as unknown as RootState;

      expect(selectDisplayCardButton(mockRootState)).toBe(false);
    });

    it('should return false when no conditions are met', () => {
      const mockRootState = {
        card: initialState,
      } as unknown as RootState;

      expect(selectDisplayCardButton(mockRootState)).toBe(false);
    });

    it('should handle multiple supported countries', () => {
      mockSelectCardSupportedCountries.mockReturnValue({
        US: true,
        GB: true,
        CA: true,
        DE: false, // Explicitly false
      });
      mockSelectDisplayCardButtonFeatureFlag.mockReturnValue(true);

      // Test US
      let state: CardSliceState = {
        ...initialState,
        geoLocation: 'US',
        cardholderAccounts: [],
        alwaysShowCardButton: false,
      };
      let mockRootState = { card: state } as unknown as RootState;
      expect(selectDisplayCardButton(mockRootState)).toBe(true);

      // Test GB
      state = { ...state, geoLocation: 'GB' };
      mockRootState = { card: state } as unknown as RootState;
      expect(selectDisplayCardButton(mockRootState)).toBe(true);

      // Test CA
      state = { ...state, geoLocation: 'CA' };
      mockRootState = { card: state } as unknown as RootState;
      expect(selectDisplayCardButton(mockRootState)).toBe(true);

      // Test DE (explicitly false)
      state = { ...state, geoLocation: 'DE' };
      mockRootState = { card: state } as unknown as RootState;
      expect(selectDisplayCardButton(mockRootState)).toBe(false);
    });

    it('should prioritize alwaysShowCardButton over other conditions', () => {
      mockSelectCardExperimentalSwitch.mockReturnValue(true);
      mockSelectCardSupportedCountries.mockReturnValue({});
      mockSelectDisplayCardButtonFeatureFlag.mockReturnValue(false);

      const state: CardSliceState = {
        ...initialState,
        alwaysShowCardButton: true,
        geoLocation: 'XX',
        cardholderAccounts: [],
      };

      const mockRootState = { card: state } as unknown as RootState;

      expect(selectDisplayCardButton(mockRootState)).toBe(true);
    });

    it('should handle UNKNOWN geolocation gracefully', () => {
      mockSelectCardSupportedCountries.mockReturnValue({ US: true });
      mockSelectDisplayCardButtonFeatureFlag.mockReturnValue(true);

      const state: CardSliceState = {
        ...initialState,
        geoLocation: 'UNKNOWN',
        cardholderAccounts: [],
        alwaysShowCardButton: false,
      };

      const mockRootState = { card: state } as unknown as RootState;

      expect(selectDisplayCardButton(mockRootState)).toBe(false);
    });

    it('should return true when all three conditions are true', () => {
      mockSelectCardExperimentalSwitch.mockReturnValue(true);
      mockSelectCardSupportedCountries.mockReturnValue({ US: true });
      mockSelectDisplayCardButtonFeatureFlag.mockReturnValue(true);
      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        () => mockAccount,
      );
      mockIsEthAccount.mockReturnValue(true);

      const state: CardSliceState = {
        ...initialState,
        alwaysShowCardButton: true,
        geoLocation: 'US',
        cardholderAccounts: [mockAccountAddress.toLowerCase()],
      };

      const mockRootState = { card: state } as unknown as RootState;

      expect(selectDisplayCardButton(mockRootState)).toBe(true);
    });
  });
});

describe('Authentication Selectors and Actions', () => {
  describe('selectIsAuthenticatedCard', () => {
    it('returns false by default from initial state', () => {
      const mockRootState = { card: initialState } as unknown as RootState;
      expect(selectIsAuthenticatedCard(mockRootState)).toBe(false);
    });

    it('returns true when isAuthenticated is true', () => {
      const stateWithAuth: CardSliceState = {
        ...initialState,
        isAuthenticated: true,
      };
      const mockRootState = { card: stateWithAuth } as unknown as RootState;
      expect(selectIsAuthenticatedCard(mockRootState)).toBe(true);
    });

    it('returns false when isAuthenticated is false', () => {
      const stateWithoutAuth: CardSliceState = {
        ...initialState,
        isAuthenticated: false,
      };
      const mockRootState = { card: stateWithoutAuth } as unknown as RootState;
      expect(selectIsAuthenticatedCard(mockRootState)).toBe(false);
    });
  });

  describe('selectUserCardLocation', () => {
    it('returns international by default from initial state', () => {
      const mockRootState = { card: initialState } as unknown as RootState;
      expect(selectUserCardLocation(mockRootState)).toBe('international');
    });

    it('returns us when userCardLocation is us', () => {
      const stateWithUsLocation: CardSliceState = {
        ...initialState,
        userCardLocation: 'us',
      };
      const mockRootState = {
        card: stateWithUsLocation,
      } as unknown as RootState;
      expect(selectUserCardLocation(mockRootState)).toBe('us');
    });

    it('returns international when userCardLocation is international', () => {
      const stateWithIntlLocation: CardSliceState = {
        ...initialState,
        userCardLocation: 'international',
      };
      const mockRootState = {
        card: stateWithIntlLocation,
      } as unknown as RootState;
      expect(selectUserCardLocation(mockRootState)).toBe('international');
    });
  });

  describe('setIsAuthenticatedCard', () => {
    it('sets isAuthenticated to true', () => {
      const state = cardReducer(initialState, setIsAuthenticatedCard(true));
      expect(state.isAuthenticated).toBe(true);
    });

    it('sets isAuthenticated to false when previously true', () => {
      const currentState: CardSliceState = {
        ...initialState,
        isAuthenticated: true,
      };
      const state = cardReducer(currentState, setIsAuthenticatedCard(false));
      expect(state.isAuthenticated).toBe(false);
    });

    it('does not affect other state properties', () => {
      const state = cardReducer(initialState, setIsAuthenticatedCard(true));
      expect(state.cardholderAccounts).toEqual(initialState.cardholderAccounts);
      expect(state.geoLocation).toEqual(initialState.geoLocation);
      expect(state.userCardLocation).toEqual(initialState.userCardLocation);
    });
  });

  describe('setUserCardLocation', () => {
    it('sets userCardLocation to us', () => {
      const state = cardReducer(initialState, setUserCardLocation('us'));
      expect(state.userCardLocation).toBe('us');
    });

    it('sets userCardLocation to international', () => {
      const state = cardReducer(
        initialState,
        setUserCardLocation('international'),
      );
      expect(state.userCardLocation).toBe('international');
    });

    it('defaults to international when null is provided', () => {
      const state = cardReducer(initialState, setUserCardLocation(null));
      expect(state.userCardLocation).toBe('international');
    });

    it('updates existing userCardLocation', () => {
      const currentState: CardSliceState = {
        ...initialState,
        userCardLocation: 'us',
      };
      const state = cardReducer(
        currentState,
        setUserCardLocation('international'),
      );
      expect(state.userCardLocation).toBe('international');
    });

    it('does not affect other state properties', () => {
      const state = cardReducer(initialState, setUserCardLocation('us'));
      expect(state.cardholderAccounts).toEqual(initialState.cardholderAccounts);
      expect(state.isAuthenticated).toEqual(initialState.isAuthenticated);
    });
  });

  describe('setAuthenticatedPriorityToken', () => {
    it('sets authenticatedPriorityToken to a token', () => {
      const state = cardReducer(
        initialState,
        setAuthenticatedPriorityToken(MOCK_PRIORITY_TOKEN),
      );
      expect(state.authenticatedPriorityToken).toEqual(MOCK_PRIORITY_TOKEN);
    });

    it('sets authenticatedPriorityToken to null', () => {
      const currentState: CardSliceState = {
        ...initialState,
        authenticatedPriorityToken: MOCK_PRIORITY_TOKEN,
      };
      const state = cardReducer(
        currentState,
        setAuthenticatedPriorityToken(null),
      );
      expect(state.authenticatedPriorityToken).toBeNull();
    });

    it('updates existing authenticatedPriorityToken', () => {
      const newToken: CardTokenAllowance = {
        ...MOCK_PRIORITY_TOKEN,
        symbol: 'DAI',
      };
      const currentState: CardSliceState = {
        ...initialState,
        authenticatedPriorityToken: MOCK_PRIORITY_TOKEN,
      };
      const state = cardReducer(
        currentState,
        setAuthenticatedPriorityToken(newToken),
      );
      expect(state.authenticatedPriorityToken).toEqual(newToken);
    });

    it('does not affect other state properties', () => {
      const state = cardReducer(
        initialState,
        setAuthenticatedPriorityToken(MOCK_PRIORITY_TOKEN),
      );
      expect(state.priorityTokensByAddress).toEqual(
        initialState.priorityTokensByAddress,
      );
      expect(state.authenticatedPriorityTokenLastFetched).toEqual(
        initialState.authenticatedPriorityTokenLastFetched,
      );
    });
  });

  describe('setAuthenticatedPriorityTokenLastFetched', () => {
    it('sets authenticatedPriorityTokenLastFetched to a date', () => {
      const testDate = new Date('2025-08-21T10:00:00Z');
      const state = cardReducer(
        initialState,
        setAuthenticatedPriorityTokenLastFetched(testDate),
      );
      expect(state.authenticatedPriorityTokenLastFetched).toEqual(testDate);
    });

    it('sets authenticatedPriorityTokenLastFetched to a string', () => {
      const testDateString = '2025-08-21T10:00:00Z';
      const state = cardReducer(
        initialState,
        setAuthenticatedPriorityTokenLastFetched(testDateString),
      );
      expect(state.authenticatedPriorityTokenLastFetched).toEqual(
        testDateString,
      );
    });

    it('sets authenticatedPriorityTokenLastFetched to null', () => {
      const currentState: CardSliceState = {
        ...initialState,
        authenticatedPriorityTokenLastFetched: new Date(),
      };
      const state = cardReducer(
        currentState,
        setAuthenticatedPriorityTokenLastFetched(null),
      );
      expect(state.authenticatedPriorityTokenLastFetched).toBeNull();
    });

    it('updates existing authenticatedPriorityTokenLastFetched', () => {
      const oldDate = new Date('2025-08-21T10:00:00Z');
      const newDate = new Date('2025-08-21T11:00:00Z');
      const currentState: CardSliceState = {
        ...initialState,
        authenticatedPriorityTokenLastFetched: oldDate,
      };
      const state = cardReducer(
        currentState,
        setAuthenticatedPriorityTokenLastFetched(newDate),
      );
      expect(state.authenticatedPriorityTokenLastFetched).toEqual(newDate);
    });

    it('does not affect other state properties', () => {
      const testDate = new Date('2025-08-21T10:00:00Z');
      const state = cardReducer(
        initialState,
        setAuthenticatedPriorityTokenLastFetched(testDate),
      );
      expect(state.lastFetchedByAddress).toEqual(
        initialState.lastFetchedByAddress,
      );
      expect(state.authenticatedPriorityToken).toEqual(
        initialState.authenticatedPriorityToken,
      );
    });
  });
});

describe('verifyCardAuthentication Async Thunk', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyCardAuthentication.fulfilled', () => {
    it('updates isAuthenticated and userCardLocation on success', () => {
      const mockPayload = {
        isAuthenticated: true,
        userCardLocation: 'us' as const,
      };
      const action = {
        type: verifyCardAuthentication.fulfilled.type,
        payload: mockPayload,
      };
      const state = cardReducer(initialState, action);

      expect(state.isAuthenticated).toBe(true);
      expect(state.userCardLocation).toBe('us');
    });

    it('handles international location on success', () => {
      const mockPayload = {
        isAuthenticated: true,
        userCardLocation: 'international' as const,
      };
      const action = {
        type: verifyCardAuthentication.fulfilled.type,
        payload: mockPayload,
      };
      const state = cardReducer(initialState, action);

      expect(state.isAuthenticated).toBe(true);
      expect(state.userCardLocation).toBe('international');
    });

    it('handles false authentication status', () => {
      const mockPayload = {
        isAuthenticated: false,
        userCardLocation: 'international' as const,
      };
      const action = {
        type: verifyCardAuthentication.fulfilled.type,
        payload: mockPayload,
      };
      const state = cardReducer(initialState, action);

      expect(state.isAuthenticated).toBe(false);
      expect(state.userCardLocation).toBe('international');
    });

    it('defaults to international when userCardLocation is null', () => {
      const mockPayload = {
        isAuthenticated: true,
        userCardLocation: null,
      };
      const action = {
        type: verifyCardAuthentication.fulfilled.type,
        payload: mockPayload,
      };
      const state = cardReducer(initialState, action);

      expect(state.isAuthenticated).toBe(true);
      expect(state.userCardLocation).toBe('international');
    });

    it('defaults to international when userCardLocation is undefined', () => {
      const mockPayload = {
        isAuthenticated: true,
      };
      const action = {
        type: verifyCardAuthentication.fulfilled.type,
        payload: mockPayload,
      };
      const state = cardReducer(initialState, action);

      expect(state.isAuthenticated).toBe(true);
      expect(state.userCardLocation).toBe('international');
    });

    it('does not affect other state properties', () => {
      const mockPayload = {
        isAuthenticated: true,
        userCardLocation: 'us' as const,
      };
      const action = {
        type: verifyCardAuthentication.fulfilled.type,
        payload: mockPayload,
      };
      const state = cardReducer(initialState, action);

      expect(state.cardholderAccounts).toEqual(initialState.cardholderAccounts);
      expect(state.geoLocation).toEqual(initialState.geoLocation);
      expect(state.isLoaded).toEqual(initialState.isLoaded);
    });
  });

  describe('verifyCardAuthentication.rejected', () => {
    it('resets authentication state on error', () => {
      const currentState: CardSliceState = {
        ...initialState,
        isAuthenticated: true,
        userCardLocation: 'us',
        authenticatedPriorityToken: MOCK_PRIORITY_TOKEN,
        authenticatedPriorityTokenLastFetched: new Date('2025-08-21T10:00:00Z'),
      };

      const action = {
        type: verifyCardAuthentication.rejected.type,
        error: {
          message: 'Authentication failed',
        },
      };
      const state = cardReducer(currentState, action);

      expect(state.isAuthenticated).toBe(false);
      expect(state.userCardLocation).toBe('international');
      expect(state.authenticatedPriorityToken).toBeNull();
      expect(state.authenticatedPriorityTokenLastFetched).toBeNull();
    });

    it('handles rejection from initial state', () => {
      const action = {
        type: verifyCardAuthentication.rejected.type,
        error: {
          message: 'Authentication failed',
        },
      };
      const state = cardReducer(initialState, action);

      expect(state.isAuthenticated).toBe(false);
      expect(state.userCardLocation).toBe('international');
      expect(state.authenticatedPriorityToken).toBeNull();
      expect(state.authenticatedPriorityTokenLastFetched).toBeNull();
    });

    it('does not affect other state properties', () => {
      const currentState: CardSliceState = {
        ...initialState,
        isAuthenticated: true,
        cardholderAccounts: ['0x123'],
        geoLocation: 'US',
        isLoaded: true,
      };

      const action = {
        type: verifyCardAuthentication.rejected.type,
        error: {
          message: 'Authentication failed',
        },
      };
      const state = cardReducer(currentState, action);

      expect(state.cardholderAccounts).toEqual(['0x123']);
      expect(state.geoLocation).toEqual('US');
      expect(state.isLoaded).toBe(true);
    });
  });
});

describe('Authenticated Priority Token Selectors', () => {
  describe('selectCardPriorityToken with authenticated=true', () => {
    it('returns authenticatedPriorityToken when authenticated', () => {
      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      const selector = selectCardPriorityToken(true);
      expect(selector(mockRootState)).toEqual(MOCK_PRIORITY_TOKEN);
    });

    it('returns null when no authenticatedPriorityToken exists', () => {
      const mockRootState = {
        card: EMPTY_CARD_STATE_MOCK,
      } as unknown as RootState;

      const selector = selectCardPriorityToken(true);
      expect(selector(mockRootState)).toBeNull();
    });

    it('ignores address parameter when authenticated', () => {
      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      const selector = selectCardPriorityToken(true, '0xDifferentAddress');
      expect(selector(mockRootState)).toEqual(MOCK_PRIORITY_TOKEN);
    });

    it('returns authenticatedPriorityToken even when address has different token', () => {
      const differentToken: CardTokenAllowance = {
        ...MOCK_PRIORITY_TOKEN,
        symbol: 'DAI',
      };

      const stateWithDifferentTokens: CardSliceState = {
        ...CARD_STATE_MOCK,
        authenticatedPriorityToken: differentToken,
      };

      const mockRootState = {
        card: stateWithDifferentTokens,
      } as unknown as RootState;

      const selector = selectCardPriorityToken(true, testAddress);
      expect(selector(mockRootState)).toEqual(differentToken);
      expect(selector(mockRootState)).not.toEqual(MOCK_PRIORITY_TOKEN);
    });
  });

  describe('selectCardPriorityTokenLastFetched with authenticated=true', () => {
    it('returns authenticatedPriorityTokenLastFetched when authenticated', () => {
      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      const selector = selectCardPriorityTokenLastFetched(true);
      expect(selector(mockRootState)).toEqual(new Date('2025-08-21T10:00:00Z'));
    });

    it('returns null when no authenticatedPriorityTokenLastFetched exists', () => {
      const mockRootState = {
        card: EMPTY_CARD_STATE_MOCK,
      } as unknown as RootState;

      const selector = selectCardPriorityTokenLastFetched(true);
      expect(selector(mockRootState)).toBeNull();
    });

    it('ignores address parameter when authenticated', () => {
      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      const selector = selectCardPriorityTokenLastFetched(
        true,
        '0xDifferentAddress',
      );
      expect(selector(mockRootState)).toEqual(new Date('2025-08-21T10:00:00Z'));
    });

    it('handles ISO date strings from redux-persist', () => {
      const stateWithStringDate: CardSliceState = {
        ...CARD_STATE_MOCK,
        authenticatedPriorityTokenLastFetched: '2025-08-21T10:00:00Z',
      };

      const mockRootState = {
        card: stateWithStringDate,
      } as unknown as RootState;

      const selector = selectCardPriorityTokenLastFetched(true);
      expect(selector(mockRootState)).toEqual('2025-08-21T10:00:00Z');
    });
  });

  describe('selectIsCardCacheValid with authenticated=true (30 second window)', () => {
    let dateNowSpy: jest.SpyInstance;

    beforeEach(() => {
      dateNowSpy = jest.spyOn(Date, 'now');
    });

    afterEach(() => {
      dateNowSpy.mockRestore();
    });

    it('returns true when cache is within 30-second window for authenticated', () => {
      // Mock Date.now to return 20 seconds after fetch time
      dateNowSpy.mockReturnValue(new Date('2025-08-21T10:00:20Z').getTime());

      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      const selector = selectIsCardCacheValid(true);
      expect(selector(mockRootState)).toBe(true);
    });

    it('returns false when cache is older than 30 seconds for authenticated', () => {
      // Mock Date.now to return 31 seconds after fetch time
      dateNowSpy.mockReturnValue(new Date('2025-08-21T10:00:31Z').getTime());

      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      const selector = selectIsCardCacheValid(true);
      expect(selector(mockRootState)).toBe(false);
    });

    it('returns false for cache exactly 30 seconds old', () => {
      // Mock Date.now to return exactly 30 seconds after fetch time
      dateNowSpy.mockReturnValue(new Date('2025-08-21T10:00:30Z').getTime());

      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      const selector = selectIsCardCacheValid(true);
      expect(selector(mockRootState)).toBe(false);
    });

    it('returns true for cache 29 seconds old', () => {
      // Mock Date.now to return 29 seconds after fetch time
      dateNowSpy.mockReturnValue(new Date('2025-08-21T10:00:29Z').getTime());

      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      const selector = selectIsCardCacheValid(true);
      expect(selector(mockRootState)).toBe(true);
    });

    it('returns false when no authenticatedPriorityTokenLastFetched exists', () => {
      dateNowSpy.mockReturnValue(new Date('2025-08-21T10:00:20Z').getTime());

      const mockRootState = {
        card: EMPTY_CARD_STATE_MOCK,
      } as unknown as RootState;

      const selector = selectIsCardCacheValid(true);
      expect(selector(mockRootState)).toBe(false);
    });

    it('handles ISO date strings from redux-persist for authenticated', () => {
      // Mock Date.now to return 20 seconds after fetch time
      dateNowSpy.mockReturnValue(new Date('2025-08-21T10:00:20Z').getTime());

      const stateWithStringDate: CardSliceState = {
        ...CARD_STATE_MOCK,
        authenticatedPriorityTokenLastFetched: '2025-08-21T10:00:00Z',
      };

      const mockRootState = {
        card: stateWithStringDate,
      } as unknown as RootState;

      const selector = selectIsCardCacheValid(true);
      expect(selector(mockRootState)).toBe(true);
    });

    it('ignores address parameter when authenticated', () => {
      dateNowSpy.mockReturnValue(new Date('2025-08-21T10:00:20Z').getTime());

      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      // Even though address has different lastFetched, should use authenticated
      const selector = selectIsCardCacheValid(true, '0xDifferentAddress');
      expect(selector(mockRootState)).toBe(true);
    });

    it('uses 30-second window for authenticated vs 5-minute for unauthenticated', () => {
      // Mock Date.now to return 2 minutes after fetch time
      dateNowSpy.mockReturnValue(new Date('2025-08-21T10:02:00Z').getTime());

      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      // Authenticated: should be false (> 30 seconds)
      const authenticatedSelector = selectIsCardCacheValid(true);
      expect(authenticatedSelector(mockRootState)).toBe(false);

      // Unauthenticated: should be true (< 5 minutes)
      const unauthenticatedSelector = selectIsCardCacheValid(
        false,
        testAddress,
      );
      expect(unauthenticatedSelector(mockRootState)).toBe(true);
    });
  });
});

import { RootState } from '../../../../reducers';
import cardReducer, {
  CardSliceState,
  selectCardholderAccounts,
  selectIsCardholder,
  loadCardholderAccounts,
  resetCardState,
  initialState,
  setHasViewedCardButton,
  selectHasViewedCardButton,
  selectCardIsLoaded,
  selectDisplayCardButton,
  selectAlwaysShowCardButton,
  setAlwaysShowCardButton,
  selectIsAuthenticatedCard,
  selectUserCardLocation,
  setIsAuthenticatedCard,
  setUserCardLocation,
  verifyCardAuthentication,
  setOnboardingId,
  setContactVerificationId,
  setConsentSetId,
  resetOnboardingState,
  selectOnboardingId,
  selectContactVerificationId,
  selectConsentSetId,
  resetAuthenticatedData,
  selectIsUserInSupportedCardCountry,
} from '.';

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

jest.mock('../../../../selectors/geolocationController', () => ({
  selectGeolocationLocation: jest.fn(),
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
import { selectGeolocationLocation } from '../../../../selectors/geolocationController';

const mockSelectGeolocationLocation =
  selectGeolocationLocation as jest.MockedFunction<
    typeof selectGeolocationLocation
  >;

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

const CARD_STATE_MOCK: CardSliceState = {
  cardholderAccounts: CARDHOLDER_ACCOUNTS_MOCK,
  isDaimoDemo: false,
  isLoaded: true,
  hasViewedCardButton: true,
  alwaysShowCardButton: false,
  isAuthenticated: false,
  userCardLocation: 'international',
  onboarding: {
    onboardingId: null,
    contactVerificationId: null,
    consentSetId: null,
  },
};

const EMPTY_CARD_STATE_MOCK: CardSliceState = {
  cardholderAccounts: [],
  isDaimoDemo: false,
  isLoaded: false,
  hasViewedCardButton: false,
  alwaysShowCardButton: false,
  isAuthenticated: false,
  userCardLocation: 'international',
  onboarding: {
    onboardingId: null,
    contactVerificationId: null,
    consentSetId: null,
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

  describe('selectCardIsLoaded', () => {
    it('returns false by default from initial state', () => {
      const mockRootState = { card: initialState } as unknown as RootState;
      expect(selectCardIsLoaded(mockRootState)).toBe(false);
    });

    it('returns true when isLoaded is true', () => {
      const mockRootState = { card: CARD_STATE_MOCK } as unknown as RootState;
      expect(selectCardIsLoaded(mockRootState)).toBe(true);
    });

    it('returns false when isLoaded is false (initial/loading state)', () => {
      const mockRootState = {
        card: EMPTY_CARD_STATE_MOCK,
      } as unknown as RootState;
      expect(selectCardIsLoaded(mockRootState)).toBe(false);
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
      it('should set cardholder accounts and update state when fulfilled', () => {
        const mockPayload = {
          cardholderAddresses: ['0x123', '0x456'],
        };
        const action = {
          type: loadCardholderAccounts.fulfilled.type,
          payload: mockPayload,
        };
        const state = cardReducer(initialState, action);

        expect(state.cardholderAccounts).toEqual(['0x123', '0x456']);
        expect(state.isLoaded).toBe(true);
      });

      it('should handle empty cardholderAddresses in payload when fulfilled', () => {
        const mockPayload = {
          cardholderAddresses: [],
        };
        const action = {
          type: loadCardholderAccounts.fulfilled.type,
          payload: mockPayload,
        };
        const state = cardReducer(initialState, action);

        expect(state.cardholderAccounts).toEqual([]);
        expect(state.isLoaded).toBe(true);
      });

      it('should handle null cardholderAddresses in payload when fulfilled', () => {
        const mockPayload = {
          cardholderAddresses: null,
        };
        const action = {
          type: loadCardholderAccounts.fulfilled.type,
          payload: mockPayload,
        };
        const state = cardReducer(initialState, action);

        expect(state.cardholderAccounts).toEqual([]);
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
      });
    });
  });

  describe('reducers', () => {
    it('should reset card state', () => {
      const currentState: CardSliceState = {
        cardholderAccounts: ['0x123'],
        isDaimoDemo: false,
        isLoaded: true,
        hasViewedCardButton: true,
        alwaysShowCardButton: true,
        isAuthenticated: false,
        userCardLocation: 'us',
        onboarding: {
          onboardingId: null,
          contactVerificationId: null,
          consentSetId: null,
        },
      };

      const state = cardReducer(currentState, resetCardState());

      expect(state).toEqual(initialState);
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
              contactVerificationId: 'verification-123',
              consentSetId: 'consent-456',
            },
          };
          const state = cardReducer(current, resetOnboardingState());
          expect(state.onboarding).toEqual({
            onboardingId: null,
            contactVerificationId: null,
            consentSetId: null,
          });
          // ensure other parts of state untouched
          expect(state.cardholderAccounts).toEqual(current.cardholderAccounts);
        });

        it('should reset onboarding state when already at initial values', () => {
          const state = cardReducer(initialState, resetOnboardingState());
          expect(state.onboarding).toEqual({
            onboardingId: null,
            contactVerificationId: null,
            consentSetId: null,
          });
        });
      });
    });

    describe('resetAuthenticatedData', () => {
      it('resets isAuthenticated to false', () => {
        const currentState: CardSliceState = {
          ...initialState,
          isAuthenticated: true,
        };

        const state = cardReducer(currentState, resetAuthenticatedData());

        expect(state.isAuthenticated).toBe(false);
      });

      it('preserves userCardLocation when resetting authenticated data', () => {
        const currentState: CardSliceState = {
          ...initialState,
          userCardLocation: 'us',
          isAuthenticated: true,
        };

        const state = cardReducer(currentState, resetAuthenticatedData());

        expect(state.userCardLocation).toBe('us');
        expect(state.isAuthenticated).toBe(false);
      });

      it('does not affect other state properties', () => {
        const currentState: CardSliceState = {
          ...initialState,
          cardholderAccounts: ['0x123'],
          isLoaded: true,
          hasViewedCardButton: true,
          alwaysShowCardButton: true,
          userCardLocation: 'us',
          isAuthenticated: true,
          onboarding: {
            onboardingId: 'test-id',
            contactVerificationId: 'verification-123',
            consentSetId: 'consent-456',
          },
        };

        const state = cardReducer(currentState, resetAuthenticatedData());

        expect(state.isAuthenticated).toBe(false);

        // userCardLocation is preserved (not part of auth data)
        expect(state.userCardLocation).toBe('us');

        // Other state properties remain unchanged
        expect(state.cardholderAccounts).toEqual(['0x123']);
        expect(state.isLoaded).toBe(true);
        expect(state.hasViewedCardButton).toBe(true);
        expect(state.alwaysShowCardButton).toBe(true);
        expect(state.onboarding).toEqual({
          onboardingId: 'test-id',
          contactVerificationId: 'verification-123',
          consentSetId: 'consent-456',
        });
      });

      it('works when authenticated data is already at initial values', () => {
        const state = cardReducer(initialState, resetAuthenticatedData());

        expect(state.userCardLocation).toBe('international');
        expect(state.isAuthenticated).toBe(false);
      });
    });
  });
});

describe('Card Button Display Selectors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectGeolocationLocation.mockReturnValue('US');
  });

  describe('selectIsUserInSupportedCardCountry', () => {
    it('returns true when GeolocationController location is in supported countries', () => {
      mockSelectGeolocationLocation.mockReturnValue('US');
      mockSelectCardSupportedCountries.mockReturnValue({
        US: true,
        GB: true,
      });

      const mockRootState = {
        card: initialState,
      } as unknown as RootState;

      expect(selectIsUserInSupportedCardCountry(mockRootState)).toBe(true);
    });

    it('returns false when geoLocation is not in supported countries', () => {
      mockSelectGeolocationLocation.mockReturnValue('CN');
      mockSelectCardSupportedCountries.mockReturnValue({ US: true });

      const mockRootState = {
        card: initialState,
      } as unknown as RootState;

      expect(selectIsUserInSupportedCardCountry(mockRootState)).toBe(false);
    });

    it('returns false when geoLocation is UNKNOWN', () => {
      mockSelectGeolocationLocation.mockReturnValue('UNKNOWN');
      mockSelectCardSupportedCountries.mockReturnValue({ US: true });

      const mockRootState = {
        card: initialState,
      } as unknown as RootState;

      expect(selectIsUserInSupportedCardCountry(mockRootState)).toBe(false);
    });

    it('returns false when country is explicitly false in supported countries', () => {
      mockSelectGeolocationLocation.mockReturnValue('DE');
      mockSelectCardSupportedCountries.mockReturnValue({
        US: true,
        DE: false,
      });

      const mockRootState = {
        card: initialState,
      } as unknown as RootState;

      expect(selectIsUserInSupportedCardCountry(mockRootState)).toBe(false);
    });

    it('returns false when cardSupportedCountries is empty or missing', () => {
      mockSelectGeolocationLocation.mockReturnValue('US');
      mockSelectCardSupportedCountries.mockReturnValue({});

      const mockRootState = {
        card: initialState,
      } as unknown as RootState;

      expect(selectIsUserInSupportedCardCountry(mockRootState)).toBe(false);
    });
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
      mockSelectGeolocationLocation.mockReturnValue('US');
    });

    it('should return true when alwaysShowCardButton is true', () => {
      mockSelectCardExperimentalSwitch.mockReturnValue(true);
      mockSelectGeolocationLocation.mockReturnValue('XX');

      const stateWithAlwaysShow: CardSliceState = {
        ...initialState,
        alwaysShowCardButton: true,
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
      };

      mockSelectGeolocationLocation.mockReturnValue('XX');
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
      mockSelectGeolocationLocation.mockReturnValue('US');
      mockSelectCardSupportedCountries.mockReturnValue({ US: true });
      mockSelectDisplayCardButtonFeatureFlag.mockReturnValue(true);

      const stateWithGeoLocation: CardSliceState = {
        ...initialState,
        cardholderAccounts: [],
        alwaysShowCardButton: false,
      };

      const mockRootState = {
        card: stateWithGeoLocation,
      } as unknown as RootState;

      expect(selectDisplayCardButton(mockRootState)).toBe(true);
    });

    it('should return false when in supported country but feature flag is disabled', () => {
      mockSelectGeolocationLocation.mockReturnValue('US');
      mockSelectCardSupportedCountries.mockReturnValue({ US: true });
      mockSelectDisplayCardButtonFeatureFlag.mockReturnValue(false);

      const stateWithGeoLocation: CardSliceState = {
        ...initialState,
        cardholderAccounts: [],
        alwaysShowCardButton: false,
      };

      const mockRootState = {
        card: stateWithGeoLocation,
      } as unknown as RootState;

      expect(selectDisplayCardButton(mockRootState)).toBe(false);
    });

    it('should return false when feature flag is enabled but country is not supported', () => {
      mockSelectGeolocationLocation.mockReturnValue('CN');
      mockSelectCardSupportedCountries.mockReturnValue({ US: true });
      mockSelectDisplayCardButtonFeatureFlag.mockReturnValue(true);

      const stateWithUnsupportedGeoLocation: CardSliceState = {
        ...initialState,
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

      const state: CardSliceState = {
        ...initialState,
        cardholderAccounts: [],
        alwaysShowCardButton: false,
      };

      // Test US
      mockSelectGeolocationLocation.mockReturnValue('US');
      let mockRootState = { card: state } as unknown as RootState;
      expect(selectDisplayCardButton(mockRootState)).toBe(true);

      // Test GB
      mockSelectGeolocationLocation.mockReturnValue('GB');
      mockRootState = { card: state } as unknown as RootState;
      expect(selectDisplayCardButton(mockRootState)).toBe(true);

      // Test CA
      mockSelectGeolocationLocation.mockReturnValue('CA');
      mockRootState = { card: state } as unknown as RootState;
      expect(selectDisplayCardButton(mockRootState)).toBe(true);

      // Test DE (explicitly false)
      mockSelectGeolocationLocation.mockReturnValue('DE');
      mockRootState = { card: state } as unknown as RootState;
      expect(selectDisplayCardButton(mockRootState)).toBe(false);
    });

    it('should prioritize alwaysShowCardButton over other conditions', () => {
      mockSelectCardExperimentalSwitch.mockReturnValue(true);
      mockSelectCardSupportedCountries.mockReturnValue({});
      mockSelectDisplayCardButtonFeatureFlag.mockReturnValue(false);
      mockSelectGeolocationLocation.mockReturnValue('XX');

      const state: CardSliceState = {
        ...initialState,
        alwaysShowCardButton: true,
        cardholderAccounts: [],
      };

      const mockRootState = { card: state } as unknown as RootState;

      expect(selectDisplayCardButton(mockRootState)).toBe(true);
    });

    it('should handle UNKNOWN geolocation gracefully', () => {
      mockSelectGeolocationLocation.mockReturnValue('UNKNOWN');
      mockSelectCardSupportedCountries.mockReturnValue({ US: true });
      mockSelectDisplayCardButtonFeatureFlag.mockReturnValue(true);

      const state: CardSliceState = {
        ...initialState,
        cardholderAccounts: [],
        alwaysShowCardButton: false,
      };

      const mockRootState = { card: state } as unknown as RootState;

      expect(selectDisplayCardButton(mockRootState)).toBe(false);
    });

    it('should return true when all three conditions are true', () => {
      mockSelectCardExperimentalSwitch.mockReturnValue(true);
      mockSelectGeolocationLocation.mockReturnValue('US');
      mockSelectCardSupportedCountries.mockReturnValue({ US: true });
      mockSelectDisplayCardButtonFeatureFlag.mockReturnValue(true);
      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        () => mockAccount,
      );
      mockIsEthAccount.mockReturnValue(true);

      const state: CardSliceState = {
        ...initialState,
        alwaysShowCardButton: true,
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

    it('preserves existing userCardLocation when payload has null location', () => {
      const currentState: CardSliceState = {
        ...initialState,
        userCardLocation: 'us',
      };
      const mockPayload = {
        isAuthenticated: true,
        userCardLocation: null,
      };
      const action = {
        type: verifyCardAuthentication.fulfilled.type,
        payload: mockPayload,
      };
      const state = cardReducer(currentState, action);

      expect(state.isAuthenticated).toBe(true);
      expect(state.userCardLocation).toBe('us');
    });

    it('preserves existing userCardLocation when payload has no location', () => {
      const currentState: CardSliceState = {
        ...initialState,
        userCardLocation: 'us',
      };
      const mockPayload = {
        isAuthenticated: true,
      };
      const action = {
        type: verifyCardAuthentication.fulfilled.type,
        payload: mockPayload,
      };
      const state = cardReducer(currentState, action);

      expect(state.isAuthenticated).toBe(true);
      expect(state.userCardLocation).toBe('us');
    });

    it('keeps default userCardLocation when payload has no location and state is default', () => {
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
      expect(state.isLoaded).toEqual(initialState.isLoaded);
    });
  });

  describe('verifyCardAuthentication.rejected', () => {
    it('resets authentication state on error but preserves userCardLocation', () => {
      const currentState: CardSliceState = {
        ...initialState,
        isAuthenticated: true,
        userCardLocation: 'us',
      };

      const action = {
        type: verifyCardAuthentication.rejected.type,
        error: {
          message: 'Authentication failed',
        },
      };
      const state = cardReducer(currentState, action);

      expect(state.isAuthenticated).toBe(false);
      expect(state.userCardLocation).toBe('us');
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
    });

    it('does not affect other state properties', () => {
      const currentState: CardSliceState = {
        ...initialState,
        isAuthenticated: true,
        cardholderAccounts: ['0x123'],
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
      expect(state.isLoaded).toBe(true);
    });
  });
});

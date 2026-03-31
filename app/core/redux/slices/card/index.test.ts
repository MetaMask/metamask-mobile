import { RootState } from '../../../../reducers';
import cardReducer, {
  CardSliceState,
  resetCardState,
  initialState,
  setHasViewedCardButton,
  selectHasViewedCardButton,
  setIsAuthenticatedCard,
  setUserCardLocation,
  setOnboardingId,
  setContactVerificationId,
  setConsentSetId,
  resetOnboardingState,
  selectOnboardingId,
  selectContactVerificationId,
  selectConsentSetId,
  resetAuthenticatedData,
} from '.';

const CARD_STATE_MOCK: CardSliceState = {
  cardholderAccounts: ['0x1234', '0xabcd'],
  isDaimoDemo: false,
  hasViewedCardButton: true,
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
  hasViewedCardButton: false,
  isAuthenticated: false,
  userCardLocation: 'international',
  onboarding: {
    onboardingId: null,
    contactVerificationId: null,
    consentSetId: null,
  },
};

describe('Card Selectors', () => {
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
  describe('reducers', () => {
    it('should reset card state', () => {
      const currentState: CardSliceState = {
        cardholderAccounts: ['0x123'],
        isDaimoDemo: false,
        hasViewedCardButton: true,
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
    });

    describe('setHasViewedCardButton', () => {
      it('should set hasViewedCardButton to true', () => {
        const state = cardReducer(initialState, setHasViewedCardButton(true));
        expect(state.hasViewedCardButton).toBe(true);
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
          hasViewedCardButton: true,
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
        expect(state.userCardLocation).toBe('us');
        expect(state.cardholderAccounts).toEqual(['0x123']);
        expect(state.hasViewedCardButton).toBe(true);
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

describe('Authentication Actions', () => {
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

// Suppress unused variable warnings for state mocks used for type checking only
void CARD_STATE_MOCK;
void EMPTY_CARD_STATE_MOCK;

import { RootState } from '../../../../reducers';
import cardReducer, {
  CardSliceState,
  resetCardState,
  initialState,
  setHasViewedCardButton,
  selectHasViewedCardButton,
  setIsAuthenticatedCard,
  setOnboardingId,
  setContactVerificationId,
  setConsentSetId,
  resetOnboardingState,
  selectOnboardingId,
  selectContactVerificationId,
  selectConsentSetId,
  resetAuthenticatedData,
} from '.';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CARD_STATE_MOCK: CardSliceState = {
  isDaimoDemo: false,
  hasViewedCardButton: true,
  isAuthenticated: false,
  onboarding: {
    onboardingId: null,
    contactVerificationId: null,
    consentSetId: null,
  },
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const EMPTY_CARD_STATE_MOCK: CardSliceState = {
  isDaimoDemo: false,
  hasViewedCardButton: false,
  isAuthenticated: false,
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
        isDaimoDemo: false,
        hasViewedCardButton: true,
        isAuthenticated: false,
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

      it('does not affect other state properties', () => {
        const currentState: CardSliceState = {
          ...initialState,
          hasViewedCardButton: true,
          isAuthenticated: true,
          onboarding: {
            onboardingId: 'test-id',
            contactVerificationId: 'verification-123',
            consentSetId: 'consent-456',
          },
        };

        const state = cardReducer(currentState, resetAuthenticatedData());

        expect(state.isAuthenticated).toBe(false);
        expect(state.hasViewedCardButton).toBe(true);
        expect(state.onboarding).toEqual({
          onboardingId: 'test-id',
          contactVerificationId: 'verification-123',
          consentSetId: 'consent-456',
        });
      });

      it('works when authenticated data is already at initial values', () => {
        const state = cardReducer(initialState, resetAuthenticatedData());

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
      expect(state.hasViewedCardButton).toEqual(
        initialState.hasViewedCardButton,
      );
    });
  });
});

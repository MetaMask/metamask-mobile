import { RootState } from '../reducers';
import {
  selectCardSelectedCountry,
  selectCardActiveProviderId,
  selectIsCardAuthenticated,
  selectCardholderAccounts,
} from './cardController';
import type { CardControllerState } from '../core/Engine/controllers/card-controller/types';

const createMockRootState = (
  overrides: Partial<CardControllerState> = {},
): RootState =>
  ({
    engine: {
      backgroundState: {
        CardController: {
          selectedCountry: null,
          activeProviderId: null,
          isAuthenticated: false,
          cardholderAccounts: [],
          providerData: {},
          ...overrides,
        },
      },
    },
  }) as unknown as RootState;

describe('CardController selectors', () => {
  describe('selectCardSelectedCountry', () => {
    it('returns null when no country is selected', () => {
      const state = createMockRootState();

      expect(selectCardSelectedCountry(state)).toBeNull();
    });

    it('returns the selected country', () => {
      const state = createMockRootState({ selectedCountry: 'US' });

      expect(selectCardSelectedCountry(state)).toBe('US');
    });
  });

  describe('selectCardActiveProviderId', () => {
    it('returns null when no provider is active', () => {
      const state = createMockRootState();

      expect(selectCardActiveProviderId(state)).toBeNull();
    });

    it('returns the active provider ID', () => {
      const state = createMockRootState({ activeProviderId: 'baanx' });

      expect(selectCardActiveProviderId(state)).toBe('baanx');
    });
  });

  describe('selectIsCardAuthenticated', () => {
    it('returns false by default', () => {
      const state = createMockRootState();

      expect(selectIsCardAuthenticated(state)).toBe(false);
    });

    it('returns true when authenticated', () => {
      const state = createMockRootState({ isAuthenticated: true });

      expect(selectIsCardAuthenticated(state)).toBe(true);
    });
  });

  describe('selectCardholderAccounts', () => {
    it('returns empty array by default', () => {
      const state = createMockRootState();

      expect(selectCardholderAccounts(state)).toStrictEqual([]);
    });

    it('returns cardholder accounts', () => {
      const accounts = ['eip155:1:0xabc', 'eip155:1:0xdef'];
      const state = createMockRootState({ cardholderAccounts: accounts });

      expect(selectCardholderAccounts(state)).toStrictEqual(accounts);
    });
  });

  describe('when CardController state is undefined', () => {
    it('returns fallback values', () => {
      const state = {
        engine: { backgroundState: {} },
      } as unknown as RootState;

      expect(selectCardSelectedCountry(state)).toBeNull();
      expect(selectCardActiveProviderId(state)).toBeNull();
      expect(selectIsCardAuthenticated(state)).toBe(false);
      expect(selectCardholderAccounts(state)).toStrictEqual([]);
    });
  });
});

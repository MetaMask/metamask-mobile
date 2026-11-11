import {
  BOTTOM_SHEET_NAMES,
  MONEY_BUTTON_INTENTS,
  SCREEN_NAMES,
} from '../constants/moneyEvents';
import {
  getMoneyEntryDecision,
  MONEY_ENTRIES,
  type MoneyEntryContext,
} from './moneyEntryDecision';

const createContext = (
  overrides: Partial<MoneyEntryContext> = {},
): MoneyEntryContext => ({
  accessBlockReason: undefined,
  isOnboardingRedirectNeeded: false,
  ...overrides,
});

describe('getMoneyEntryDecision', () => {
  it.each([
    ['home', SCREEN_NAMES.MONEY_HOME, MONEY_BUTTON_INTENTS.GO_TO_MONEY_HOME],
    ['deposit', SCREEN_NAMES.MONEY_DEPOSIT, MONEY_BUTTON_INTENTS.ADD_MONEY],
  ] as const)(
    'returns the requested %s entry when access is available',
    (entry, redirectTarget, buttonIntent) => {
      const result = getMoneyEntryDecision(entry, createContext());

      expect(result).toStrictEqual({
        destination: entry,
        redirect_target: redirectTarget,
        button_intent: buttonIntent,
      });
    },
  );

  it('routes a geo-blocked home entry to the geo-block sheet', () => {
    const result = getMoneyEntryDecision(
      'home',
      createContext({ accessBlockReason: 'geo_blocked' }),
    );

    expect(result).toStrictEqual({
      destination: 'geoBlockSheet',
      redirect_target: BOTTOM_SHEET_NAMES.MONEY_GEO_BLOCK_SHEET,
      button_intent: MONEY_BUTTON_INTENTS.GO_TO_MONEY_HOME,
    });
  });

  it('routes a feature-disabled deposit entry to the disabled notice', () => {
    const result = getMoneyEntryDecision(
      'deposit',
      createContext({ accessBlockReason: 'feature_disabled' }),
    );

    expect(result).toStrictEqual({
      destination: 'featureDisabled',
      redirect_target: BOTTOM_SHEET_NAMES.MONEY_DEEPLINK_MODAL,
      button_intent: MONEY_BUTTON_INTENTS.ADD_MONEY,
    });
  });

  it('prioritizes access blocking over onboarding', () => {
    const result = getMoneyEntryDecision(
      'deposit',
      createContext({
        accessBlockReason: 'geo_blocked',
        isOnboardingRedirectNeeded: true,
      }),
    );

    expect(result.destination).toBe('geoBlockSheet');
    expect(result.redirect_target).toBe(
      BOTTOM_SHEET_NAMES.MONEY_GEO_BLOCK_SHEET,
    );
  });

  it('routes an accessible unseen entry to onboarding', () => {
    const result = getMoneyEntryDecision(
      'deposit',
      createContext({ isOnboardingRedirectNeeded: true }),
    );

    expect(result).toStrictEqual({
      destination: 'onboarding',
      redirect_target: SCREEN_NAMES.MONEY_ONBOARDING,
      button_intent: MONEY_BUTTON_INTENTS.GO_TO_MONEY_ONBOARDING,
    });
  });

  it('keeps entry metadata aligned with navigation destinations', () => {
    expect(MONEY_ENTRIES).toStrictEqual({
      home: {
        redirect_target: SCREEN_NAMES.MONEY_HOME,
        button_intent: MONEY_BUTTON_INTENTS.GO_TO_MONEY_HOME,
      },
      deposit: {
        redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
        button_intent: MONEY_BUTTON_INTENTS.ADD_MONEY,
      },
    });
  });
});

import {
  BOTTOM_SHEET_NAMES,
  MONEY_BUTTON_INTENTS,
  SCREEN_NAMES,
} from '../constants/moneyEvents';
import type { MoneyAccountAccessBlockReason } from '../utils/moneyAccountAccess';

export const MONEY_ENTRIES = {
  home: {
    redirect_target: SCREEN_NAMES.MONEY_HOME,
    button_intent: MONEY_BUTTON_INTENTS.GO_TO_MONEY_HOME,
  },
  deposit: {
    redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
    button_intent: MONEY_BUTTON_INTENTS.ADD_MONEY,
  },
} as const;

export type MoneyEntry = keyof typeof MONEY_ENTRIES;

export interface MoneyEntryContext {
  accessBlockReason: MoneyAccountAccessBlockReason | undefined;
  isOnboardingRedirectNeeded: boolean;
}

export interface MoneyEntryDecision {
  destination: MoneyEntry | 'featureDisabled' | 'geoBlockSheet' | 'onboarding';
  redirect_target:
    | (typeof SCREEN_NAMES)[keyof typeof SCREEN_NAMES]
    | (typeof BOTTOM_SHEET_NAMES)[keyof typeof BOTTOM_SHEET_NAMES];
  button_intent: MONEY_BUTTON_INTENTS;
}

/**
 * Resolves the first destination for a Money entry and its matching analytics.
 *
 * Access policy is evaluated before onboarding so blocked users never enter
 * onboarding or a Money transaction flow.
 */
export const getMoneyEntryDecision = (
  entry: MoneyEntry,
  { accessBlockReason, isOnboardingRedirectNeeded }: MoneyEntryContext,
): MoneyEntryDecision => {
  if (accessBlockReason === 'feature_disabled') {
    return {
      destination: 'featureDisabled',
      // TODO: MONEY_DEEPLINK_MODAL is generic. It would be better to have a dedicated sheet for feature disabled.
      redirect_target: BOTTOM_SHEET_NAMES.MONEY_DEEPLINK_MODAL,
      button_intent: MONEY_ENTRIES[entry].button_intent,
    };
  }

  if (accessBlockReason === 'geo_blocked') {
    return {
      destination: 'geoBlockSheet',
      redirect_target: BOTTOM_SHEET_NAMES.MONEY_GEO_BLOCK_SHEET,
      button_intent: MONEY_ENTRIES[entry].button_intent,
    };
  }

  if (isOnboardingRedirectNeeded) {
    return {
      destination: 'onboarding',
      redirect_target: SCREEN_NAMES.MONEY_ONBOARDING,
      button_intent: MONEY_BUTTON_INTENTS.GO_TO_MONEY_ONBOARDING,
    };
  }

  return {
    destination: entry,
    ...MONEY_ENTRIES[entry],
  };
};

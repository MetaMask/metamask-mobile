/* eslint-disable @typescript-eslint/consistent-type-definitions */

/**
 * Events for the Money account feature.
 */
export enum SCREEN_NAMES {
  WALLET_HOME = 'wallet_home',
  MONEY_HOME = 'money_home',
  MONEY_ONBOARDING = 'money_onboarding',
}

export enum SHEET_NAMES {
  MONEY_ADD_MONEY_SHEET = 'money_add_money_sheet',
}

export enum COMPONENT_NAMES {
  MONEY_BALANCE_CARD = 'money_balance_card',
  HOME_TAB = 'home_tab',
}

export enum REDIRECT_TARGETS {
  SCREEN = 'screen',
  BOTTOM_SHEET = 'bottom_sheet',
}

// TODO: Breakout
// TODO: Add js doc comments for types below.
/**
 * Properties for tracking location-based events.
 * screen_name: The name of the screen the event occurred on.
 * component_name: The name of the component the event occurred on.
 */
export type MoneyLocationEventProperties = {
  screen_name: SCREEN_NAMES;
  component_name: COMPONENT_NAMES;
};

export type MoneyCardEventProperties = {
  is_card_holder: boolean;
  is_card_linked_to_money_account: boolean;
};

type MoneyFundedEventProperties = {
  is_account_funded: boolean;
};

export type MoneyRedirectEventProperties = {
  redirect_target_type: REDIRECT_TARGETS;
  redirect_target: SCREEN_NAMES | SHEET_NAMES;
};

/**
 * Base properties for all Money events.
 */
export type MoneyBaseEventProperties = Partial<MoneyLocationEventProperties> &
  MoneyCardEventProperties &
  MoneyFundedEventProperties;

export type MoneyButtonEventProperties = Partial<MoneyLocationEventProperties> &
  Partial<MoneyRedirectEventProperties> & {
    label_en: string;
    label_localized: string;
  };

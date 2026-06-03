/* eslint-disable @typescript-eslint/consistent-type-definitions */

/**
 * Events for the Money account feature.
 */
export enum SCREEN_NAMES {
  WALLET_HOME = 'wallet_home',
  MONEY_HOME = 'money_home',
  MONEY_ONBOARDING = 'money_onboarding',
  CARD_HOME = 'card_home',
}

export enum SHEET_NAMES {
  MONEY_ADD_MONEY_SHEET = 'money_add_money_sheet',
  MONEY_TRANSFER_MONEY_SHEET = 'money_transfer_money_sheet',
}

export enum COMPONENT_NAMES {
  MONEY_BALANCE_CARD = 'money_balance_card',
  HOME_TAB = 'home_tab',
  MONEY_ACTION_BUTTON_ROW = 'money_action_button_row',
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

// TODO: Breakout into a utility types file if needed. Remove if not needed before opening PR.
type XOR<A, B> =
  | (A & { [K in keyof B]?: never })
  | (B & { [K in keyof A]?: never });

export type MoneyButtonEventProperties = Partial<MoneyLocationEventProperties> &
  Partial<MoneyRedirectEventProperties> & {
    label_en: string;
    label_localized: string;
    /** 1-based index of the button position in a button row. */
    button_position?: number;
    /** Number of buttons in the button row. */
    button_row_button_count?: number;
  };

export enum MONEY_ONBOARDING_EVENT_TYPES {
  STEP_VIEWED = 'step_viewed',
  COMPLETED = 'completed',
  EXITED = 'exited',
}

export type MoneyOnboardingEventProperties = {
  type: MONEY_ONBOARDING_EVENT_TYPES;
  step: number;
  step_title: string;
  total_steps: number;
};

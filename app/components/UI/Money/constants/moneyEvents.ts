/* eslint-disable @typescript-eslint/consistent-type-definitions */

/**
 * Events for the Money account feature.
 */
export enum SCREEN_NAMES {
  WALLET_HOME = 'wallet_home',
  MONEY_HOME = 'money_home',
  MONEY_ONBOARDING = 'money_onboarding',
  CARD_HOME = 'card_home',
  MONEY_DEPOSIT = 'money_deposit',
  MONEY_HOW_IT_WORKS = 'money_how_it_works',
  MONEY_ACTIVITY = 'money_activity',
  MONEY_POTENTIAL_EARNINGS = 'money_potential_earnings',
}

export enum BOTTOM_SHEET_NAMES {
  MONEY_ADD_MONEY_SHEET = 'money_add_money_sheet',
  MONEY_TRANSFER_MONEY_SHEET = 'money_transfer_money_sheet',
  CARD_AUTH_SHEET = 'card_auth_sheet',
  CARD_LINK_SHEET = 'card_link_sheet',
  MONEY_APY_INFO_SHEET = 'money_apy_info_sheet',
  MONEY_EARNINGS_INFO_SHEET = 'money_earnings_info_sheet',
}

export enum COMPONENT_NAMES {
  MONEY_BALANCE_CARD = 'money_balance_card',
  MONEY_BALANCE_SUMMARY = 'money_balance_summary',
  HOME_TAB = 'home_tab',
  MONEY_ACTION_BUTTON_ROW = 'money_action_button_row',
  RIVE_ONBOARDING_STEPPER = 'rive_onboarding_stepper',
  /** The Stepper Card component on Money Home screen (add funds, get/link card). */
  MONEY_ONBOARDING_CARD = 'money_onboarding_card',
  MONEY_ESTIMATED_EARNINGS = 'money_estimated_earnings',
  MONEY_METAMASK_CARD = 'money_metamask_card',
  MONEY_POTENTIAL_EARNINGS_HEADER = 'money_potential_earnings_header',
  MONEY_ACTIVITY_HEADER = 'money_activity_header',
  MONEY_HOW_IT_WORKS_HEADER = 'money_how_it_works_header',
  MONEY_CARD_SECTION_HEADER = 'money_card_section_header',
}

export enum REDIRECT_TARGETS {
  SCREEN = 'screen',
  BOTTOM_SHEET = 'bottom_sheet',
}

// TODO: Breakout types
/**
 * Properties for tracking location-based events.
 * screen_name: The name of the screen the event occurred on.
 * component_name: The name of the component the event occurred on.
 * bottom_sheet_name: The name of the bottom sheet the event occurred on.
 */
// TODO: Try to simplify the need for bottom_sheet_name and component_name.
// Maybe just use surface_name and surface_type?
export type MoneyLocationEventProperties = {
  screen_name: SCREEN_NAMES;
  bottom_sheet_name: BOTTOM_SHEET_NAMES;
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
  redirect_target: SCREEN_NAMES | BOTTOM_SHEET_NAMES;
};

export type MoneySurfaceClickedEventProperties = MoneyRedirectEventProperties &
  Partial<MoneyLocationEventProperties>;

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

// TODO: Reminder to rename this to MoneyButtonClickedEventProperties. Do the same for all event types in this file.
export type MoneyButtonEventProperties = Partial<
  Pick<MoneyLocationEventProperties, 'component_name'>
> &
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
  STEP_BUTTON_CLICKED = 'step_button_clicked',
  COMPLETED = 'completed',
}

export enum MONEY_ONBOARDING_STEP_ACTIONS {
  // Generic actions
  VIEWED = 'viewed',
  CONTINUED = 'continued',
  SKIPPED = 'skipped',
  EXITED = 'exited',
  COMPLETED = 'completed',

  // Transaction actions
  DEPOSIT_INITIATED = 'deposit_initiated',

  // Card actions
  GET_CARD = 'get_card',
  LINK_CARD = 'link_card',
}

export type MoneyOnboardingEventProperties =
  Partial<MoneyRedirectEventProperties> & {
    step: number;
    step_title: string;
    step_action?: MONEY_ONBOARDING_STEP_ACTIONS;
    total_steps: number;
  };

export enum MONEY_TOOLTIP_NAMES {
  ESTIMATED_EARNINGS = 'estimated_earnings',
  APY = 'apy',
}

export enum MONEY_TOOLTIP_TYPES {
  INFO = 'info',
}

export type MoneyTooltipEventProperties =
  Partial<MoneyLocationEventProperties> & {
    tooltip_name: MONEY_TOOLTIP_NAMES;
    tooltip_type: MONEY_TOOLTIP_TYPES;
  };

export enum MONEY_SURFACE_TYPES {
  SCREEN = 'screen',
  BOTTOM_SHEET = 'bottom_sheet',
  COMPONENT = 'component',
}

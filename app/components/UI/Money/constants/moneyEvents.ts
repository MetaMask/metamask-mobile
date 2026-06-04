/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { METAMASK_SUPPORT_URL } from '../../../../constants/urls';
import AppConstants from '../../../../core/AppConstants';

/**
 * Events for the Money account feature.
 */
export enum SCREEN_NAMES {
  WALLET_HOME = 'wallet_home',
  MONEY_HOME = 'money_home',
  MONEY_ONBOARDING = 'money_onboarding',
  CARD_HOME = 'card_home',
  MONEY_DEPOSIT = 'money_deposit',
  // Used for Money account withdrawals
  MONEY_TRANSFER = 'money_transfer',
  MONEY_HOW_IT_WORKS = 'money_how_it_works',
  MONEY_ACTIVITY = 'money_activity',
  MONEY_POTENTIAL_EARNINGS = 'money_potential_earnings',
  ASSET_OVERVIEW = 'asset_overview',
}

export enum BOTTOM_SHEET_NAMES {
  MONEY_ADD_MONEY_SHEET = 'money_add_money_sheet',
  MONEY_TRANSFER_MONEY_SHEET = 'money_transfer_money_sheet',
  CARD_AUTH_SHEET = 'card_auth_sheet',
  CARD_LINK_SHEET = 'card_link_sheet',
  MONEY_APY_INFO_SHEET = 'money_apy_info_sheet',
  MONEY_EARNINGS_INFO_SHEET = 'money_earnings_info_sheet',
  MONEY_EARN_CRYPTO_INFO_SHEET = 'money_earn_crypto_info_sheet',
  MONEY_MORE_SHEET = 'money_more_sheet',
}

// Not using enum because we want to use existing URL constants.
export const MONEY_URLS = {
  MUSD_LEARN_MORE: AppConstants.URLS.MUSD_LEARN_MORE,
  METAMASK_SUPPORT: METAMASK_SUPPORT_URL,
} as const;

export type MONEY_URLS = (typeof MONEY_URLS)[keyof typeof MONEY_URLS];

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

  MONEY_MUSD_TOKEN_ROW = 'money_musd_token_row',
  MONEY_FOOTER = 'money_footer',
  MONEY_CONDENSED_INFO_CARDS = 'money_condensed_info_cards',
  MONEY_CONDENSED_INFO_CARDS_HOW_IT_WORKS = 'money_condensed_info_cards_how_it_works',
  MONEY_CONDENSED_INFO_CARDS_MUSD = 'money_condensed_info_cards_musd',
  MONEY_CONDENSED_INFO_CARDS_WHAT_YOU_GET = 'money_condensed_info_cards_what_you_get',
  MONEY_WHAT_YOU_GET = 'money_what_you_get',
  MONEY_MORE = 'money_more',
  MONEY_MORE_SHEET_HOW_IT_WORKS = 'money_more_sheet_how_it_works',
  MONEY_MORE_SHEET_WHAT_YOU_GET = 'money_more_sheet_what_you_get',
  MONEY_MORE_SHEET_CONTACT_SUPPORT = 'money_more_sheet_contact_support',
  MONEY_POTENTIAL_EARNINGS = 'money_potential_earnings',
  MONEY_POTENTIAL_EARNINGS_TOKEN_ROW = 'money_potential_earnings_token_row',
  MONEY_ADD_MONEY_SHEET_CONVERT_CRYPTO = 'money_add_money_sheet_convert_crypto',
  MONEY_ADD_MONEY_SHEET_DEPOSIT_FUNDS = 'money_add_money_sheet_deposit_funds',
  MONEY_ADD_MONEY_SHEET_MOVE_MUSD = 'money_add_money_sheet_move_musd',
  MONEY_TRANSFER_MONEY_SHEET_BETWEEN_ACCOUNTS = 'money_transfer_money_sheet_between_accounts',
  MONEY_TRANSFER_MONEY_SHEET_PERPS_ACCOUNT = 'money_transfer_money_sheet_perps_account',
  MONEY_TRANSFER_MONEY_SHEET_PREDICTIONS_ACCOUNT = 'money_transfer_money_sheet_predictions_account',
}

export enum REDIRECT_TARGETS_TYPES {
  SCREEN = 'screen',
  BOTTOM_SHEET = 'bottom_sheet',
  EXTERNAL_BROWSER = 'external_browser',
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
  redirect_target_type: REDIRECT_TARGETS_TYPES;
  redirect_target: SCREEN_NAMES | BOTTOM_SHEET_NAMES | MONEY_URLS;
};

export type MoneySurfaceClickedEventProperties = MoneyRedirectEventProperties &
  Partial<MoneyLocationEventProperties>;

export type MoneyTokenSurfaceClickedEventProperties =
  MoneySurfaceClickedEventProperties & TokenRowEventProperties;

/**
 * Base properties for all Money events.
 */
export type MoneyBaseEventProperties = Partial<MoneyLocationEventProperties> &
  MoneyCardEventProperties &
  MoneyFundedEventProperties;

/**
 * The intent of the button that was clicked.
 * Identifies the intended action of the button independent of the button's label or component it lives in.
 */
export enum MONEY_BUTTON_INTENTS {
  ADD_MONEY = 'add_money',
  GET_STARTED = 'get_started',
  GO_TO_MONEY_HOME = 'go_to_money_home',
  TRANSFER_MONEY = 'transfer_money',
  LINK_CARD = 'link_card',
  GET_CARD = 'get_card',
  MANAGE_CARD = 'manage_card',
  CARD_AUTH = 'card_auth',
  LEARN_MORE = 'learn_more',
  OPEN_MORE_MENU = 'open_more_menu',
  VIEW_ALL = 'view_all',
}

export enum MONEY_BUTTON_TYPES {
  TEXT = 'text',
  ICON = 'icon',
}

type TokenRowEventProperties = {
  token_symbol: string;
  token_index: number;
  token_chain_id: string;
  token_count: number;
};

export type MoneyTokenRowButtonClickedEventProperties =
  MoneyButtonClickedEventProperties & TokenRowEventProperties;

export type MoneyButtonClickedEventProperties =
  | ({ button_type: MONEY_BUTTON_TYPES.TEXT } & MoneyTextButtonEventProperties)
  | ({
      button_type: MONEY_BUTTON_TYPES.ICON;
    } & MoneyIconButtonClickedEventProperties);

// TODO: Reminder to rename this to MoneyButtonClickedEventProperties. Do the same for all event types in this file.
export type MoneyTextButtonEventProperties = Partial<
  Pick<MoneyLocationEventProperties, 'component_name'>
> &
  Partial<MoneyRedirectEventProperties> & {
    label_en: string;
    label_localized: string;
    button_intent: MONEY_BUTTON_INTENTS;
    /** 1-based index of the button position in a button row. */
    button_position?: number;
    /** Number of buttons in the button row. */
    button_row_button_count?: number;
  };

export type MoneyIconButtonClickedEventProperties = Partial<
  Pick<MoneyLocationEventProperties, 'component_name'>
> &
  Partial<MoneyRedirectEventProperties> & {
    button_intent: MONEY_BUTTON_INTENTS;
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
  EARN_ON_YOUR_CRYPTO = 'earn_on_your_crypto',
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

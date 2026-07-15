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
  MONEY_ACTIVITY_DETAILS = 'money_activity_details',
  MONEY_POTENTIAL_EARNINGS = 'money_potential_earnings',
  MONEY_FIRST_TIME_DEPOSIT = 'money_first_time_deposit',
  RAMPS_BUY = 'ramps_buy',
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
  MONEY_BALANCE_INFO_SHEET = 'money_balance_info_sheet',
  MONEY_GEO_BLOCK_SHEET = 'money_geo_block_sheet',
  MONEY_DEEPLINK_MODAL = 'money_deeplink_modal',
}

export enum REDIRECT_TARGETS_TYPES {
  SCREEN = 'screen',
  BOTTOM_SHEET = 'bottom_sheet',
  EXTERNAL_BROWSER = 'external_browser',
}

// Not using enum because we want to use existing URL constants.
export const MONEY_URLS = {
  MONEY_LANDING: AppConstants.URLS.MONEY_LANDING,
  MUSD_PRICE: AppConstants.URLS.MUSD_PRICE,
  METAMASK_SUPPORT: METAMASK_SUPPORT_URL,
  CARD_FEES: AppConstants.CARD.CARD_FEES_URL,
} as const;

export type MONEY_URLS = (typeof MONEY_URLS)[keyof typeof MONEY_URLS];

export enum MONEY_SURFACE_TYPES {
  SCREEN = 'screen',
  BOTTOM_SHEET = 'bottom_sheet',
  COMPONENT = 'component',
}

export enum COMPONENT_NAMES {
  // — Section Headers —
  MONEY_POTENTIAL_EARNINGS_SECTION_HEADER = 'money_potential_earnings_section_header',
  MONEY_ACTIVITY_SECTION_HEADER = 'money_activity_section_header',
  MONEY_HOW_IT_WORKS_SECTION_HEADER = 'money_how_it_works_section_header',
  MONEY_CARD_SECTION_HEADER = 'money_card_section_header',

  // — Onboarding —
  RIVE_ONBOARDING_STEPPER = 'rive_onboarding_stepper',
  /** The Stepper Card component on Money Home screen (add funds, get/link card). */
  MONEY_ONBOARDING_CARD = 'money_onboarding_card',

  // — Earnings —
  MONEY_ESTIMATED_EARNINGS_SECTION = 'money_estimated_earnings_section',
  MONEY_POTENTIAL_EARNINGS_SECTION = 'money_potential_earnings_section',
  MONEY_POTENTIAL_EARNINGS_SECTION_TOKEN_ROW = 'money_potential_earnings_section_token_row',
  MONEY_POTENTIAL_EARNINGS_TOKEN_ROW = 'money_potential_earnings_token_row',

  // — Activity —
  MONEY_ACTIVITY_SECTION = 'money_activity_section',
  MONEY_ACTIVITY_LIST_ITEM = 'money_activity_list_item',

  // — Activity Filter Buttons —
  MONEY_ACTIVITY_FILTER_ALL = 'money_activity_filter_all',
  MONEY_ACTIVITY_FILTER_DEPOSITS = 'money_activity_filter_deposits',
  MONEY_ACTIVITY_FILTER_TRANSFERS = 'money_activity_filter_transfers',
  MONEY_ACTIVITY_FILTER_PURCHASES = 'money_activity_filter_purchases',

  // — Condensed Info Cards —
  MONEY_CONDENSED_INFO_CARDS_HOW_IT_WORKS = 'money_condensed_info_cards_how_it_works',
  MONEY_CONDENSED_INFO_CARDS_MUSD = 'money_condensed_info_cards_musd',
  MONEY_CONDENSED_INFO_CARDS_WHAT_YOU_GET = 'money_condensed_info_cards_what_you_get',

  // — Add Money Sheet —
  MONEY_ADD_MONEY_SHEET_CONVERT_CRYPTO = 'money_add_money_sheet_convert_crypto',
  MONEY_ADD_MONEY_SHEET_DEPOSIT_FUNDS = 'money_add_money_sheet_deposit_funds',
  MONEY_ADD_MONEY_SHEET_MOVE_MUSD = 'money_add_money_sheet_move_musd',

  // — Transfer Money Sheet —
  MONEY_TRANSFER_MONEY_SHEET_BETWEEN_ACCOUNTS = 'money_transfer_money_sheet_between_accounts',
  MONEY_TRANSFER_MONEY_SHEET_PERPS_ACCOUNT = 'money_transfer_money_sheet_perps_account',
  MONEY_TRANSFER_MONEY_SHEET_PREDICTIONS_ACCOUNT = 'money_transfer_money_sheet_predictions_account',

  // — More Sheet —
  MONEY_MORE_SHEET_HOW_IT_WORKS = 'money_more_sheet_how_it_works',
  MONEY_MORE_SHEET_WHAT_YOU_GET = 'money_more_sheet_what_you_get',
  MONEY_MORE_SHEET_CONTACT_SUPPORT = 'money_more_sheet_contact_support',

  // — Miscellaneous —
  MONEY_WHAT_YOU_GET_SECTION = 'money_what_you_get_section',
  MONEY_MUSD_TOKEN_SECTION = 'money_musd_token_row_section',
  MONEY_BALANCE_CARD = 'money_balance_card',
  MONEY_BALANCE_SUMMARY = 'money_balance_summary',
  MONEY_HOME_TAB = 'money_home_tab',
  MONEY_ACTION_BUTTON_ROW = 'money_action_button_row',
  MONEY_FOOTER = 'money_footer',
  MONEY_CONVERT_CRYPTO_BUTTON = 'money_convert_crypto_button',
  MONEY_MORE = 'money_more',

  // — How It Works / FAQ —
  FAQ_ITEM = 'money_faq_item',
}

/**
 * The intent of the button that was clicked.
 * Identifies the intended action of the button independent of the button's label or component it lives in.
 */
export enum MONEY_BUTTON_INTENTS {
  ADD_MONEY = 'add_money',
  GET_STARTED = 'get_started',
  GO_TO_MONEY_HOME = 'go_to_money_home',
  GO_TO_MONEY_ONBOARDING = 'go_to_money_onboarding',
  TRANSFER_MONEY = 'transfer_money',
  LEARN_MORE = 'learn_more',
  OPEN_MORE_MENU = 'open_more_menu',
  VIEW_ALL = 'view_all',
  FILTER = 'filter',
  CARD_HOME = 'card_home',
  CARD_FEES = 'card_fees',
}

export enum MONEY_BUTTON_TYPES {
  TEXT = 'text',
  ICON = 'icon',
}

export enum MONEY_TOOLTIP_NAMES {
  MONEY_BALANCE = 'money_balance',
  ESTIMATED_EARNINGS = 'estimated_earnings',
  EARN_ON_YOUR_CRYPTO = 'earn_on_your_crypto',
  APY = 'apy',
}

export enum MONEY_TOOLTIP_TYPES {
  INFO = 'info',
}

export enum MONEY_ONBOARDING_STEP_ACTIONS {
  // Generic actions
  VIEWED = 'viewed',
  SKIPPED = 'skipped',
  EXITED = 'exited',
  COMPLETED = 'completed',

  // Transaction actions
  DEPOSIT_INITIATED = 'deposit_initiated',

  // Card actions
  GET_CARD = 'get_card',
  LINK_CARD = 'link_card',
}

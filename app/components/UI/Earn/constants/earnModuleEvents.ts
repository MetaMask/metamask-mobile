export enum EARN_MODULE_SCREEN_NAMES {
  WALLET_HOME = 'wallet_home',
  EXPLORE_NOW_TAB = 'explore_now_tab',
  EXPLORE_CRYPTO_TAB = 'explore_crypto_tab',
  EXPLORE = 'explore',
  EXPLORE_SEARCH = 'explore_search',
  EARN_SECTION_LIST_VIEW = 'earn_section_list_view',
}

export enum EARN_MODULE_BOTTOM_SHEET_NAMES {
  STRATEGY_SELECTION_MODAL = 'strategy_selection_modal',
}

export enum EARN_MODULE_ENTRY_POINTS {
  HOMEPAGE = 'homepage',
  EXPLORE = 'explore',
  EXPLORE_NOW_TAB = 'explore_now_tab',
  EXPLORE_CRYPTO_TAB = 'explore_crypto_tab',
  EXPLORE_SEARCH = 'explore_search',
  EARN_SECTION_LIST = 'earn_section_list',
}

export enum EARN_MODULE_BUTTON_TYPES {
  TEXT = 'text',
  ICON = 'icon',
}

export enum EARN_MODULE_BUTTON_INTENTS {
  VIEW_ALL = 'view_all',
  VIEW_MORE = 'view_more',
  RETRY = 'retry',
  CLOSE = 'close',
  GO_BACK = 'go_back',
  DEPOSIT = 'deposit',
}

export enum EARN_MODULE_COMPONENT_NAMES {
  HOMEPAGE_EARN_SECTION = 'homepage_earn_section',
  EARN_SECTION_HEADER = 'earn_section_header',
  EXPLORE_EARN_SECTION = 'explore_earn_section',
  EXPLORE_SEARCH_EARN_SECTION = 'explore_search_earn_section',
  EARN_SEARCH_ROW = 'earn_search_row',
  EARN_SECTION_ASSET_CARD = 'earn_section_asset_card',
  EARN_SECTION_VIEW_MORE_CARD = 'earn_section_view_more_card',
  EARN_SECTION_LIST_ASSET_ROW = 'earn_section_list_asset_row',
  EARN_SEARCH_ASSET_ROW = 'earn_search_asset_row',
  EARN_SECTION_ERROR_RETRY_BUTTON = 'earn_section_error_retry_button',
  EARN_STRATEGY_SELECTION_MODAL_CLOSE_ICON = 'earn_strategy_selection_modal_close_icon',
}

export enum EARN_MODULE_STRATEGY_TYPES {
  MONEY_ACCOUNT_DEPOSIT = 'MONEY_ACCOUNT_DEPOSIT',
  POOLED_STAKING = 'POOLED_STAKING',
  STABLECOIN_LENDING = 'STABLECOIN_LENDING',
  TRX_STAKING = 'TRX_STAKING',
}

export enum EARN_MODULE_REDIRECT_TARGETS {
  EARN_SECTION_LIST_VIEW = 'earn_section_list_view',
  EARN_SEARCH_LIST = 'earn_search_list',
  STRATEGY_SELECTION_BOTTOM_SHEET = 'strategy_selection_bottom_sheet',
  TOKEN_DETAILS = 'token_details',
  // EARN_DEPOSIT = 'earn_deposit',
  POOLED_STAKING_DEPOSIT = 'pooled_staking_deposit',
  STABLECOIN_LENDING_DEPOSIT = 'stablecoin_lending_deposit',
  TRX_STAKING_DEPOSIT = 'trx_staking_deposit',
  MONEY_HOME = 'money_home',
  MONEY_ONBOARDING = 'money_onboarding',
  MONEY_DEPOSIT = 'money_deposit',
}

export enum EARN_MODULE_REDIRECT_TARGET_TYPES {
  SCREEN = 'screen',
  BOTTOM_SHEET = 'bottom_sheet',
  EXTERNAL_BROWSER = 'external_browser',
}

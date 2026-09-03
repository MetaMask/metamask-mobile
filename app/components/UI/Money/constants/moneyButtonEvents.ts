/**
 * The intent of the button that was clicked.
 * Identifies the intended action of the button independent of the button's label or component it lives in.
 */
export enum MONEY_BUTTON_INTENTS {
  ADD_MONEY = 'add_money',
  DISMISS = 'dismiss',
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

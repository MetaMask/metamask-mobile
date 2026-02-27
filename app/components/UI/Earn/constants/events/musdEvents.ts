const EVENT_PROVIDERS = {
  CONSENSYS: 'consensys',
};

const EVENT_LOCATIONS = {
  HOME_SCREEN: 'home',
  TOKEN_LIST_ITEM: 'token_list_item',
  ASSET_OVERVIEW: 'asset_overview',
  CONVERSION_EDUCATION_SCREEN: 'conversion_education_screen',
  CUSTOM_AMOUNT_SCREEN: 'custom_amount_screen', // Single convert screen.
  BUY_SCREEN: 'buy_screen', // Buy mUSD screen.
};

const MUSD_CTA_TYPES = {
  PRIMARY: 'musd_conversion_primary_cta', // "Buy/Get mUSD above asset list"
  SECONDARY: 'musd_conversion_secondary_cta', // "Convert to mUSD" on token list item
  TERTIARY: 'musd_conversion_tertiary_cta', // Asset overview CTA
};

const BUTTON_TYPES = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
};

export const MUSD_EVENTS_CONSTANTS = {
  EVENT_PROVIDERS,
  EVENT_LOCATIONS,
  MUSD_CTA_TYPES,
  BUTTON_TYPES,
};

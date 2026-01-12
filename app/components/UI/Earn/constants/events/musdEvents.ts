const EVENT_PROVIDERS = {
  CONSENSYS: 'consensys',
};

const EVENT_LOCATIONS = {
  HOME_SCREEN: 'home',
  TOKEN_LIST_ITEM: 'token_list_item',
  ASSET_OVERVIEW: 'asset_overview',
};

const MUSD_CTA_TYPES = {
  PRIMARY: 'musd_conversion_primary_cta', // "Buy/Get mUSD above asset list"
  SECONDARY: 'musd_conversion_secondary_cta', // "Convert to mUSD" on token list item
  TERTIARY: 'musd_conversion_tertiary_cta', // Asset overview CTA
};

const ACTION_TYPES = {
  MUSD_CONVERSION: 'musd_conversion',
  MUSD_BUY: 'musd_buy',
};

export const MUSD_EVENTS_CONSTANTS = {
  EVENT_PROVIDERS,
  EVENT_LOCATIONS,
  MUSD_CTA_TYPES,
  ACTION_TYPES,
};

/** Shared navigation params used by both Create and Manage screens. */
export interface PriceAlertRouteParams {
  symbol: string;
  ticker?: string;
  currentPrice: number;
  currentCurrency: string;
  /** CAIP-19 asset identifier, e.g. "eip155:1/slip44:60" or "eip155:1/erc20:0x..." */
  assetId: string;
}

/** Route params for the Create Price Alert screen. */
export interface CreatePriceAlertRouteParams extends PriceAlertRouteParams {
  /** When true the screen was opened from ManagePriceAlertsView; pop 2 on save to return to TokenDetails. */
  fromManage?: boolean;
  /** Thresholds of existing alerts for this asset, used for duplicate-threshold validation. */
  existingThresholds?: number[];
  /** When present the screen is in edit mode; pre-populates threshold/recurring and calls PATCH on save. */
  editingAlert?: PriceAlert;
}

/** API response shape for a single price alert. */
export interface PriceAlert {
  id: string;
  userId: string;
  asset: string;
  threshold: number;
  recurring: boolean;
  active: boolean;
  createdAt: string;
}

export const PRICE_ALERT_QUICK_PERCENTAGES = [-10, -5, 5, 10] as const;

export const CURRENCY_SYMBOLS: Record<string, string> = {
  usd: '$',
  eur: '€',
  gbp: '£',
  jpy: '¥',
  cad: 'CA$',
  aud: 'A$',
};

/** Request body for creating a price alert. */
export interface SaveAlertParams {
  /** CAIP-19 asset identifier, e.g. "eip155:1/slip44:60". */
  asset: string;
  threshold: number;
  recurring: boolean;
}

/** Request body for updating an existing price alert via PATCH. At least one field is required. */
export interface UpdateAlertParams {
  active?: boolean;
  threshold?: number;
  recurring?: boolean;
}

export const CreatePriceAlertTestIds = {
  CONTAINER: 'create-price-alert-container',
  TARGET_PRICE_INPUT: 'create-price-alert-target-price',
  PERCENT_DIFF: 'create-price-alert-percent-diff',
  RECURRING_TOGGLE: 'create-price-alert-recurring-toggle',
  QUICK_PERCENTAGE_PREFIX: 'create-price-alert-quick-percentage',
  SET_ALERT_BUTTON: 'create-price-alert-set-button',
} as const;

export const ManagePriceAlertsTestIds = {
  CONTAINER: 'manage-price-alerts-container',
  LOADING: 'manage-price-alerts-loading',
  ALERT_LIST: 'manage-price-alerts-list',
  ALERT_ITEM_PREFIX: 'manage-price-alerts-item',
  ALERT_EDIT_PREFIX: 'manage-price-alerts-edit',
  ALERT_TOGGLE_PREFIX: 'manage-price-alerts-toggle',
  ALERT_DELETE_PREFIX: 'manage-price-alerts-delete',
  ALERT_DELETE_SPINNER_PREFIX: 'manage-price-alerts-delete-spinner',
  ADD_ALERT_BUTTON: 'manage-price-alerts-add-button',
  EMPTY_STATE: 'manage-price-alerts-empty',
} as const;

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
  /** Thresholds of existing absolute-price alerts for this asset, used for duplicate-threshold validation. */
  existingThresholds?: number[];
  /** Existing percent-change alerts for this asset, used for duplicate-tuple validation. */
  existingPercentAlerts?: PercentChangeAlert[];
  /** When present the screen is in edit mode; pre-populates threshold/recurring and calls PATCH on save. */
  editingAlert?: Alert;
  /** Preselects the type pill when opening a fresh (non-edit) Create screen. */
  initialType?: AlertType;
}

/** Discriminator for the two alert kinds the backend supports. */
export type AlertType = 'absolute_price' | 'percent_change';

/** Rolling window a percent-change alert watches. */
export type AlertPeriod = '1h' | '24h';

/** Order per design: 24hr first. */
export const ALERT_PERIODS = ['24h', '1h'] as const;

/** Direction of the percent-change movement that arms the alert. */
export type AlertDirection = 'up' | 'down';

interface BaseAlert {
  id: string;
  userId: string;
  asset: string;
  threshold: number;
  recurring: boolean;
  active: boolean;
  createdAt: string;
}

/** Absolute-price ("Price target") alert — fires when price crosses `threshold` (a USD amount). */
export interface AbsolutePriceAlert extends BaseAlert {
  type: 'absolute_price';
}

/** Percent-change ("Price change") alert — fires when the rolling `period` signal crosses `threshold`%. */
export interface PercentChangeAlert extends BaseAlert {
  type: 'percent_change';
  period: AlertPeriod;
  direction: AlertDirection;
}

/** Any alert returned by the API. Narrow on `type` before reading period/direction. */
export type Alert = AbsolutePriceAlert | PercentChangeAlert;

export const PRICE_ALERT_QUICK_PERCENTAGES = [-10, -5, 5, 10] as const;

/**
 * Literal values emitted as analytics properties for price-alert events.
 * Centralised so event payloads stay consistent across the Create/Manage
 * views, the notification deeplink handler, and their tests.
 */
export const PriceAlertAnalytics = {
  TYPE: {
    THRESHOLD: 'threshold',
    PERCENT: 'percent',
  },
  INTERACTION_TYPE: {
    CREATED: 'created',
    UPDATED: 'updated',
    DELETED: 'deleted',
  },
} as const;

export const CURRENCY_SYMBOLS: Record<string, string> = {
  usd: '$',
  eur: '€',
  gbp: '£',
  jpy: '¥',
  cad: 'CA$',
  aud: 'A$',
};

/** Request body for creating an absolute-price alert. */
export interface SaveAlertParams {
  /** CAIP-19 asset identifier, e.g. "eip155:1/slip44:60". */
  asset: string;
  threshold: number;
  recurring: boolean;
}

/** Request body for updating an existing absolute-price alert via PATCH. At least one field is required. */
export interface UpdateAlertParams {
  active?: boolean;
  threshold?: number;
  recurring?: boolean;
}

/** Request body for `POST /v1/alerts/percent-change`. */
export interface SavePercentAlertParams {
  /** CAIP-19 asset identifier, e.g. "eip155:1/slip44:60". */
  asset: string;
  /** Percent magnitude, positive, at most 2 decimal places. */
  threshold: number;
  period: AlertPeriod;
  direction: AlertDirection;
  recurring: boolean;
}

/**
 * Request body for `PATCH /v1/alerts/percent-change/:id`. At least one field
 * is required. `period`/`direction` are immutable server-side and are
 * intentionally absent here.
 */
export interface UpdatePercentAlertParams {
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
  TYPE_SEGMENT: 'create-price-alert-type-segment',
  TYPE_SEGMENT_TARGET: 'create-price-alert-type-segment-target',
  TYPE_SEGMENT_CHANGE: 'create-price-alert-type-segment-change',
  PERIOD_SEGMENT: 'create-price-alert-period-segment',
  PERIOD_SEGMENT_1H: 'create-price-alert-period-segment-1h',
  PERIOD_SEGMENT_24H: 'create-price-alert-period-segment-24h',
  DIRECTION_TOGGLE: 'create-price-alert-direction-toggle',
  PERCENT_INPUT: 'create-price-alert-percent-input',
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

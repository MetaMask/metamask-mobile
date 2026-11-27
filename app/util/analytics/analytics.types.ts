/**
 * Properties that may contain undefined values.
 * Accepted by AnalyticsEventBuilder.addProperties() and by filterUndefinedValues().
 *
 * Valid inputs:
 * - Objects with properties (already filtered or with undefined values)
 * - null or undefined (treated as empty object)
 */
export type AnalyticsUnfilteredProperties =
  | Record<string, unknown>
  | null
  | undefined;

// --- Transitional / legacy event types (from MetaMetrics.types.ts) ---

/**
 * Values that can be passed as properties to the event tracking function.
 * Proxy type to decouple the app from Segment SDK JsonValue.
 */
export type JsonValue =
  | boolean
  | number
  | string
  | null
  | JsonValue[]
  | JsonMap
  | undefined;

/**
 * Map object used to pass properties to the event tracking function.
 * Proxy type to decouple the app from Segment SDK JsonMap.
 */
export interface JsonMap {
  [key: string]: JsonValue;
  [index: number]: JsonValue;
}

/**
 * Legacy MetaMetrics event interface.
 */
export interface IMetaMetricsEvent {
  category: string;
  properties?: {
    name?: string;
    action?: string;
  };
}

/**
 * New event properties structure with two distinct properties lists.
 */
export interface ITrackingEvent {
  readonly name: string;
  properties: JsonMap;
  sensitiveProperties: JsonMap;
  get isAnonymous(): boolean;
  get hasProperties(): boolean;
}

/**
 * Type guard to check if the event is a new ITrackingEvent.
 */
export const isTrackingEvent = (
  event: IMetaMetricsEvent | ITrackingEvent,
): event is ITrackingEvent =>
  typeof (event as ITrackingEvent).name === 'string' && !('category' in event);

/**
 * Monetized primitives associated with a transaction.
 * Only propagated when the transaction involves a monetized primitive.
 */
export enum MonetizedPrimitive {
  Swaps = 'swaps',
  Perps = 'perps',
  Ramps = 'ramps',
  Predict = 'predict',
  MmPay = 'mm_pay',
  MoneyAccount = 'money_account',
}

/**
 * The API type used to perform a request to MetaMask Mobile.
 * Indicates whether the request came through the Ethereum Provider API or the Multichain API.
 */
export enum MetaMetricsRequestedThrough {
  EthereumProvider = 'ethereum_provider',
  MultichainApi = 'multichain_api',
}

/**
 * Analytics `tdp_version` property value, shared across Token Details analytics
 * call sites.
 *
 * The new Token Details page is called "V1" internally (`TokenDetailsVariant`,
 * `TokenDetailsV1`) but ships to product/analytics as `'v3'`; the legacy page
 * reports `'v2'`.
 */
export type TdpVersion = 'v2' | 'v3';

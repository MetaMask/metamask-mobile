import type {
  AnalyticsEventProperties,
  AnalyticsUserTraits,
  AnalyticsTrackingEvent,
} from '@metamask/analytics-controller';

/**
 * Properties that may contain undefined values.
 * Accepted by AnalyticsEventBuilder.addProperties(), addSensitiveProperties(), and by filterUndefinedValues().
 *
 * Valid inputs:
 * - Objects with properties (already filtered or with undefined values)
 * - null or undefined (treated as empty object)
 */
export type AnalyticsUnfilteredProperties =
  | Record<string, unknown>
  | null
  | undefined;

/**
 * Analytics helper type defining the public API
 */
export interface AnalyticsHelper {
  /**
   * Track an event
   *
   * @param event - Analytics tracking event
   */
  trackEvent: (event: AnalyticsTrackingEvent) => void;

  /**
   * Track a screen view
   *
   * @param name - Screen name
   * @param properties - Screen data
   */
  trackView: (name: string, properties?: AnalyticsEventProperties) => void;

  /**
   * Set user info
   *
   * @param traits - User data
   */
  identify: (traits?: AnalyticsUserTraits) => void;

  /**
   * Opt in to analytics
   */
  optIn: () => void;

  /**
   * Opt out of analytics
   */
  optOut: () => void;

  /**
   * Get the analytics ID
   *
   * @returns Promise with the analytics ID
   */
  getAnalyticsId: () => Promise<string>;

  /**
   * Check if analytics is enabled
   *
   * @returns true if analytics is enabled, false otherwise
   */
  isEnabled: () => boolean;

  /**
   * Check if user opted in
   *
   * @returns Promise with true if opted in, false otherwise
   */
  isOptedIn: () => Promise<boolean>;

  /**
   * Generate analytics defaults
   *
   * @returns Promise with analytics defaults
   */
  generateDefaults: () => Promise<AnalyticsDefaults>;
}

/**
 * Analytics defaults type
 */
export interface AnalyticsDefaults {
  analyticsId: string;
  optedIn: boolean;
}

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
  saveDataRecording: boolean;
  get isAnonymous(): boolean;
  get hasProperties(): boolean;
}

/**
 * Type guard to check if the event is a new ITrackingEvent.
 */
export const isTrackingEvent = (
  event: IMetaMetricsEvent | ITrackingEvent,
): event is ITrackingEvent =>
  (event as ITrackingEvent).saveDataRecording !== undefined;

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
}

/**
 * The API type used to perform a request to MetaMask Mobile.
 * Indicates whether the request came through the Ethereum Provider API or the Multichain API.
 */
export enum MetaMetricsRequestedThrough {
  EthereumProvider = 'ethereum_provider',
  MultichainApi = 'multichain_api',
}

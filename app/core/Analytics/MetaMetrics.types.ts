import type { UserTraits, GroupTraits } from '@segment/analytics-react-native';
/**
 * custom implementation of the Segment ClientMethods type
 * Allows to mock the Segment client
 */
export interface ISegmentClient {
  // track an event
  track: (
    event: string,
    properties?: JsonMap,
    userId?: string,
    anonymousId?: string,
  ) => void;
  // identify an user with ID and traits
  identify: (userId?: string, userTraits?: UserTraits) => Promise<void>;
  // add a user to a specific group
  group: (groupId: string, groupTraits?: GroupTraits) => Promise<void>;
  // clear the internal state of the library for the current user and group.
  screen: (name: string, properties?: JsonMap) => Promise<void>;
  flush: () => Promise<void>;
  reset: (resetAnonymousId: boolean) => Promise<void>;
}

/**
 * MetaMetrics core interface
 */
export interface IMetaMetrics {
  /**
   * Get current MetaMetrics state
   */
  isEnabled(): boolean;
  /**
   * Enable or disable data tracking
   * @param enable
   */
  enable(enable?: boolean): Promise<void>;
  /**
   * add traits to an user
   * @param userTraits
   */
  addTraitsToUser(userTraits: UserTraits): Promise<void>;
  /**
   * add an user to a specific group
   * @param groupId
   * @param groupTraits
   */
  group(groupId: string, groupTraits?: GroupTraits): void;
  /**
   * Legacy event tracking
   *
   * @param event - Legacy analytics event
   * @param properties - Object containing any event relevant traits or properties (optional).
   * @param saveDataRecording - param to skip saving the data recording flag (optional)
   * @deprecated use `trackEvent(ITrackingEvent, boolean)` instead
   */
  trackEvent(
    event: IMetaMetricsEvent,
    properties?: CombinedProperties,
    saveDataRecording?: boolean,
  ): void;
  /**
   * Track an event
   *
   * The function allows to track non-anonymous and anonymous events:
   * - with properties and without properties,
   * - with a unique trackEvent function
   *
   * ## Regular non-anonymous events
   * Regular events are tracked with the user ID and can have properties set
   *
   * ## Anonymous events
   * Anonymous tracking track sends two events: one with the anonymous ID and one with the user ID
   * - The anonymous event includes sensitive properties so you can know **what** but not **who**
   * - The non-anonymous event has either no properties or not sensitive one so you can know **who** but not **what**
   *
   * @example basic non-anonymous tracking with no properties:
   * trackEvent(MetaMetricsEvents.ONBOARDING_STARTED);
   *
   * @example track with non-anonymous properties:
   * trackEvent(MetaMetricsEvents.BROWSER_SEARCH_USED, {
   *   option_chosen: 'Browser Bottom Bar Menu',
   *   number_of_tabs: undefined,
   * });
   *
   * @example you can also track with non-anonymous properties (new properties structure):
   * trackEvent(MetaMetricsEvents.BROWSER_SEARCH_USED, {
   *   properties: {
   *     option_chosen: 'Browser Bottom Bar Menu',
   *     number_of_tabs: undefined,
   *   },
   * });
   *
   * @example track an anonymous event (without properties)
   * trackEvent(MetaMetricsEvents.SWAP_COMPLETED);
   *
   * @example track an anonymous event with properties
   * trackEvent(MetaMetricsEvents.GAS_FEES_CHANGED, {
   *   sensitiveProperties: { ...parameters },
   * });
   *
   * @example track an event with both anonymous and non-anonymous properties
   * trackEvent(MetaMetricsEvents.MY_EVENT, {
   *   properties: { ...nonAnonymousParameters },
   *   sensitiveProperties: { ...anonymousParameters },
   * });
   *
   * @param event - Analytics event built with {@link MetricsEventBuilder}
   * @param saveDataRecording - param to skip saving the data recording flag (optional)
   */
  trackEvent(event: ITrackingEvent, saveDataRecording?: boolean): void;
  /**
   * clear the internal state of the library for the current user and group.
   */
  reset(): Promise<void>;
  /**
   * flush the queue of events
   * triggers the upload of the events
   */
  flush(): Promise<void>;
  /**
   * delete user's data from Segment and all related
   * destinations.
   */
  createDataDeletionTask(): Promise<IDeleteRegulationResponse>;

  checkDataDeleteStatus(): Promise<IDeleteRegulationStatus>;

  getDeleteRegulationCreationDate(): DataDeleteDate;

  getDeleteRegulationId(): string | undefined;

  isDataRecorded(): boolean;

  configure(): Promise<boolean>;

  getMetaMetricsId(): Promise<string | undefined>;
}

/**
 * represents values that can be passed as properties to the event tracking function
 * It's a proxy type to the JsonValue type from Segment SDK in order to decouple the SDK from the app
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
 * represents the map object used to pass properties to the event tracking function
 * It's a proxy type to the JsonMap type from Segment SDK in order to decouple the SDK from the app
 */
export interface JsonMap {
  [key: string]: JsonValue;
  [index: number]: JsonValue;
}

/**
 * type guard to check if the event is a new ITrackingEvent
 */
export const isTrackingEvent = (
  event: IMetaMetricsEvent | ITrackingEvent,
): event is ITrackingEvent =>
  (event as ITrackingEvent).saveDataRecording !== undefined;

export interface ITrackingEvent {
  readonly name: string;
  properties: JsonMap;
  sensitiveProperties: JsonMap;
  saveDataRecording: boolean;
  get isAnonymous(): boolean;
  get hasProperties(): boolean;
}
/**
 * MetaMetrics event interface
 */
export interface IMetaMetricsEvent {
  category: string;
  properties?: {
    name?: string;
    action?: string;
  };
}

/**
 * deletion task possible status
 * @see https://docs.segmentapis.com/tag/Deletion-and-Suppression#operation/getRegulation
 */
export enum DataDeleteStatus {
  failed = 'FAILED',
  finished = 'FINISHED',
  initialized = 'INITIALIZED',
  invalid = 'INVALID',
  notSupported = 'NOT_SUPPORTED',
  partialSuccess = 'PARTIAL_SUCCESS',
  running = 'RUNNING',
  unknown = 'UNKNOWN',
}

/**
 * deletion task possible response status
 */
export enum DataDeleteResponseStatus {
  ok = 'ok',
  error = 'error',
}

export interface IDeleteRegulationResponse {
  status: DataDeleteResponseStatus;
  error?: string;
}

export interface IDeleteRegulationStatusResponse {
  status: DataDeleteResponseStatus;
  dataDeleteStatus: DataDeleteStatus;
}

export type DataDeleteDate = string | undefined;
export type DataDeleteRegulationId = string | undefined;

export interface IDeleteRegulationStatus {
  deletionRequestDate?: DataDeleteDate;
  hasCollectedDataSinceDeletionRequest: boolean;
  dataDeletionRequestStatus: DataDeleteStatus;
}

// event properties structure with two distinct properties lists
// for sensitive (anonymous) and regular (non-anonymous) properties
// this structure and naming is mirroring how the extension metrics works.
export interface EventProperties {
  properties?: JsonMap;
  sensitiveProperties?: JsonMap;
}

export const isCombinedProperties = (
  properties: CombinedProperties | boolean | undefined,
): properties is CombinedProperties =>
  typeof properties === 'object' &&
  properties !== null &&
  !Array.isArray(properties);

// EventProperties is the new type, direct JsonMap is for backward compatibility
export type CombinedProperties = JsonMap | EventProperties;

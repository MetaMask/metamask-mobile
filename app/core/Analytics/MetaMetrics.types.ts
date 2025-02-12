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
   * Track an event
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

/*
 * new event properties structure with two distinct properties lists
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
 * legacy MetaMetrics event interface
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

/*
 * Legacy event properties structure with two distinct properties lists
 * for sensitive (anonymous) and regular (non-anonymous) properties
 * this structure and naming is mirroring how the extension metrics works.
 * @deprecated use ITrackingEvent with MetricsEventBuilder instead
 */
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

/*
 * EventProperties type is now legacy, direct JsonMap is for backward compatibility
 * @deprecated use ITrackingEvent with MetricsEventBuilder instead
 */
export type CombinedProperties = JsonMap | EventProperties;

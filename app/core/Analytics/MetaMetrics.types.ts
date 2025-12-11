import type {
  UserTraits,
  GroupTraits,
  SegmentClient,
} from '@segment/analytics-react-native';
import { PublicInterface } from '@metamask/utils';

/**
 * Segment client restricted to the interface used by MetaMetrics
 */
export type ISegmentClient = Pick<
  PublicInterface<SegmentClient>,
  'track' | 'identify' | 'group' | 'screen' | 'flush' | 'reset' | 'add'
>;

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

  getMetaMetricsId(): Promise<string>;
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

/**
 * The API type used to perform a request to MetaMask Mobile
 * @description Indicates whether the request came through the Ethereum Provider API or the Multichain API
 * @see MetaMetricsRequestedThrough.EthereumProvider - Standard EIP-1193 provider API
 * @see MetaMetricsRequestedThrough.MultichainApi - MetaMask's Multichain API
 */
export enum MetaMetricsRequestedThrough {
  EthereumProvider = 'ethereum_provider',
  MultichainApi = 'multichain_api',
}

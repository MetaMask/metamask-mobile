import type {
  JsonMap,
  UserTraits,
  GroupTraits,
} from '@segment/analytics-react-native';

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
   * track an anonymous event
   * @param event
   * @param properties
   */
  trackAnonymousEvent(event: string, properties?: JsonMap): void;
  /**
   * track an event
   * @param event
   * @param properties
   */
  trackEvent(event: string, properties?: JsonMap): void;
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

  checkDataDeletionTaskStatus(): Promise<IDeleteRegulationStatusResponse>;

  getDeleteRegulationCreationDate(): string | undefined;

  getDeleteRegulationId(): string | undefined;

  isDataRecorded(): boolean;
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
 */
export enum DataDeleteStatus {
  pending = 'PENDING',
  started = 'STARTED',
  success = 'SUCCESS',
  failure = 'FAILURE',
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

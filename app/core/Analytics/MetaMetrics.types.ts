import type {
  JsonMap,
  UserTraits,
  GroupTraits,
} from '@segment/analytics-react-native';
import { EVENT_NAME } from './MetaMetrics.events';
import AUTHENTICATION_TYPE from '../../constants/userProperties';

// Represents a custom implementation of the Segment ClientMethods type
export interface ISegmentClient {
  // Method track an event
  track: (
    event: string,
    properties?: JsonMap,
    userId?: string,
    anonymousId?: string,
  ) => void;
  // Method to identify an user with ID and traits
  identify: (userId?: string, userTraits?: UserTraits) => void;
  // Method to add an user to a specific group
  group: (groupId: string, groupTraits?: GroupTraits) => void;
  // Method to clear the internal state of the library for the current user and group.
  reset(anonymousId: string): void;
}

// Represents the interface for the core class MetaMetrics
export interface IMetaMetrics {
  /**
   * Gets MetaMetrics state.
   *
   * @returns MetaMetrics state.
   */
  state(): States;

  /**
   * Enable MetaMetrics Analytics engine.
   */
  enable(): void;

  /**
   * Disable MetaMetrics Analytics engine.
   */
  disable(): void;

  /**
   * Method to verify if the MetaMetrics Analytics engine
   * is enabled.
   *
   * @returns Boolean value indicating if it's enabled.
   */
  checkEnabled(): boolean;

  /**
   * Method to add user properties (traits).
   *
   * @param userTraits The user properties.
   */
  addTraitsToUser(userTraits: UserIdentityProperties): void;

  /**
   * Method to add group properties (traits).
   *
   * @param groupId Group ID to add the properties.
   * @param groupTraits The group properties.
   */
  group(groupId: string, groupTraits?: GroupTraits): void;

  /**
   * Method to track an event anonymously (without exposing the user ID).
   *
   * @param event Name of the event.
   * @param properties Event properties.
   */
  trackAnonymousEvent(event: EVENT_NAME, properties?: JsonMap): void;

  /**
   * Method to track an event.
   *
   * @param event Name of the event.
   * @param properties Event properties.
   */
  trackEvent(event: EVENT_NAME, properties?: JsonMap): void;

  /**
   * Method to clean the client internal state.
   */
  reset(): void;

  /**
   * Method to create a new method to suppress and
   * delete user's data from Segment and all related
   * destinations.
   *
   * @returns Object containing the status and an error (optional)
   */
  createDeleteRegulation(): Promise<{ status: string; error?: string }>;

  /**
   * Method to get the delete request creation date.
   *
   * @returns Delete request creation date.
   */
  getDeleteRegulationDate(): string;

  /**
   * Method to get a flag indicating if the user has data recorded.
   *
   * @returns Boolean indicating if the user has data recorded.
   */
  getIsDataRecorded(): boolean;

  /**
   * Method to get the delete regulation date.
   *
   * @returns The MetaMetrcis ID
   */
  getMetaMetricsId(): string;

  /**
   * Method to apply an authentication user property.
   *
   * @param property Authentication user property declared in AUTHENTICATION_TYPE.
   */
  applyAuthenticationUserProperty(property: AUTHENTICATION_TYPE): void;
}

// Represents an MetaMetrics event
export interface IMetaMetricsEvent {
  // Event name to track
  name: EVENT_NAME;
  properties?: {
    name?: string;
    action?: string;
  };
}

// Interface to asign user properties
export interface UserIdentityProperties {
  'Enable OpenSea API'?: string;
  'NFT AutoDetection'?: string;
  Theme?: string;
  'Authentication Type'?: string;
  token_detection_enable?: string;
}

// Expected deletion task status
export enum DataDeleteStatus {
  pending = 'PENDING',
  started = 'STARTED',
  success = 'SUCCESS',
  failure = 'FAILURE',
  unknown = 'UNKNOWN',
}

// MixPanel expected response status
export enum DataDeleteResponseStatus {
  ok = 'ok',
  error = 'error',
}

// State of MetaMetrics
export enum States {
  enabled = 'ENABLED',
  disabled = 'DISABLED',
}

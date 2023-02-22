import type {
  JsonMap,
  UserTraits,
  GroupTraits,
} from '@segment/analytics-react-native';
import { EVENT_NAME } from './MetaMetrics.events';

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
  // Method to get current MetaMetrics state
  state(): States;
  // Method to enable data tracking
  enable(): void;
  // Method to disable data tracking
  disable(): void;
  // Method to add traits to an user
  checkEnabled(): boolean;
  addTraitsToUser(userTraits: Record<string, string>): void;
  // Method to add an user to a specific group
  group(groupId: string, groupTraits?: GroupTraits): void;
  // Method track an anonymous event
  trackAnonymousEvent(event: EVENT_NAME, properties?: JsonMap): void;
  // Method track an event
  trackEvent(event: EVENT_NAME, properties?: JsonMap): void;
  // Method to clear the internal state of the library for the current user and group.
  reset(): void;
  // Method to create a new deletion regulation
  createDeletionRegulation(): Promise<{
    status: DataDeleteResponseStatus;
    error?: string;
  }>;
  // Method to get the delete regulation ID
  getDeleteRegulationId(): Promise<string>;
  // Method to get the delete regulation date
  getDeleteRegulationDate(): string;
  // Method to get the state of the recorded data
  getIsDataRecorded(): boolean;
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

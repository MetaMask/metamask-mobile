import type {
  JsonMap,
  UserTraits,
  GroupTraits,
} from '@segment/analytics-react-native';

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
  addTraitsToUser(userTraits: Record<string, string>): void;
  // Method to add an user to a specific group
  group(groupId: string, groupTraits?: GroupTraits): void;
  // Method track an anonymous event
  trackAnonymousEvent(event: string, properties?: JsonMap): void;
  // Method track an event
  trackEvent(event: string, properties?: JsonMap): void;
  // Method to clear the internal state of the library for the current user and group.
  reset(): void;
  // Method to create a new method to suppress and
  // delete user's data from Segment and all related
  // destinations.
  createSegmentDeleteRegulation(): void;
}

// Represents an MetaMetrics event
export interface IMetaMetricsEvent {
  // Event name to track
  category: string;
  properties?: {
    name?: string;
    action?: string;
  };
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

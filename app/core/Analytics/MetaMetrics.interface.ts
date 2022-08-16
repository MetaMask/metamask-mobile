import { States } from './MetaMetrics.constants';

// Represents the interface for the core class MetaMetrics
export interface IMetaMetrics {
  // Method to get current MetaMetrics state
  state(): States;
  // Method to enable data tracking
  enable(): void;
  // Method to disable data tracking
  disable(): void;
  // Method to identify an user with ID and traits
  addTraitsToUser(userTraits: Record<string, string>): void;
  // Method to add an user to a specific group
  group(groupId: string, groupTraits?: Record<string, string>): void;
  // Method track an event
  trackEvent(
    event: string,
    anonymously: boolean,
    properties?: Record<string, string>,
  ): void;
  // Method to create a new method to suppress and
  // delete user's data from Segment and all related
  // destinations.
  createSegmentSuppressWithDeleteRegulation(): void;
}

// Represents an MetaMetrics event
export interface IMetaMetricsEvent {
  // Event name to track
  event: string;
  // Anonymity property to indicate if the MetaMetric ID
  // or METAMETRICS_ANONYMOUS_ID should be associated
  // with the data.
  anonymous: boolean;
}

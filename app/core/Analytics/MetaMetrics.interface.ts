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
}

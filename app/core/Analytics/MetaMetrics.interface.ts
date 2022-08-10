// Represents the interface for the core class MetaMetrics
export interface IMetaMetrics {
  // Method to enable data tracking
  enable(): void;
  // Method to disable data tracking
  disable(): void;
  // Method track an event
  trackEvent(
    event: string,
    anonymously: boolean,
    properties?: Record<string, string>,
  ): void;
}

// Represent metadata defined with every triggered event
export interface MetaMetricsContext {
  // Application metadata.
  app: {
    // The name of the application tracking the event
    name: string;
    // The version of the application
    version: string;
    // The build number of the application
    build: string;
  };
}

// Represents the shape of data sent to the segment.track method.
export interface SegmentEventPayload {
  // Name of the event to track
  event: string;
  // The context the event occurred in
  metaMetricsContext: MetaMetricsContext;
  // The metametrics id for the user
  userId?: string;
  // An anonymousId that is used to track
  // sensitive data while preserving anonymity.
  anonymousId?: string;
}

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

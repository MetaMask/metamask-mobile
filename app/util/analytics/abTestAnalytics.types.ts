export interface ABTestAnalyticsMapping {
  flagKey: string;
  validVariants: readonly string[];
  eventNames: readonly string[];
  /**
   * Optional per-event property requirements. When set for an event name,
   * enrichment applies only if every listed property matches on the payload.
   */
  eventPropertyRequirements?: Readonly<
    Record<string, Readonly<Record<string, string>>>
  >;
}

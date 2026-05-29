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
  /**
   * When set, `active_ab_tests` for this flag is only injected if every entry
   * matches `event.properties` (strict `===`). Omit for unconditional injection.
   */
  injectWhenPropertiesMatch?: Readonly<Record<string, unknown>>;
}

export interface ABTestAnalyticsMapping {
  flagKey: string;
  validVariants: readonly string[];
  eventNames: readonly string[];
  /**
   * When set, `active_ab_tests` for this flag is only injected if every entry
   * matches `event.properties` (strict `===`). Omit for unconditional injection.
   */
  injectWhenPropertiesMatch?: Readonly<Record<string, unknown>>;
}

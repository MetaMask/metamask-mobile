export interface ABTestAnalyticsMapping {
  flagKey: string;
  validVariants: readonly string[];
  eventNames: readonly string[];
  /**
   * Optional per-event property requirements. When set for an event name,
   * enrichment applies only if every listed property matches on the payload.
   * Values may be a scalar or an array of scalars (any one matching value
   * satisfies the condition).
   */
  eventPropertyRequirements?: Readonly<
    Record<string, Readonly<Record<string, string | readonly string[]>>>
  >;
  /**
   * When set, `active_ab_tests` for this flag is only injected if every entry
   * matches `event.properties`. Values may be a scalar or an array of scalars
   * (any one matching value satisfies the condition).
   */
  injectWhenPropertiesMatch?: Readonly<
    Record<string, unknown | readonly unknown[]>
  >;
  /**
   * When set, `active_ab_tests` for this flag is NOT injected if any entry
   * matches `event.properties`. Values may be a scalar or an array of scalars
   * (any one matching value causes exclusion).
   */
  excludeWhenPropertiesMatch?: Readonly<
    Record<string, unknown | readonly unknown[]>
  >;
}

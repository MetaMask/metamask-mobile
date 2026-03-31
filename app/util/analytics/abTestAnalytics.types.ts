export interface ABTestAnalyticsMapping {
  flagKey: string;
  validVariants: readonly string[];
  eventNames: readonly string[];
}

export interface ActiveABTestAssignment {
  key: string;
  value: string;
}

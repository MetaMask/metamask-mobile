export interface ABTestAnalyticsMapping {
  flagKey: string;
  validVariants: readonly string[];
  eventNames: readonly string[];
}

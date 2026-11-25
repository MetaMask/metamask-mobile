/**
 * Standard shape for provider API configuration.
 * Each provider ships its own resolver that returns this shape.
 */
export interface CardProviderConfig {
  apiKey: string;
  baseUrl: string;
}

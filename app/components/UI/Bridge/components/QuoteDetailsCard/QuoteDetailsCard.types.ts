import { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';

export interface QuoteDetailsCardProps {
  hasInsufficientBalance: boolean;
  location: MetaMetricsSwapsEventSource;
}

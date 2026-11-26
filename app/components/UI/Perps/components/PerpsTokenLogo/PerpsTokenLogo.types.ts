import type { PerpsProviderType } from '@metamask/perps-controller';

export interface PerpsTokenLogoProps {
  symbol: string;
  size?: number;
  testID?: string;
  recyclingKey?: string; // For FlashList optimization
  /**
   * Venue whose mark overlays the token logo. Callers pass it
   * only under the multi-provider flag so flag-off UI is unchanged, and the
   * mark names the exchange the trade goes to.
   */
  providerId?: PerpsProviderType;
}

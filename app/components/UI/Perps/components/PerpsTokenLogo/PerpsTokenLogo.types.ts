import type { PerpsProviderType } from '@metamask/perps-controller';

export interface PerpsTokenLogoProps {
  symbol: string;
  size?: number;
  testID?: string;
  recyclingKey?: string; // For FlashList optimization
  /**
   * Backend market key. Non-Hyperliquid icons use it when it is set.
   * Hyperliquid icon URLs stay on `symbol`.
   */
  marketKey?: string;
  /**
   * Venue of the row's display market. Selects the icon key.
   * Hyperliquid keeps the symbol URL.
   */
  iconProviderId?: PerpsProviderType;
  /**
   * Venue whose mark overlays the token logo. Callers pass it
   * only for a single-venue row while more than one provider is selected.
   */
  providerId?: PerpsProviderType;
}

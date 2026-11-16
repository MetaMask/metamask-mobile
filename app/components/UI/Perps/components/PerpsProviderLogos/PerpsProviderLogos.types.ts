import type { PerpsProviderType } from '@metamask/perps-controller';

/**
 * Exchange whose mark can be drawn. Aggregated mode is not a logo; it
 * resolves to the Hyperliquid and Lighter marks.
 */
export type PerpsProviderLogoId = PerpsProviderType;

export interface PerpsProviderLogosProps {
  /** Providers to draw, in left-to-right order. An empty list renders nothing. */
  providerIds: readonly PerpsProviderLogoId[];
  /**
   * Logo size in pixels. Mapped to the nearest AvatarNetwork size.
   * The available-balance row uses 16.
   */
  size?: number;
  testID?: string;
  twClassName?: string;
}

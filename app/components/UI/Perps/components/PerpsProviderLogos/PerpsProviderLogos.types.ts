import type { PerpsProviderLogoId } from '../../hooks/usePerpsProviderLogoIds';

export type { PerpsProviderLogoId };

export interface PerpsProviderLogosProps {
  /** Providers to draw, in left-to-right order. An empty list renders nothing. */
  providerIds: readonly PerpsProviderLogoId[];
  /**
   * Logo size in pixels. Mapped to the nearest AvatarNetwork size.
   * The available-balance row uses PERPS_AVAILABLE_BALANCE_LOGO_SIZE.
   */
  size?: number;
  /**
   * Hide the logos from screen readers when the surrounding row already
   * announces the exchange names (for example the exchange filter rows).
   * Default `false`.
   */
  isDecorative?: boolean;
  testID?: string;
  twClassName?: string;
}

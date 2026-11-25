import type { PerpsProviderType } from '@metamask/perps-controller';

export interface PerpsOICapWarningProps {
  /**
   * Market symbol to check OI cap status for
   */
  symbol: string;

  /**
   * Venue the market trades on. Omit to follow the default venue.
   */
  providerId?: PerpsProviderType;

  /**
   * Variant determines the display style
   * - 'banner': Full-width prominent warning with background color
   * - 'inline': Compact warning without background
   */
  variant?: 'inline' | 'banner';

  /**
   * Optional test ID for testing
   */
  testID?: string;
}

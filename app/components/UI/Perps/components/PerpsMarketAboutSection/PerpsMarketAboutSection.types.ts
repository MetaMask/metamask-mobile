import type { PerpsMarketData } from '@metamask/perps-controller';

export interface PerpsMarketAboutSectionProps {
  /**
   * The market to display the About section for. The section is only rendered
   * when `market.description` is a non-empty string.
   */
  market: PerpsMarketData;
  /**
   * Number of lines to show for the description while collapsed.
   *
   * @default MARKET_ABOUT_COLLAPSED_NUMBER_OF_LINES
   */
  collapsedNumberOfLines?: number;
}

import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import type { Trade } from '@metamask/social-controllers';
import type { TokenPrice } from '../../../../hooks/useTokenHistoricalPrices';
import { PriceChartProvider } from '../../../../UI/AssetOverview/PriceChart/PriceChart.context';
import { TOKEN_OVERVIEW_CHART_HEIGHT } from '../../../../UI/AssetOverview/Price/tokenOverviewChart.constants';
import type { TimePeriod } from '../useTraderPositionData';
import TraderAdvancedChart, {
  type TradeFocusRequest,
} from './TraderAdvancedChart';
import TraderPriceChart from './TraderPriceChart';

/**
 * Position-view chart height: 20% shorter than the Token Details chart so the
 * fixed top block (token info → chart → period selector → PnL card) stays
 * compact and leaves room for the scrollable trades list below.
 */
export const SOCIAL_POSITION_CHART_HEIGHT = Math.round(
  TOKEN_OVERVIEW_CHART_HEIGHT * 0.8,
);

export interface TraderPositionChartSectionProps {
  historicalPrices: TokenPrice[];
  priceDiff: number;
  isPricesLoading: boolean;
  onChartIndexChange: (index: number) => void;
  trades: readonly Trade[];
  /**
   * CAIP-19 asset id for the spot token. Present for spot positions on a supported
   * chain; absent for perps (which use {@link TraderPositionChartSectionProps.isPerp})
   * and unsupported chains (which fall back to the legacy SVG chart).
   */
  assetId?: string;
  /**
   * Hyperliquid perp position — render the AdvancedChart from `historicalPrices`
   * (no CAIP asset id / spot OHLCV feed).
   */
  isPerp?: boolean;
  activeTimePeriod: TimePeriod;
  /** Whether the selected period is still controlled by automatic trade framing. */
  shouldAutoRequestTimePeriod?: boolean;
  /** Crosshair % change while scrubbing the AdvancedChart. */
  onScrubPercentChange?: (percent: number | null) => void;
  /** When set, the AdvancedChart slides to center this trade. */
  focusRequest?: TradeFocusRequest;
  /** Request a wider period when the focused trade is older than loaded chart data. */
  onRequestTimePeriod?: (period: TimePeriod) => void;
  /** Fired when the user taps a trade circle on the chart (the marker's trade id). */
  onTradeMarkerPress?: (id: string) => void;
  /**
   * When true, the chart stops capturing touches so drags fall through to the
   * scrolling list behind it once the chart is pinned as a scroll-linked overlay.
   */
  scrollPassthrough?: boolean;
}

const TraderPositionChartSection: React.FC<TraderPositionChartSectionProps> = ({
  historicalPrices,
  priceDiff,
  isPricesLoading,
  onChartIndexChange,
  trades,
  assetId,
  isPerp,
  activeTimePeriod,
  shouldAutoRequestTimePeriod,
  onScrubPercentChange,
  focusRequest,
  onRequestTimePeriod,
  onTradeMarkerPress,
  scrollPassthrough = false,
}) => (
  <PriceChartProvider>
    <Box twClassName="mx-4 my-3">
      {assetId || isPerp ? (
        <TraderAdvancedChart
          assetId={assetId}
          isPerp={isPerp}
          activeTimePeriod={activeTimePeriod}
          shouldAutoRequestTimePeriod={shouldAutoRequestTimePeriod}
          trades={trades}
          focusRequest={focusRequest}
          onRequestTimePeriod={onRequestTimePeriod}
          historicalPrices={historicalPrices}
          priceDiff={priceDiff}
          isPricesLoading={isPricesLoading}
          onChartIndexChange={onChartIndexChange}
          onScrubPercentChange={onScrubPercentChange}
          onTradeMarkerPress={onTradeMarkerPress}
          chartHeight={SOCIAL_POSITION_CHART_HEIGHT}
          scrollPassthrough={scrollPassthrough}
        />
      ) : (
        <TraderPriceChart
          prices={historicalPrices}
          priceDiff={priceDiff}
          isLoading={isPricesLoading}
          onChartIndexChange={onChartIndexChange}
          trades={trades}
          chartHeight={SOCIAL_POSITION_CHART_HEIGHT}
          scrollPassthrough={scrollPassthrough}
        />
      )}
    </Box>
  </PriceChartProvider>
);

export default TraderPositionChartSection;

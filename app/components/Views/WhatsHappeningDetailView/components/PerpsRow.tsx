import React, { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RelatedAsset } from '@metamask/ai-controllers';
import { strings } from '../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { WhatsHappeningInteractionType } from '../../Homepage/Sections/WhatsHappening/constants';
import { getWhatsHappeningEventProps } from '../../Homepage/Sections/WhatsHappening/eventProperties';
import type { WhatsHappeningItem } from '../../Homepage/Sections/WhatsHappening/types';
import { formatAssetPrice } from '../utils/formatAssetPrice';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import type { PerpsPriceEntry } from '../hooks/useWhatsHappeningAssetPrices';
import AssetRow from './AssetRow';
import useTradeNavigation from '../hooks/useTradeNavigation';

interface PerpsRowProps {
  asset: RelatedAsset;
  item: WhatsHappeningItem;
  cardIndex: number;
  /** Map from perps symbol → live price data, resolved by the parent card hook. */
  perpsPriceBySymbol: Record<string, PerpsPriceEntry>;
}

/**
 * A single row in the Perps section of the expanded What's Happening card.
 * Displays the asset logo and name with a Trade button and live price/change.
 * Extracted as its own component so hooks can be called per-asset.
 */
const PerpsRow: React.FC<PerpsRowProps> = ({
  asset,
  item,
  cardIndex,
  perpsPriceBySymbol,
}) => {
  const { handleTrade } = useTradeNavigation(asset);
  const { trackEvent, createEventBuilder } = useAnalytics();
  const currentCurrency = useSelector(selectCurrentCurrency);

  // Perps prices are quoted in USD regardless of user currency preference
  const secondaryLine = useMemo(() => {
    const symbol = asset.hlPerpsMarket?.[0];
    if (!symbol) return undefined;
    const entry = perpsPriceBySymbol[symbol];
    if (!entry) return undefined;
    return formatAssetPrice(entry.price, entry.percentChange24h, 'USD');
  }, [asset.hlPerpsMarket, perpsPriceBySymbol, currentCurrency]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTradeWithTracking = useCallback(() => {
    if (!asset.hlPerpsMarket?.[0]) return;
    trackEvent(
      createEventBuilder(MetaMetricsEvents.WHATS_HAPPENING_INTERACTION)
        .addProperties({
          ...getWhatsHappeningEventProps(item, cardIndex),
          interaction_type: WhatsHappeningInteractionType.TradePressed,
          asset_symbol: asset.symbol,
          perps_market: asset.hlPerpsMarket?.[0],
        })
        .build(),
    );
    handleTrade();
  }, [
    handleTrade,
    asset.symbol,
    asset.hlPerpsMarket,
    item,
    cardIndex,
    trackEvent,
    createEventBuilder,
  ]);

  return (
    <AssetRow
      asset={asset}
      actionLabel={strings('bottom_nav.trade')}
      accessibilityLabel={`${strings('bottom_nav.trade')} ${asset.symbol}`}
      onAction={handleTradeWithTracking}
      secondaryLine={secondaryLine}
    />
  );
};

export default PerpsRow;

import React, { memo, useCallback, useMemo } from 'react';
import type { RelatedAsset } from '@metamask/ai-controllers';
import { strings } from '../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import {
  WhatsHappeningInteractionType,
  type WhatsHappeningSourceValue,
} from '../../../UI/WhatsHappening/constants';
import { getWhatsHappeningEventProps } from '../../../UI/WhatsHappening/eventProperties';
import type { WhatsHappeningItem } from '../../../UI/WhatsHappening/types';
import { formatAssetPrice } from '../utils/formatAssetPrice';
import type { PerpsPriceEntry } from '../hooks/useWhatsHappeningAssetPrices';
import AssetRow from './AssetRow';
import useTradeNavigation from '../hooks/useTradeNavigation';
import { playImpact, ImpactMoment } from '../../../../util/haptics';

interface PerpsRowProps {
  asset: RelatedAsset;
  item: WhatsHappeningItem;
  cardIndex: number;
  source: WhatsHappeningSourceValue;
  /** Map from perps symbol → live price data, resolved by the parent card hook. */
  perpsPriceBySymbol: Record<string, PerpsPriceEntry>;
}

/**
 * A single row for a perps asset in the expanded What's Happening card.
 * Shows logo, name, optional verified badge (for assets that also have caip19),
 * live price/change when `hlPerpsMarket` is set, and a Trade button only when a
 * perps market symbol exists.
 */
const PerpsRow: React.FC<PerpsRowProps> = ({
  asset,
  item,
  cardIndex,
  source,
  perpsPriceBySymbol,
}) => {
  const { handleTrade } = useTradeNavigation(asset);
  const { trackEvent, createEventBuilder } = useAnalytics();

  // Perps prices are always quoted in USD
  const secondaryLine = useMemo(() => {
    const symbol = asset.hlPerpsMarket?.[0];
    if (!symbol) return undefined;
    const entry = perpsPriceBySymbol[symbol];
    if (!entry) return undefined;
    return formatAssetPrice(entry.price, entry.percentChange24h, 'USD');
  }, [asset.hlPerpsMarket, perpsPriceBySymbol]);

  const handleTradeWithTracking = useCallback(() => {
    const perpsMarket = asset.hlPerpsMarket?.[0];
    if (!perpsMarket) {
      return;
    }
    playImpact(ImpactMoment.PrimaryCTA);
    trackEvent(
      createEventBuilder(MetaMetricsEvents.WHATS_HAPPENING_INTERACTED)
        .addProperties({
          ...getWhatsHappeningEventProps(item, cardIndex, source),
          interaction_type: WhatsHappeningInteractionType.TradePressed,
          asset_symbol: asset.symbol,
          perps_market: perpsMarket,
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
    source,
    trackEvent,
    createEventBuilder,
  ]);

  const perpsMarketSymbol = asset.hlPerpsMarket?.[0];

  return (
    <AssetRow
      asset={asset}
      actionLabel={perpsMarketSymbol ? strings('bottom_nav.trade') : undefined}
      accessibilityLabel={
        perpsMarketSymbol
          ? `${strings('bottom_nav.trade')} ${asset.symbol}`
          : undefined
      }
      onAction={perpsMarketSymbol ? handleTradeWithTracking : undefined}
      secondaryLine={secondaryLine}
    />
  );
};

export default memo(PerpsRow);

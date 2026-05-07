import React, { useCallback } from 'react';
import type { RelatedAsset } from '@metamask/ai-controllers';
import { strings } from '../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { WhatsHappeningInteractionType } from '../../Homepage/Sections/WhatsHappening/constants';
import { getWhatsHappeningEventProps } from '../../Homepage/Sections/WhatsHappening/eventProperties';
import type { WhatsHappeningItem } from '../../Homepage/Sections/WhatsHappening/types';
import AssetRow from './AssetRow';
import useTradeNavigation from '../hooks/useTradeNavigation';

interface PerpsRowProps {
  asset: RelatedAsset;
  item: WhatsHappeningItem;
  cardIndex: number;
}

/**
 * A single row in the Perps section of the expanded What's Happening card.
 * Displays the asset logo and symbol with a Trade button that navigates to
 * the Perps market details view. Extracted as its own component so hooks can
 * be called per-asset (hooks cannot be called inside a loop).
 */
const PerpsRow: React.FC<PerpsRowProps> = ({ asset, item, cardIndex }) => {
  const { handleTrade } = useTradeNavigation(asset);
  const { trackEvent, createEventBuilder } = useAnalytics();

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
    />
  );
};

export default PerpsRow;

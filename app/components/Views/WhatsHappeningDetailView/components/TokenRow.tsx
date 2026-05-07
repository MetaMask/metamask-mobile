import React, { useCallback } from 'react';
import type { RelatedAsset } from '@metamask/ai-controllers';
import { strings } from '../../../../../locales/i18n';
import { useRampNavigation } from '../../../UI/Ramp/hooks/useRampNavigation';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { WhatsHappeningInteractionType } from '../../Homepage/Sections/WhatsHappening/constants';
import { getWhatsHappeningEventProps } from '../../Homepage/Sections/WhatsHappening/eventProperties';
import type { WhatsHappeningItem } from '../../Homepage/Sections/WhatsHappening/types';
import AssetRow from './AssetRow';
import useTradeNavigation from '../hooks/useTradeNavigation';

interface TokenRowProps {
  asset: RelatedAsset;
  item: WhatsHappeningItem;
  cardIndex: number;
}

/**
 * A single row in the Tokens section of the expanded What's Happening card.
 * Shows a Trade button (navigating to Perps) when the asset has an
 * `hlPerpsMarket` entry; otherwise falls back to a Buy button that opens the
 * Ramp buy flow. Extracted as its own component so hooks can be called
 * per-asset (hooks cannot be called inside a loop).
 */
const TokenRow: React.FC<TokenRowProps> = ({ asset, item, cardIndex }) => {
  const { goToBuy } = useRampNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { handleTrade, canTrade } = useTradeNavigation(asset);

  const handleBuy = useCallback(() => {
    const assetId = asset.caip19?.[0];
    trackEvent(
      createEventBuilder(MetaMetricsEvents.WHATS_HAPPENING_INTERACTION)
        .addProperties({
          ...getWhatsHappeningEventProps(item, cardIndex),
          interaction_type: WhatsHappeningInteractionType.BuyPressed,
          asset_symbol: asset.symbol,
          ...(assetId ? { asset_caip19: assetId } : {}),
        })
        .build(),
    );
    goToBuy({ assetId });
  }, [
    goToBuy,
    asset.caip19,
    asset.symbol,
    item,
    cardIndex,
    trackEvent,
    createEventBuilder,
  ]);

  if (canTrade) {
    return (
      <AssetRow
        asset={asset}
        actionLabel={strings('bottom_nav.trade')}
        accessibilityLabel={`${strings('bottom_nav.trade')} ${asset.symbol}`}
        onAction={handleTrade}
      />
    );
  }

  return (
    <AssetRow
      asset={asset}
      actionLabel={strings('asset_overview.buy_button')}
      accessibilityLabel={`${strings('asset_overview.buy_button')} ${asset.symbol}`}
      onAction={handleBuy}
    />
  );
};

export default TokenRow;

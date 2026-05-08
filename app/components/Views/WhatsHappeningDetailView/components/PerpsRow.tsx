import React, { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { CaipAssetType } from '@metamask/utils';
import type { RelatedAsset } from '@metamask/ai-controllers';
import { strings } from '../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { WhatsHappeningInteractionType } from '../../Homepage/Sections/WhatsHappening/constants';
import { getWhatsHappeningEventProps } from '../../Homepage/Sections/WhatsHappening/eventProperties';
import type { WhatsHappeningItem } from '../../Homepage/Sections/WhatsHappening/types';
import { formatAssetPrice } from '../utils/formatAssetPrice';
import { selectTokenListSecurityBadgesEnabled } from '../../../../selectors/featureFlagController/tokenListSecurityBadges';
import type { PerpsPriceEntry } from '../hooks/useWhatsHappeningAssetPrices';
import AssetRow from './AssetRow';
import useTradeNavigation from '../hooks/useTradeNavigation';
import type { RootState } from '../../../../reducers';

interface PerpsRowProps {
  asset: RelatedAsset;
  item: WhatsHappeningItem;
  cardIndex: number;
  /** Map from perps symbol → live price data, resolved by the parent card hook. */
  perpsPriceBySymbol: Record<string, PerpsPriceEntry>;
}

/**
 * A single row for a perps asset in the expanded What's Happening card.
 * Shows logo, name, optional verified badge (for assets that also have caip19),
 * live price/change, and a Trade button.
 */
const PerpsRow: React.FC<PerpsRowProps> = ({
  asset,
  item,
  cardIndex,
  perpsPriceBySymbol,
}) => {
  const { handleTrade } = useTradeNavigation(asset);
  const { trackEvent, createEventBuilder } = useAnalytics();
  const isTokenListSecurityBadgesEnabled = useSelector(
    selectTokenListSecurityBadgesEnabled,
  );
  const basicFunctionalityEnabled = useSelector(
    (state: RootState) => state.settings.basicFunctionalityEnabled,
  );

  // Show verified badge for assets that also have a caip19 identifier
  const caipAssetId = useMemo(() => {
    const firstCaip = asset.caip19?.[0];
    if (
      !firstCaip ||
      !basicFunctionalityEnabled ||
      !isTokenListSecurityBadgesEnabled
    ) {
      return undefined;
    }
    return firstCaip as CaipAssetType;
  }, [
    asset.caip19,
    basicFunctionalityEnabled,
    isTokenListSecurityBadgesEnabled,
  ]);

  // Perps prices are always quoted in USD
  const secondaryLine = useMemo(() => {
    const symbol = asset.hlPerpsMarket?.[0];
    if (!symbol) return undefined;
    const entry = perpsPriceBySymbol[symbol];
    if (!entry) return undefined;
    return formatAssetPrice(entry.price, entry.percentChange24h, 'USD');
  }, [asset.hlPerpsMarket, perpsPriceBySymbol]);

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
      caipAssetId={caipAssetId}
      secondaryLine={secondaryLine}
    />
  );
};

export default PerpsRow;

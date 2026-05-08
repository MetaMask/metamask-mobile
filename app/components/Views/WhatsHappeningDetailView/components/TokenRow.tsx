import React, { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { CaipAssetType } from '@metamask/utils';
import type { RelatedAsset } from '@metamask/ai-controllers';
import { strings } from '../../../../../locales/i18n';
import { useRampNavigation } from '../../../UI/Ramp/hooks/useRampNavigation';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { WhatsHappeningInteractionType } from '../../Homepage/Sections/WhatsHappening/constants';
import { getWhatsHappeningEventProps } from '../../Homepage/Sections/WhatsHappening/eventProperties';
import type { WhatsHappeningItem } from '../../Homepage/Sections/WhatsHappening/types';
import { selectTokenListSecurityBadgesEnabled } from '../../../../selectors/featureFlagController/tokenListSecurityBadges';
import { formatAssetPrice } from '../utils/formatAssetPrice';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import type { TokenPriceEntry } from '../hooks/useWhatsHappeningAssetPrices';
import AssetRow from './AssetRow';
import useTradeNavigation from '../hooks/useTradeNavigation';
import type { RootState } from '../../../../reducers';

interface TokenRowProps {
  asset: RelatedAsset;
  item: WhatsHappeningItem;
  cardIndex: number;
  /** Map from caip19 ID → price data, resolved by the parent card hook. */
  tokenPriceByCaip: Record<string, TokenPriceEntry>;
}

/**
 * A single row in the Tokens section of the expanded What's Happening card.
 * Shows a Trade button (navigating to Perps) when the asset has an
 * `hlPerpsMarket` entry; otherwise falls back to a Buy button that opens the
 * Ramp buy flow. Extracted as its own component so hooks can be called
 * per-asset (hooks cannot be called inside a loop).
 */
const TokenRow: React.FC<TokenRowProps> = ({
  asset,
  item,
  cardIndex,
  tokenPriceByCaip,
}) => {
  const { goToBuy } = useRampNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { handleTrade, canTrade } = useTradeNavigation(asset);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const isTokenListSecurityBadgesEnabled = useSelector(
    selectTokenListSecurityBadgesEnabled,
  );
  const basicFunctionalityEnabled = useSelector(
    (state: RootState) => state.settings.basicFunctionalityEnabled,
  );

  // Resolve the caip19 ID for the security badge (use first entry if present)
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

  // Resolve price display from the batched price map
  const secondaryLine = useMemo(() => {
    const firstCaip = asset.caip19?.[0];
    if (!firstCaip) return undefined;
    const entry = tokenPriceByCaip[firstCaip];
    if (!entry) return undefined;
    return formatAssetPrice(
      entry.price,
      entry.pricePercentChange1d,
      currentCurrency,
    );
  }, [asset.caip19, tokenPriceByCaip, currentCurrency]);

  const handleTradeWithTracking = useCallback(() => {
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
        onAction={handleTradeWithTracking}
        caipAssetId={caipAssetId}
        secondaryLine={secondaryLine}
      />
    );
  }

  return (
    <AssetRow
      asset={asset}
      actionLabel={strings('asset_overview.buy_button')}
      accessibilityLabel={`${strings('asset_overview.buy_button')} ${asset.symbol}`}
      onAction={handleBuy}
      caipAssetId={caipAssetId}
      secondaryLine={secondaryLine}
    />
  );
};

export default TokenRow;

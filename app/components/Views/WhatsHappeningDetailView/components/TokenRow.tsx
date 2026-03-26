import React, { useCallback } from 'react';
import {
  AvatarToken,
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonBase,
  ButtonBaseSize,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { RelatedAsset } from '@metamask/ai-controllers';
import { strings } from '../../../../../locales/i18n';
import { getRelatedAssetImageSource } from '../utils/getRelatedAssetImageSource';
import { useRampNavigation } from '../../../UI/Ramp/hooks/useRampNavigation';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics/MetaMetrics.events';

interface TokenRowProps {
  asset: RelatedAsset;
  digestId: string | null;
}

/**
 * A single row in the Tokens section of the expanded What's Happening card.
 * Displays the token logo, symbol, and a Buy button that navigates to the
 * Ramp buy flow. Extracted as its own component so hooks can be called
 * per-asset (hooks cannot be called inside a loop).
 */
const TokenRow: React.FC<TokenRowProps> = ({ asset, digestId }) => {
  const { goToBuy } = useRampNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const handleBuy = useCallback(() => {
    // Perps-only assets have no caip19 but carry hlPerpsMarket.
    // Use perps_market for those; use caip19 for regular tokens.
    const assetIdProperty =
      asset.caip19.length === 0 && asset.hlPerpsMarket
        ? { perps_market: asset.hlPerpsMarket }
        : { caip19: asset.caip19[0] };

    trackEvent(
      createEventBuilder(MetaMetricsEvents.BREAKING_NEWS_TRADE_BUTTON_CLICKED)
        .addProperties({
          ...assetIdProperty,
          digest_id: digestId,
          destination: 'buy',
        })
        .build(),
    );

    const assetId = asset.caip19[0];
    goToBuy({ assetId });
  }, [goToBuy, asset, digestId, trackEvent, createEventBuilder]);

  // Wallet CDN (via CAIP-19) → Perps SVG (perpsAssetId only) → bundled image-icons.
  const rawImageSource = getRelatedAssetImageSource(asset);
  const imageSource = Array.isArray(rawImageSource)
    ? (rawImageSource[0] as { uri?: string } | undefined)
    : (rawImageSource as number | { uri?: string } | undefined);

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={3}
      twClassName="py-3"
    >
      <AvatarToken
        name={asset.name}
        size={AvatarTokenSize.Lg}
        src={imageSource ?? undefined}
      />

      <Box
        twClassName="flex-1"
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
      >
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
        >
          {asset.symbol}
        </Text>

        <ButtonBase
          size={ButtonBaseSize.Md}
          twClassName="bg-background-default rounded-2xl px-4"
          onPress={handleBuy}
          accessibilityLabel={`${strings('asset_overview.buy_button')} ${asset.symbol}`}
        >
          {strings('asset_overview.buy_button')}
        </ButtonBase>
      </Box>
    </Box>
  );
};

export default TokenRow;

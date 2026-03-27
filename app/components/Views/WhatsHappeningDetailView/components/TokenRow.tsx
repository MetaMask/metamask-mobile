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

interface TokenRowProps {
  asset: RelatedAsset;
}

/**
 * A single row in the Tokens section of the expanded What's Happening card.
 * Displays the token logo, symbol, and a Buy button that navigates to the
 * Ramp buy flow. Extracted as its own component so hooks can be called
 * per-asset (hooks cannot be called inside a loop).
 */
const TokenRow: React.FC<TokenRowProps> = ({ asset }) => {
  const { goToBuy } = useRampNavigation();

  const handleBuy = useCallback(() => {
    const assetId = asset.caip19?.[0];
    goToBuy({ assetId });
  }, [goToBuy, asset.caip19]);

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

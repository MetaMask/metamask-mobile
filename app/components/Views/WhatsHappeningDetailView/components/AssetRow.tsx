import React from 'react';
import {
  AvatarToken,
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { RelatedAsset } from '@metamask/ai-controllers';
import { getRelatedAssetImageSource } from '../utils/getRelatedAssetImageSource';

interface AssetRowProps {
  asset: RelatedAsset;
  actionLabel: string;
  accessibilityLabel: string;
  onAction: () => void;
}

/**
 * Shared layout for a single asset row (logo + symbol + action button).
 * Used by TokenRow (Buy/Trade) and PerpsRow (Trade); each wrapper supplies its
 * own hook logic and passes the resolved label and handler here.
 */
const AssetRow: React.FC<AssetRowProps> = ({
  asset,
  actionLabel,
  accessibilityLabel,
  onAction,
}) => {
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

        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Md}
          onPress={onAction}
          accessibilityLabel={accessibilityLabel}
        >
          {actionLabel}
        </Button>
      </Box>
    </Box>
  );
};

export default AssetRow;

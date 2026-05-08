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
import type { CaipAssetType } from '@metamask/utils';
import { getRelatedAssetImageSource } from '../utils/getRelatedAssetImageSource';
import TokenListSecurityBadge from '../../../UI/Tokens/components/TokenListSecurityBadge/TokenListSecurityBadge';

export interface AssetRowSecondaryLine {
  priceText: string;
  changeText: string | undefined;
  changeColor: TextColor;
}

interface AssetRowProps {
  asset: RelatedAsset;
  actionLabel: string;
  accessibilityLabel: string;
  onAction: () => void;
  /** When provided, renders the security badge inline next to the asset name. */
  caipAssetId?: CaipAssetType;
  /** When provided, renders price + 24h change below the asset name. */
  secondaryLine?: AssetRowSecondaryLine;
}

/**
 * Shared layout for a single asset row (logo + name + optional badge + optional
 * price/change + action button). Used by PerpsRow (Trade).
 */
const AssetRow: React.FC<AssetRowProps> = ({
  asset,
  actionLabel,
  accessibilityLabel,
  onAction,
  caipAssetId,
  secondaryLine,
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
        {/* Left: name + optional badge + optional price/change */}
        <Box twClassName="flex-1 mr-2">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={1}
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
              numberOfLines={1}
            >
              {asset.name || asset.symbol}
            </Text>
            {caipAssetId && (
              <TokenListSecurityBadge caipAssetId={caipAssetId} />
            )}
          </Box>

          {secondaryLine && (
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
            >
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {secondaryLine.priceText}
              </Text>
              {secondaryLine.changeText ? (
                <>
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                  >
                    {' \u2022 '}
                  </Text>
                  <Text
                    variant={TextVariant.BodySm}
                    color={secondaryLine.changeColor}
                  >
                    {secondaryLine.changeText}
                  </Text>
                </>
              ) : null}
            </Box>
          )}
        </Box>

        <Button
          variant={ButtonVariant.Secondary}
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

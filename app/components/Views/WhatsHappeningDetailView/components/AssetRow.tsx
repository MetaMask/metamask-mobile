import React, { memo, useMemo } from 'react';
import {
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
import RelatedAssetAvatar from './RelatedAssetAvatar';

export interface AssetRowSecondaryLine {
  priceText: string;
  changeText: string | undefined;
  changeColor: TextColor;
}

interface AssetRowProps {
  asset: RelatedAsset;
  actionLabel?: string;
  accessibilityLabel?: string;
  onAction?: () => void;
  /** When provided, renders price + 24h change below the asset name. */
  secondaryLine?: AssetRowSecondaryLine;
}

/**
 * Shared layout for a single asset row (logo + name + optional badge + optional
 * price/change + optional action button). Used by PerpsRow (Trade when tradable).
 */
const AssetRow: React.FC<AssetRowProps> = ({
  asset,
  actionLabel,
  accessibilityLabel,
  onAction,
  secondaryLine,
}) => {
  const image = useMemo(() => getRelatedAssetImageSource(asset), [asset]);

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={3}
      twClassName="py-3"
    >
      <RelatedAssetAvatar name={asset.name} image={image} />

      <Box
        twClassName="flex-1"
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
      >
        {/* Left: name + optional badge + optional price/change */}
        <Box twClassName="flex-1 mr-2">
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            numberOfLines={1}
          >
            {asset.name || asset.symbol}
          </Text>

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

        {onAction && actionLabel && accessibilityLabel ? (
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Md}
            onPress={onAction}
            accessibilityLabel={accessibilityLabel}
          >
            {actionLabel}
          </Button>
        ) : null}
      </Box>
    </Box>
  );
};

export default memo(AssetRow);

import React, { memo, useMemo } from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  ListItem,
  ListItemVariant,
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
  const title = asset.name || asset.symbol;

  const description = secondaryLine ? (
    <Box flexDirection={BoxFlexDirection.Row} alignItems={BoxAlignItems.Center}>
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {secondaryLine.priceText}
      </Text>
      {secondaryLine.changeText ? (
        <>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {' \u2022 '}
          </Text>
          <Text variant={TextVariant.BodySm} color={secondaryLine.changeColor}>
            {secondaryLine.changeText}
          </Text>
        </>
      ) : null}
    </Box>
  ) : undefined;

  const endAccessory =
    onAction && actionLabel && accessibilityLabel ? (
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Md}
        onPress={onAction}
        accessibilityLabel={accessibilityLabel}
      >
        {actionLabel}
      </Button>
    ) : undefined;

  return (
    <ListItem
      variant={
        secondaryLine ? ListItemVariant.TwoLines : ListItemVariant.OneLine
      }
      avatar={<RelatedAssetAvatar name={title} image={image} />}
      title={title}
      description={description}
      endAccessory={endAccessory}
      accessoryGap={3}
    />
  );
};

export default memo(AssetRow);

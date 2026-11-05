import React from 'react';
import { Pressable } from 'react-native';
import type { Position } from '@metamask/social-controllers';
import {
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontFamily,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import PositionTokenAvatar from '../../../../UI/SocialFeed/components/PositionTokenAvatar';
import {
  EM_DASH,
  formatPercent,
} from '../../../../UI/SocialFeed/utils/formatters';
import { PositionDetailsSheetSelectorsIDs } from '../PositionDetailsSheet.testIds';

export interface PositionSheetPriceHeaderProps {
  assetName: string;
  isPerp: boolean;
  leverage: number | undefined;
  /** Already formatted price, or market cap when that toggle is selected. */
  valueLabel: string | undefined;
  changePercent: number | undefined;
  /** "Today", or the scrubbed point's timestamp. */
  changeCaption: string;
  /** Token shown beside the price. Omitted until the position is known. */
  position?: Position;
  /** Dismisses the sheet, then opens the asset page. */
  onPressAsset: () => void;
}

const PositionSheetPriceHeader = ({
  assetName,
  isPerp,
  leverage,
  valueLabel,
  changePercent,
  changeCaption,
  position,
  onPressAsset,
}: PositionSheetPriceHeaderProps) => {
  const hasChange =
    changePercent !== undefined && Number.isFinite(changePercent);
  const isChangePositive = (changePercent ?? 0) >= 0;
  const leverageLabel = isPerp && leverage ? `${leverage}x` : undefined;
  const changeLabel = hasChange ? formatPercent(changePercent) : undefined;
  // One label, because the whole header is the button. A label on the
  // pressable otherwise replaces the price, change, and leverage.
  const accessibilityLabel = [
    assetName,
    leverageLabel,
    valueLabel,
    changeLabel,
    changeCaption,
  ]
    .filter((part) => part != null && part !== '')
    .join(', ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPressAsset}
      testID={PositionDetailsSheetSelectorsIDs.PRICE_HEADER}
    >
      <Box
        twClassName="px-4 pt-4"
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={4}
      >
        <Box twClassName="flex-1" gap={1}>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={1}
          >
            <Text
              variant={TextVariant.HeadingSm}
              numberOfLines={1}
              twClassName="shrink"
            >
              {assetName}
            </Text>
            {isPerp && leverage ? (
              <Box alignItems={BoxAlignItems.Center}>
                <Tag severity={TagSeverity.Neutral}>{`${leverage}x`}</Tag>
              </Box>
            ) : null}
            <Icon
              name={IconName.ArrowRight}
              size={IconSize.Sm}
              color={IconColor.IconAlternative}
            />
          </Box>
          <Text
            variant={TextVariant.AmountDisplayLg}
            fontFamily={FontFamily.Hero}
            testID={PositionDetailsSheetSelectorsIDs.PRICE}
          >
            {valueLabel ?? EM_DASH}
          </Text>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={2}
            testID={PositionDetailsSheetSelectorsIDs.DAILY_CHANGE}
          >
            {hasChange ? (
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={
                  isChangePositive
                    ? TextColor.SuccessDefault
                    : TextColor.ErrorDefault
                }
              >
                {formatPercent(changePercent)}
              </Text>
            ) : null}
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
            >
              {changeCaption}
            </Text>
          </Box>
        </Box>
        {position ? (
          <PositionTokenAvatar position={position} size={AvatarTokenSize.Xl} />
        ) : null}
      </Box>
    </Pressable>
  );
};

export default PositionSheetPriceHeader;

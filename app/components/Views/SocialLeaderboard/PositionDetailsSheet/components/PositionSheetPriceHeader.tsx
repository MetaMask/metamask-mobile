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
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import PositionTokenAvatar from '../../../../UI/SocialFeed/components/PositionTokenAvatar';
import {
  EM_DASH,
  formatPercent,
} from '../../../../UI/SocialFeed/utils/formatters';
import { PositionDetailsSheetSelectorsIDs } from '../PositionDetailsSheet.testIds';

export interface PositionSheetPriceHeaderProps {
  assetName: string;
  isPerp: boolean;
  /** Already formatted price, or market cap when one is known. */
  valueLabel: string | undefined;
  /** When true, the figure is market cap and shows the (MC) label. */
  isMarketCapMode: boolean;
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
  valueLabel,
  isMarketCapMode,
  changePercent,
  changeCaption,
  position,
  onPressAsset,
}: PositionSheetPriceHeaderProps) => {
  const hasChange =
    changePercent !== undefined && Number.isFinite(changePercent);
  const isChangePositive = (changePercent ?? 0) >= 0;
  const changeLabel = hasChange ? formatPercent(changePercent) : undefined;
  const marketCapSuffix = isMarketCapMode
    ? strings('social_leaderboard.position_sheet.market_cap_suffix')
    : undefined;
  // One label, because the whole header is the button. A label on the
  // pressable otherwise replaces the price, change, and leverage.
  const accessibilityLabel = [
    assetName,
    valueLabel,
    marketCapSuffix,
    changeLabel,
    changeCaption,
  ]
    .filter((part) => part != null && part !== '')
    .join(', ');
  const accessibilityHint = strings(
    isPerp
      ? 'social_leaderboard.position_sheet.open_market_accessibility_hint'
      : 'social_leaderboard.position_sheet.open_asset_accessibility_hint',
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
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
            <Icon
              name={IconName.ArrowRight}
              size={IconSize.Sm}
              color={IconColor.IconAlternative}
            />
          </Box>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.End}
            gap={1}
          >
            <Text
              variant={TextVariant.AmountDisplayLg}
              fontFamily={FontFamily.Hero}
              testID={PositionDetailsSheetSelectorsIDs.PRICE}
            >
              {valueLabel ?? EM_DASH}
            </Text>
            {marketCapSuffix ? (
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
                twClassName="pb-1"
              >
                {marketCapSuffix}
              </Text>
            ) : null}
          </Box>
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

import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  EM_DASH,
  formatPercent,
} from '../../../../UI/SocialFeed/utils/formatters';
import { PositionDetailsSheetSelectorsIDs } from '../PositionDetailsSheet.testIds';

export interface PositionSheetPriceHeaderProps {
  assetName: string;
  isPerp: boolean;
  leverage: number | undefined;
  /** Already formatted: price, or market cap for spot when one is known. */
  valueLabel: string | undefined;
  isMarketCapMode: boolean;
  changePercent: number | undefined;
  /** "Today", or the scrubbed point's timestamp. */
  changeCaption: string;
}

const PositionSheetPriceHeader = ({
  assetName,
  isPerp,
  leverage,
  valueLabel,
  isMarketCapMode,
  changePercent,
  changeCaption,
}: PositionSheetPriceHeaderProps) => {
  const hasChange =
    changePercent !== undefined && Number.isFinite(changePercent);
  const isChangePositive = (changePercent ?? 0) >= 0;

  return (
    <Box twClassName="px-4 pt-4 pb-6" gap={1}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={1}
      >
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          numberOfLines={1}
        >
          {assetName}
        </Text>
        {isPerp ? (
          <Icon
            name={IconName.VerifiedFilled}
            size={IconSize.Sm}
            twClassName="text-info-default"
          />
        ) : null}
        {isPerp && leverage ? (
          <Box twClassName="rounded px-1.5 bg-muted">
            <Text
              variant={TextVariant.BodyXs}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
            >
              {`${leverage}x`}
            </Text>
          </Box>
        ) : null}
      </Box>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.End}
        gap={1}
      >
        <Text
          variant={TextVariant.DisplayMd}
          testID={PositionDetailsSheetSelectorsIDs.PRICE}
        >
          {valueLabel ?? EM_DASH}
        </Text>
        {isMarketCapMode ? (
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
            twClassName="pb-1"
          >
            {strings('social_leaderboard.position_sheet.market_cap_suffix')}
          </Text>
        ) : null}
      </Box>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={1}
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
  );
};

export default PositionSheetPriceHeader;

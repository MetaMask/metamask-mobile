import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import {
  Box,
  FontWeight,
  Icon,
  IconName,
  SensitiveText,
  SensitiveTextLength,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import type { PredictPosition } from '../../../types';
import { useEntryOutcomeName } from '../../../hooks/useEntryOutcomeName';
import { getEntryTitle } from '../../../utils/entryCopy';
import {
  formatSharesAmount,
  formatSignedPercent,
  formatUsdAmount,
  pnlToneClassName,
} from '../../../utils/portfolioFormatting';
import { PredictHomeSectionTestIds } from '../../PredictHomeSection.testIds';

interface HomePositionRowProps {
  position: PredictPosition;
  isPrivacyMode: boolean;
  /** Absent when the Position has no catalog Event to open. */
  onPress?: (position: PredictPosition) => void;
}

/** "$41.25 on Lakers to win $75.00", or "Lakers · 75 shares" when the
 * backend cannot account for the cost basis: none is invented. */
const positionInfo = (
  { costBasis, shares }: PredictPosition,
  outcome: string,
) =>
  costBasis === undefined
    ? strings('predict_next.portfolio.outcome_shares', {
        outcome,
        shares: formatSharesAmount(shares),
      })
    : strings('predict_next.home_section.position_info', {
        costBasis: formatUsdAmount(costBasis),
        outcome,
        payout: formatUsdAmount(shares),
      });

/**
 * One open Position on the Homepage, laid out like the Polymarket row:
 * image | title and stake | current value and PnL percent. A Position
 * without a current value says it has no price and never shows $0.00; a
 * PnL percent renders only when the backend sent one. No claim or trade
 * action: the row only opens the Event.
 */
export const HomePositionRow = ({
  position,
  isPrivacyMode,
  onPress,
}: HomePositionRowProps) => {
  const tw = useTailwind();
  const { context, currentValue, unrealizedPnl, unrealizedPnlPercent } =
    position;
  const title = getEntryTitle(context);
  const outcome = useEntryOutcomeName(position);

  return (
    <TouchableOpacity
      onPress={onPress ? () => onPress(position) : undefined}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title} - ${outcome}`}
      testID={PredictHomeSectionTestIds.POSITION_ROW}
      style={tw.style('flex-row items-start px-4 py-3 gap-4')}
    >
      {context?.imageUrl ? (
        <Image
          source={{ uri: context.imageUrl }}
          style={tw.style('w-10 h-10 rounded-lg mt-1')}
        />
      ) : (
        <Box twClassName="w-10 h-10 rounded-lg mt-1 bg-background-alternative items-center justify-center">
          <Icon name={IconName.Tag} />
        </Box>
      )}
      <Box twClassName="flex-1">
        <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
          {title}
        </Text>
        <SensitiveText
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          isHidden={isPrivacyMode}
          length={SensitiveTextLength.Long}
          numberOfLines={1}
        >
          {positionInfo(position, outcome)}
        </SensitiveText>
      </Box>
      <Box twClassName="items-end">
        {currentValue === undefined ? (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            testID={PredictHomeSectionTestIds.POSITION_ROW_VALUE_UNAVAILABLE}
          >
            {strings('predict_next.portfolio.value_unavailable')}
          </Text>
        ) : (
          <SensitiveText
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            isHidden={isPrivacyMode}
            length={SensitiveTextLength.Short}
            testID={PredictHomeSectionTestIds.POSITION_ROW_VALUE}
          >
            {formatUsdAmount(currentValue)}
          </SensitiveText>
        )}
        {unrealizedPnl === undefined ||
        unrealizedPnlPercent === undefined ? null : (
          <SensitiveText
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            twClassName={pnlToneClassName(unrealizedPnl)}
            isHidden={isPrivacyMode}
            length={SensitiveTextLength.Short}
            testID={PredictHomeSectionTestIds.POSITION_ROW_PNL}
          >
            {formatSignedPercent(unrealizedPnlPercent)}
          </SensitiveText>
        )}
      </Box>
    </TouchableOpacity>
  );
};

/** Placeholder with the row's layout while the first Positions read loads. */
export const HomePositionRowSkeleton = () => (
  <Box
    twClassName="flex-row items-center px-4 py-3 gap-4"
    testID={PredictHomeSectionTestIds.POSITION_ROW_SKELETON}
  >
    <Skeleton height={40} width={40} />
    <Box twClassName="flex-1 gap-1">
      <Skeleton height={16} width={140} />
      <Skeleton height={16} width={180} />
    </Box>
    <Box twClassName="items-end gap-1">
      <Skeleton height={16} width={60} />
      <Skeleton height={16} width={45} />
    </Box>
  </Box>
);

import React from 'react';
import { Image } from 'expo-image';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  BoxAlignItems,
  FontWeight,
  Icon,
  IconName,
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import type { PredictActivityEntry } from '../../../types';
import { PredictPortfolioScreenTestIds } from '../PredictPortfolioScreen.testIds';
import {
  formatActivityTimestamp,
  formatSettlementProceeds,
  formatSharesAmount,
  formatUsdAmount,
  isNonZeroAmount,
} from './portfolioFormatting';

interface PortfolioActivityRowProps {
  entry: PredictActivityEntry;
  isPrivacyMode: boolean;
  onPress?: (entry: PredictActivityEntry) => void;
}

const getFillTitle = (entry: Extract<PredictActivityEntry, { type: 'fill' }>) =>
  entry.context?.outcomeLabel ?? entry.outcomeSide;

/** Renders one Activity entry (a Fill or a Settlement) as an optionally pressable row. */
export const PortfolioActivityRow = ({
  entry,
  isPrivacyMode,
  onPress,
}: PortfolioActivityRowProps) => {
  const tw = useTailwind();
  const { context } = entry;
  const subtitle = context?.marketQuestion ?? entry.marketId;
  const title =
    entry.type === 'fill'
      ? getFillTitle(entry)
      : strings('predict_next.portfolio.activity_rows.settled');

  return (
    <TouchableOpacity
      onPress={onPress ? () => onPress(entry) : undefined}
      disabled={!onPress}
      style={tw.style('flex-row items-center py-2')}
      testID={PredictPortfolioScreenTestIds.ACTIVITY_ROW}
    >
      <Box twClassName="mr-3 h-10 w-10 overflow-hidden rounded-full bg-muted">
        {context?.eventImageUrl ? (
          <Image
            source={{ uri: context.eventImageUrl }}
            style={tw.style('h-full w-full')}
            accessibilityLabel={subtitle}
          />
        ) : (
          <Box
            twClassName="h-full w-full items-center justify-center"
            testID={PredictPortfolioScreenTestIds.ACTIVITY_ROW_FALLBACK_ICON}
          >
            <Icon name={IconName.Activity} />
          </Box>
        )}
      </Box>
      <Box twClassName="flex-1 pr-3">
        <Text variant={TextVariant.BodyMd} numberOfLines={1}>
          {title}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          twClassName="text-alternative"
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      </Box>
      <Box alignItems={BoxAlignItems.End}>
        {entry.type === 'fill' ? (
          <SensitiveText
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            isHidden={isPrivacyMode}
            length={SensitiveTextLength.Short}
            twClassName="text-alternative"
          >
            {strings('predict_next.portfolio.activity_rows.shares_at_price', {
              shares: formatSharesAmount(entry.shares),
              price: formatUsdAmount(entry.price),
            })}
          </SensitiveText>
        ) : (
          <SensitiveText
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            isHidden={isPrivacyMode}
            length={SensitiveTextLength.Short}
            twClassName={
              isNonZeroAmount(entry.proceeds)
                ? 'text-success-default'
                : 'text-alternative'
            }
          >
            {formatSettlementProceeds(entry.proceeds)}
          </SensitiveText>
        )}
        <Text variant={TextVariant.BodySm} twClassName="text-alternative">
          {formatActivityTimestamp(entry.timestamp)}
        </Text>
      </Box>
    </TouchableOpacity>
  );
};

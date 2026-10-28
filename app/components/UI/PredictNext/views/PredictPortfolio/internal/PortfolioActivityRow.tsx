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
import type {
  PredictActivityEntry,
  PredictSettlementEntry,
  PredictTradeEntry,
} from '../../../types';
import { PredictPortfolioScreenTestIds } from '../PredictPortfolioScreen.testIds';
import { getOutcomeName } from '../../../utils/entryCopy';
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

const getTitle = (entry: PredictActivityEntry): string => {
  const outcome = getOutcomeName(entry.side, entry.context);
  if (entry.type === 'settlement') {
    return strings('predict_next.portfolio.activity_rows.settled_outcome', {
      outcome,
    });
  }
  return strings(
    entry.action === 'buy'
      ? 'predict_next.portfolio.activity_rows.bought'
      : 'predict_next.portfolio.activity_rows.sold',
    { outcome },
  );
};

/** A trade's Balance movement: a buy debits, a sell credits. */
const formatTradeAmount = ({ action, amount }: PredictTradeEntry): string =>
  `${action === 'buy' ? '-' : '+'}${formatUsdAmount(amount)}`;

interface ActivityAmountProps {
  entry: PredictActivityEntry;
  isPrivacyMode: boolean;
}

const TradeAmount = ({
  entry,
  isPrivacyMode,
}: {
  entry: PredictTradeEntry;
  isPrivacyMode: boolean;
}) => (
  <>
    <SensitiveText
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      isHidden={isPrivacyMode}
      length={SensitiveTextLength.Short}
      twClassName={entry.action === 'sell' ? 'text-success-default' : undefined}
      testID={PredictPortfolioScreenTestIds.ACTIVITY_ROW_AMOUNT}
    >
      {formatTradeAmount(entry)}
    </SensitiveText>
    <SensitiveText
      variant={TextVariant.BodySm}
      isHidden={isPrivacyMode}
      length={SensitiveTextLength.Short}
      twClassName="text-alternative"
    >
      {strings('predict_next.portfolio.activity_rows.shares_at_price', {
        shares: formatSharesAmount(entry.shares),
        price: formatUsdAmount(entry.price),
      })}
    </SensitiveText>
  </>
);

const SettlementAmount = ({
  entry,
  isPrivacyMode,
}: {
  entry: PredictSettlementEntry;
  isPrivacyMode: boolean;
}) => (
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
    testID={PredictPortfolioScreenTestIds.ACTIVITY_ROW_AMOUNT}
  >
    {formatSettlementProceeds(entry.proceeds)}
  </SensitiveText>
);

const ActivityAmount = ({ entry, isPrivacyMode }: ActivityAmountProps) =>
  entry.type === 'trade' ? (
    <TradeAmount entry={entry} isPrivacyMode={isPrivacyMode} />
  ) : (
    <SettlementAmount entry={entry} isPrivacyMode={isPrivacyMode} />
  );

/** Renders one Activity entry (a Trade or a Settlement) as an optionally
 * pressable row. Without catalog context it falls back to neutral copy and
 * the Outcome side, never a Venue identifier. */
export const PortfolioActivityRow = ({
  entry,
  isPrivacyMode,
  onPress,
}: PortfolioActivityRowProps) => {
  const tw = useTailwind();
  const { context } = entry;
  const subtitle =
    context?.marketQuestion ?? strings('predict_next.portfolio.unknown_market');
  const title = getTitle(entry);

  return (
    <TouchableOpacity
      onPress={onPress ? () => onPress(entry) : undefined}
      disabled={!onPress}
      style={tw.style('flex-row items-center py-2')}
      testID={PredictPortfolioScreenTestIds.ACTIVITY_ROW}
    >
      <Box twClassName="mr-3 h-10 w-10 overflow-hidden rounded-full bg-muted">
        {context?.imageUrl ? (
          <Image
            source={{ uri: context.imageUrl }}
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
        <ActivityAmount entry={entry} isPrivacyMode={isPrivacyMode} />
        <Text variant={TextVariant.BodySm} twClassName="text-alternative">
          {formatActivityTimestamp(entry.timestamp)}
        </Text>
      </Box>
    </TouchableOpacity>
  );
};

import React from 'react';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Icon,
  IconName,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { Image } from 'expo-image';
import { formatPercentage, formatPrice } from '../../utils/format';
import { strings } from '../../../../../../locales/i18n';

export enum PredictActivityType {
  BUY = 'BUY',
  SELL = 'SELL',
  CLAIM = 'CLAIM',
}

export interface PredictActivityItem {
  id: string;
  type: PredictActivityType;
  marketTitle: string;
  detail: string;
  amountUsd: number;
  percentChange?: number;
  icon?: string;
}

interface PredictActivityProps {
  item: PredictActivityItem;
  onPress?: (item: PredictActivityItem) => void;
}

const activityTitleByType: Record<PredictActivityType, string> = {
  [PredictActivityType.BUY]: strings('predict.transactions.buy_title'),
  [PredictActivityType.SELL]: strings('predict.transactions.sell_title'),
  [PredictActivityType.CLAIM]: strings('predict.transactions.claim_title'),
};

const PredictActivity: React.FC<PredictActivityProps> = ({ item, onPress }) => {
  const tw = useTailwind();

  const isDebit = item.type === PredictActivityType.BUY;
  const isCredit = !isDebit;
  const signedAmount = `${isDebit ? '-' : '+'}${formatPrice(
    Math.abs(item.amountUsd),
    {
      minimumDecimals: 2,
      maximumDecimals: 2,
    },
  )}`;

  const amountColor = isCredit ? 'text-success-default' : 'text-error-default';
  const percentColor =
    (item.percentChange ?? 0) >= 0
      ? 'text-success-default'
      : 'text-error-default';

  return (
    <Pressable
      onPress={() => onPress?.(item)}
      style={({ pressed }) =>
        tw.style('w-full rounded-lg px-2', pressed && 'bg-pressed')
      }
      accessibilityRole="button"
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Start}
        justifyContent={BoxJustifyContent.Between}
        twClassName="w-full py-3"
      >
        <Box twClassName="h-12 w-12 items-center justify-center rounded-full bg-muted mr-3 overflow-hidden">
          {item.icon ? (
            <Image
              source={{ uri: item.icon }}
              style={tw.style('w-full h-full')}
              accessibilityLabel="activity icon"
            />
          ) : (
            <Icon name={IconName.Activity} />
          )}
        </Box>

        <Box twClassName="flex-1">
          <Text variant={TextVariant.BodyMd} numberOfLines={1}>
            {activityTitleByType[item.type]}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            twClassName="text-alternative"
            numberOfLines={1}
          >
            {item.marketTitle}
          </Text>
          {item.type !== PredictActivityType.CLAIM ? (
            <Text
              variant={TextVariant.BodySm}
              twClassName="text-alternative"
              numberOfLines={1}
            >
              {item.detail}
            </Text>
          ) : null}
        </Box>

        <Box twClassName="items-end ml-3">
          <Text variant={TextVariant.BodyMd} twClassName={amountColor}>
            {signedAmount}
          </Text>
          {item.percentChange !== undefined ? (
            <Text variant={TextVariant.BodySm} twClassName={percentColor}>
              {formatPercentage(item.percentChange)}
            </Text>
          ) : null}
        </Box>
      </Box>
    </Pressable>
  );
};

export default PredictActivity;

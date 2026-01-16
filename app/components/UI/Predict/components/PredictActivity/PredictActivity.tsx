import React from 'react';
import TouchableOpacity from '../../../../Base/TouchableOpacity';
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
import Routes from '../../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';
import { PredictActivityItem, PredictActivityType } from '../../types';

interface PredictActivityProps {
  item: PredictActivityItem;
}

const activityTitleByType: Record<PredictActivityType, string> = {
  [PredictActivityType.BUY]: strings('predict.transactions.buy_title'),
  [PredictActivityType.SELL]: strings('predict.transactions.sell_title'),
  [PredictActivityType.CLAIM]: strings('predict.transactions.claim_title'),
};

const PredictActivity: React.FC<PredictActivityProps> = ({ item }) => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const isDebit = item.type === PredictActivityType.BUY;
  const signedAmount = `${isDebit ? '-' : '+'}${formatPrice(
    Math.abs(item.amountUsd),
    {
      minimumDecimals: 2,
      maximumDecimals: 2,
    },
  )}`;

  const percentColor =
    (item.percentChange ?? 0) >= 0
      ? 'text-success-default'
      : 'text-error-default';

  return (
    <TouchableOpacity
      onPress={() => {
        navigation.navigate(Routes.PREDICT.MODALS.ROOT, {
          screen: Routes.PREDICT.ACTIVITY_DETAIL,
          params: {
            activity: item,
          },
        });
      }}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Start}
        justifyContent={BoxJustifyContent.Between}
        twClassName="w-full p-2"
      >
        <Box twClassName="pt-1">
          <Box twClassName="h-10 w-10 items-center justify-center rounded-full bg-muted mr-3 overflow-hidden">
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
        </Box>

        <Box twClassName="flex-1">
          <Text variant={TextVariant.BodyMd} numberOfLines={1}>
            {activityTitleByType[item.type]}
          </Text>
          <Text variant={TextVariant.BodySm} twClassName="text-alternative">
            {item.marketTitle}
          </Text>
        </Box>

        <Box twClassName="items-end ml-3">
          <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
            {signedAmount}
          </Text>
          {item.percentChange !== undefined ? (
            <Text variant={TextVariant.BodySm} twClassName={percentColor}>
              {formatPercentage(item.percentChange)}
            </Text>
          ) : null}
        </Box>
      </Box>
    </TouchableOpacity>
  );
};

export default PredictActivity;

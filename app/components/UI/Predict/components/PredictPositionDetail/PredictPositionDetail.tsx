import React from 'react';
import { Image } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import {
  PredictPosition as PredictPositionType,
  PredictMarket,
  PredictMarketStatus,
} from '../../types';
import { formatPercentage, formatPrice } from '../../utils/format';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Routes from '../../../../../constants/navigation/Routes';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { PredictNavigationParamList } from '../../types/navigation';
import { strings } from '../../../../../../locales/i18n';

interface PredictPositionProps {
  position: PredictPositionType;
  market: PredictMarket;
  marketStatus: PredictMarketStatus;
}

const PredictPosition: React.FC<PredictPositionProps> = ({
  position,
  market,
  marketStatus,
}: PredictPositionProps) => {
  const tw = useTailwind();
  const { icon, initialValue, percentPnl, outcome, avgPrice, currentValue } =
    position;
  const { navigate } =
    useNavigation<NavigationProp<PredictNavigationParamList>>();

  const onCashOut = () => {
    const outcome = market?.outcomes.find((o) => o.id === position.outcomeId);
    navigate(Routes.PREDICT.MODALS.ROOT, {
      screen: Routes.PREDICT.MODALS.SELL_PREVIEW,
      params: { position, outcome },
    });
  };

  return (
    <Box twClassName="w-full pt-2 pb-4 px-4 mb-4 gap-3 bg-background-muted rounded-md">
      <Box twClassName="flex-row items-start gap-4">
        <Image
          source={{ uri: icon }}
          style={tw.style('w-12 h-12 rounded-md self-center')}
        />
        <Box twClassName="gap-1">
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Default}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {strings('predict.market_details.amount_on_outcome', {
              amount: initialValue.toFixed(2),
              outcome,
            })}
          </Text>
          <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
            {strings('predict.market_details.outcome_at_price', {
              outcome,
              price: (avgPrice * 100).toFixed(0),
            })}
          </Text>
        </Box>
        <Box twClassName="items-end justify-end gap-1 ml-auto">
          {marketStatus === PredictMarketStatus.OPEN ? (
            <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
              {formatPrice(currentValue, { maximumDecimals: 2 })}
            </Text>
          ) : percentPnl > 0 ? (
            <Text variant={TextVariant.BodyMD} color={TextColor.Success}>
              {strings('predict.market_details.won')}{' '}
              {formatPrice(currentValue, { maximumDecimals: 2 })}
            </Text>
          ) : (
            <Text variant={TextVariant.BodyMD} color={TextColor.Error}>
              {strings('predict.market_details.lost')}{' '}
              {formatPrice(initialValue, { maximumDecimals: 2 })}
            </Text>
          )}
          {marketStatus === PredictMarketStatus.OPEN && (
            <Text
              variant={TextVariant.BodyMD}
              color={percentPnl > 0 ? TextColor.Success : TextColor.Error}
            >
              {formatPercentage(percentPnl)}
            </Text>
          )}
        </Box>
      </Box>
      {marketStatus === PredictMarketStatus.OPEN && (
        <Box>
          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label={strings('predict.cash_out')}
            onPress={onCashOut}
          />
        </Box>
      )}
    </Box>
  );
};

export default PredictPosition;

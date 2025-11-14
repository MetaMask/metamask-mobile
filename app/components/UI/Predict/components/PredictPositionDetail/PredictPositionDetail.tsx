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
import { PredictEventValues } from '../../constants/eventNames';
import { strings } from '../../../../../../locales/i18n';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import { PredictMarketDetailsSelectorsIDs } from '../../../../../../e2e/selectors/Predict/Predict.selectors';

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

  const {
    icon,
    initialValue,
    percentPnl,
    outcome,
    avgPrice,
    currentValue,
    title,
  } = position;
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const { navigate } = navigation;
  const { executeGuardedAction } = usePredictActionGuard({
    providerId: position.providerId,
    navigation,
  });

  const groupItemTitle = market?.outcomes.find(
    (o) => o.id === position.outcomeId && o.groupItemTitle,
  )?.groupItemTitle;

  const onCashOut = () => {
<<<<<<< HEAD
    executeGuardedAction(() => {
      const _outcome = market?.outcomes.find(
        (o) => o.id === position.outcomeId,
      );
      navigate(Routes.PREDICT.MODALS.ROOT, {
        screen: Routes.PREDICT.MODALS.SELL_PREVIEW,
        params: {
=======
    executeGuardedAction(
      () => {
        const _outcome = market?.outcomes.find(
          (o) => o.id === position.outcomeId,
        );
        navigate(Routes.PREDICT.MODALS.SELL_PREVIEW, {
>>>>>>> ded0b2d592 (fix: Fix Predict Navigation to Cash Out and Single Market (#22711))
          market,
          position,
          outcome: _outcome,
          entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_MARKET_DETAILS,
<<<<<<< HEAD
        },
      });
    });
=======
        });
      },
      { attemptedAction: PredictEventValues.ATTEMPTED_ACTION.CASHOUT },
    );
>>>>>>> ded0b2d592 (fix: Fix Predict Navigation to Cash Out and Single Market (#22711))
  };

  const renderValueText = () => {
    if (marketStatus === PredictMarketStatus.OPEN) {
      return (
        <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
          {formatPrice(currentValue, { maximumDecimals: 2 })}
        </Text>
      );
    }

    if (percentPnl > 0) {
      return (
        <Text variant={TextVariant.BodyMD} color={TextColor.Success}>
          {strings('predict.market_details.won')}{' '}
          {formatPrice(currentValue, { maximumDecimals: 2 })}
        </Text>
      );
    }

    return (
      <Text variant={TextVariant.BodyMD} color={TextColor.Error}>
        {strings('predict.market_details.lost')}{' '}
        {formatPrice(initialValue, { maximumDecimals: 2 })}
      </Text>
    );
  };

  return (
    <Box twClassName="w-full p-4 mb-4 gap-3 bg-background-muted rounded-xl justify-between">
      <Box twClassName="flex-row items-start gap-4">
        {Boolean(icon) && (
          <Box twClassName="w-10 h-10 self-start mt-1">
            <Image
              source={{ uri: icon }}
              resizeMode="cover"
              style={tw.style('w-full h-full rounded-lg')}
            />
          </Box>
        )}
        <Box twClassName="flex-1">
          <Text
            variant={TextVariant.BodyMDMedium}
            color={TextColor.Default}
            ellipsizeMode="tail"
          >
            {groupItemTitle ?? title}
          </Text>
          <Text
            variant={TextVariant.BodySMMedium}
            color={TextColor.Alternative}
          >
            ${initialValue.toFixed(2)} on {outcome} •{' '}
            {(avgPrice * 100).toFixed(0)}¢
          </Text>
        </Box>
        <Box twClassName="items-end justify-end ml-auto shrink-0">
          {renderValueText()}
          {marketStatus === PredictMarketStatus.OPEN && (
            <Text
              variant={TextVariant.BodySMMedium}
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
            testID={
              PredictMarketDetailsSelectorsIDs.MARKET_DETAILS_CASH_OUT_BUTTON
            }
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

import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Image } from 'react-native';
import { PredictMarketDetailsSelectorsIDs } from '../../../../../../e2e/selectors/Predict/Predict.selectors';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Routes from '../../../../../constants/navigation/Routes';
import { PredictEventValues } from '../../constants/eventNames';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import {
  PredictMarket,
  PredictMarketStatus,
  PredictPosition as PredictPositionType,
} from '../../types';
import { PredictNavigationParamList } from '../../types/navigation';
import { formatPercentage, formatPrice } from '../../utils/format';
import { usePredictPositions } from '../../hooks/usePredictPositions';

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

  const [currentPosition, setCurrentPosition] =
    useState<PredictPositionType>(position);

  const { positions, loadPositions } = usePredictPositions({
    marketId: market.id,
    loadOnMount: false,
    refreshOnFocus: false,
  });

  // Update current position when positions change
  useEffect(() => {
    const updatedPosition = positions.find(
      (p) =>
        p.marketId === position.marketId && p.outcomeId === position.outcomeId,
    );

    if (updatedPosition) {
      setCurrentPosition(updatedPosition);
    }
  }, [positions, position.marketId, position.outcomeId]);

  // Auto-refresh for optimistic positions
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (currentPosition.optimistic) {
      intervalId = setInterval(() => {
        loadPositions({ isRefresh: true });
      }, 2000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [currentPosition.optimistic, loadPositions]);

  const {
    icon,
    initialValue,
    percentPnl,
    outcome,
    currentValue,
    title,
    optimistic,
    size,
  } = currentPosition;
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const { navigate } = navigation;
  const { executeGuardedAction } = usePredictActionGuard({
    providerId: currentPosition.providerId,
    navigation,
  });

  const groupItemTitle = market?.outcomes.find(
    (o) => o.id === currentPosition.outcomeId && o.groupItemTitle,
  )?.groupItemTitle;

  const onCashOut = () => {
    executeGuardedAction(
      () => {
        const _outcome = market?.outcomes.find(
          (o) => o.id === currentPosition.outcomeId,
        );
        navigate(Routes.PREDICT.MODALS.SELL_PREVIEW, {
          market,
          position: currentPosition,
          outcome: _outcome,
          entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_MARKET_DETAILS,
        });
      },
      { attemptedAction: PredictEventValues.ATTEMPTED_ACTION.CASHOUT },
    );
  };

  const renderValueText = () => {
    // Show skeleton for optimistic positions
    if (optimistic) {
      return <Skeleton width={70} height={20} />;
    }

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
            {strings('predict.position_info', {
              initialValue: formatPrice(initialValue, {
                maximumDecimals: 2,
              }),
              outcome,
              shares: formatPrice(size, {
                maximumDecimals: 2,
              }),
            })}
          </Text>
        </Box>
        <Box twClassName="items-end justify-end ml-auto shrink-0">
          {renderValueText()}
          {marketStatus === PredictMarketStatus.OPEN &&
            (optimistic ? (
              <Skeleton width={55} height={16} style={tw.style('mt-1')} />
            ) : (
              <Text
                variant={TextVariant.BodySMMedium}
                color={percentPnl > 0 ? TextColor.Success : TextColor.Error}
              >
                {formatPercentage(percentPnl)}
              </Text>
            ))}
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
            isDisabled={optimistic}
          />
        </Box>
      )}
    </Box>
  );
};

export default PredictPosition;

import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  NavigationProp,
  useIsFocused,
  useNavigation,
} from '@react-navigation/native';
import React, { useMemo } from 'react';
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
  Side,
} from '../../types';
import { PredictNavigationParamList } from '../../types/navigation';
import { formatPercentage, formatPrice } from '../../utils/format';
import { usePredictOptimisticPositionRefresh } from '../../hooks/usePredictOptimisticPositionRefresh';
import { usePredictOrderPreview } from '../../hooks/usePredictOrderPreview';

interface PredictPositionProps {
  position: PredictPositionType;
  market: PredictMarket;
  marketStatus: PredictMarketStatus;
}

const AUTO_REFRESH_TIMEOUT = 5000;

const PredictPosition: React.FC<PredictPositionProps> = ({
  position,
  market,
  marketStatus,
}: PredictPositionProps) => {
  const tw = useTailwind();

  const currentPosition = usePredictOptimisticPositionRefresh({
    position,
  });

  const { icon, initialValue, outcome, title, optimistic, size } =
    currentPosition;
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const { navigate } = navigation;
  const { executeGuardedAction } = usePredictActionGuard({
    providerId: currentPosition.providerId,
    navigation,
  });

  // Only auto-refresh when the screen is focused to avoid duplicate fetches
  const isFocused = useIsFocused();

  const autoRefreshTimeout =
    isFocused && marketStatus === PredictMarketStatus.OPEN
      ? AUTO_REFRESH_TIMEOUT
      : undefined;

  const { preview, isLoading: isPreviewLoading } = usePredictOrderPreview({
    providerId: currentPosition.providerId,
    marketId: currentPosition.marketId,
    outcomeId: currentPosition.outcomeId,
    outcomeTokenId: currentPosition.outcomeTokenId,
    side: Side.SELL,
    size: currentPosition.size,
    autoRefreshTimeout,
  });

  // Use preview data if available, fallback to position data on error or when preview is unavailable
  const currentValue = preview
    ? preview.minAmountReceived
    : currentPosition.currentValue;

  // Recalculate PnL based on preview data
  const cashPnl = useMemo(
    () => currentValue - initialValue,
    [currentValue, initialValue],
  );

  const percentPnl = useMemo(
    () => (initialValue > 0 ? (cashPnl / initialValue) * 100 : 0),
    [cashPnl, initialValue],
  );

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
    if (marketStatus === PredictMarketStatus.OPEN) {
      // Show skeleton for optimistic positions or while preview is loading
      if (optimistic || isPreviewLoading) {
        return <Skeleton width={70} height={20} />;
      }
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
            (optimistic || isPreviewLoading ? (
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

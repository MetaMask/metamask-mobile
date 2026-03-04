import { useEffect, useState } from 'react';
import Engine from '../../../../core/Engine';
import { RouteProp, useRoute } from '@react-navigation/native';
import { PredictNavigationParamList } from '../types/navigation';
import { PredictTradeStatus } from '../constants/eventNames';
import { parseAnalyticsProperties } from '../utils/analytics';

export const usePredictBuyInputState = () => {
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictBuyPreview'>>();
  // Track Predict Trade Transaction with initiated status when screen mounts
  const { PredictController } = Engine.context;

  const { market, outcome, outcomeToken, entryPoint, amount, transactionId } =
    route.params;

  const autoPlaceAmount =
    typeof amount === 'number' && amount > 0 ? amount : undefined;

  const [currentValue, setCurrentValue] = useState(() => autoPlaceAmount ?? 0);
  const [currentValueUSDString, setCurrentValueUSDString] = useState(() =>
    autoPlaceAmount ? autoPlaceAmount.toString() : '',
  );
  const [isInputFocused, setIsInputFocused] = useState(() => !autoPlaceAmount);

  const isRegularBuy = !transactionId;

  // Track Predict Trade Transaction with initiated status when screen mounts
  useEffect(() => {
    PredictController.setActiveOrder({
      market,
      outcome,
      outcomeToken,
    });
    if (isRegularBuy) {
      PredictController.setSelectedPaymentToken(null);
    }

    PredictController.trackPredictOrderEvent({
      status: PredictTradeStatus.INITIATED,
      analyticsProperties: parseAnalyticsProperties(
        market,
        outcomeToken,
        entryPoint,
      ),
      sharePrice: outcomeToken?.price,
    });
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    currentValue,
    setCurrentValue,
    currentValueUSDString,
    setCurrentValueUSDString,
    isInputFocused,
    setIsInputFocused,
  };
};

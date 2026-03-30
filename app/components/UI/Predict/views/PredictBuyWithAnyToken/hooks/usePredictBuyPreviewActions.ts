import {
  RouteProp,
  StackActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { PredictNavigationParamList } from '../../../types/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PlaceOrderOutcome } from '../../../hooks/usePredictPlaceOrder';
import {
  ActiveOrderState,
  OrderPreview,
  PlaceOrderParams,
} from '../../../types';
import { usePredictActiveOrder } from '../../../hooks/usePredictActiveOrder';
import { usePredictPaymentToken } from '../../../hooks/usePredictPaymentToken';
import Engine from '../../../../../../core/Engine';

interface UsePredictBuyActionsParams {
  currentValue: number;
  preview?: OrderPreview | null;
  analyticsProperties: PlaceOrderParams['analyticsProperties'];
  placeOrder: (params: PlaceOrderParams) => Promise<PlaceOrderOutcome>;
  depositAmount: number;
  setIsConfirming: (value: boolean) => void;
}

export const usePredictBuyActions = ({
  preview: livePreview,
  analyticsProperties,
  placeOrder,
  setIsConfirming,
}: UsePredictBuyActionsParams) => {
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictBuyPreview'>>();
  const navigation = useNavigation();
  const [isPreviewFromRouteUsed, setIsPreviewFromRouteUsed] = useState(false);
  const { resetSelectedPaymentToken } = usePredictPaymentToken();
  const { activeOrder } = usePredictActiveOrder();
  const currentState = useMemo(() => activeOrder?.state, [activeOrder?.state]);
  const { PredictController } = Engine.context;

  const batchId = useMemo(() => activeOrder?.batchId, [activeOrder?.batchId]);

  const { preview: previewFromRoute } = route.params;

  const handleConfirm = useCallback(async () => {
    setIsConfirming(true);
    PredictController.onConfirmOrder({
      isDeposit: false,
    });
  }, [setIsConfirming, PredictController]);

  const handleBack = useCallback(() => {
    PredictController.onOrderCancelled();
    navigation.dispatch(StackActions.pop());
  }, [PredictController, navigation]);

  const handleBackSwipe = useCallback(() => {
    PredictController.onOrderCancelled();
  }, [PredictController]);

  const handlePlaceOrder = useCallback(async () => {
    PredictController.onPlaceOrder();
    if (!livePreview && !previewFromRoute) {
      throw new Error('Preview is required');
    }

    const isFromPayWithAnyToken = batchId && !isPreviewFromRouteUsed;
    const previewToUse = isFromPayWithAnyToken ? previewFromRoute : livePreview;

    if (!previewToUse) {
      throw new Error('Preview is required');
    }

    if (isFromPayWithAnyToken) {
      resetSelectedPaymentToken();
      setIsPreviewFromRouteUsed(true);
    }

    const orderResult = await placeOrder({
      analyticsProperties,
      preview: previewToUse,
    });

    if (orderResult.status !== 'success') {
      PredictController.onOrderError();
      return;
    }

    PredictController.onOrderSuccess();
  }, [
    PredictController,
    livePreview,
    previewFromRoute,
    batchId,
    isPreviewFromRouteUsed,
    placeOrder,
    analyticsProperties,
    resetSelectedPaymentToken,
  ]);

  const handlePlaceOrderRef = useRef(handlePlaceOrder);
  handlePlaceOrderRef.current = handlePlaceOrder;

  useEffect(() => {
    if (
      currentState === ActiveOrderState.PLACE_ORDER ||
      currentState === ActiveOrderState.PLACING_ORDER
    ) {
      setIsConfirming(true);
    }
    if (currentState === ActiveOrderState.PREVIEW) {
      setIsConfirming(false);
    }
  }, [currentState, setIsConfirming]);

  useEffect(() => {
    if (currentState === ActiveOrderState.SUCCESS) {
      PredictController.onPlaceOrderEnd();
      navigation.dispatch(StackActions.pop());
    }
  }, [PredictController, currentState, navigation, setIsConfirming]);

  useEffect(() => {
    if (currentState === ActiveOrderState.PLACE_ORDER) {
      handlePlaceOrderRef.current();
    }
  }, [currentState]);

  return {
    handleBack,
    handleBackSwipe,
    handleConfirm,
  };
};

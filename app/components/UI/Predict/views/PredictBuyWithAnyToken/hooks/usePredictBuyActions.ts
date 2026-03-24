import { StackActions, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { PredictNavigationParamList } from '../../../types/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActiveOrderState,
  OrderPreview,
  PlaceOrderParams,
} from '../../../types';
import useApprovalRequest from '../../../../../Views/confirmations/hooks/useApprovalRequest';
import { usePredictActiveOrder } from '../../../hooks/usePredictActiveOrder';
import Engine from '../../../../../../core/Engine';
import { useSelector } from 'react-redux';
import { selectPredictWithAnyTokenEnabledFlag } from '../../../selectors/featureFlags';
import { PredictTradeStatus } from '../../../constants/eventNames';
import { PlaceOrderOutcome } from '../../../hooks/usePredictPlaceOrder';
import { useQueryClient } from '@tanstack/react-query';
import { predictQueries } from '../../../queries';
import { usePredictTrading } from '../../../hooks/usePredictTrading';

interface UsePredictBuyActionsParams {
  preview?: OrderPreview | null;
  analyticsProperties: PlaceOrderParams['analyticsProperties'];
  setIsConfirming: (value: boolean) => void;
  showOrderPlacedToast: () => void;
}

export const usePredictBuyActions = ({
  preview,
  analyticsProperties,
  setIsConfirming,
  showOrderPlacedToast,
}: UsePredictBuyActionsParams) => {
  const navigation =
    useNavigation<StackNavigationProp<PredictNavigationParamList>>();
  const { onReject: onApprovalReject, onConfirm: onApprovalConfirm } =
    useApprovalRequest();
  const { activeOrder } = usePredictActiveOrder();
  const { placeOrder } = usePredictTrading();
  const currentState = useMemo(() => activeOrder?.state, [activeOrder?.state]);
  const { PredictController } = Engine.context;
  const payWithAnyTokenEnabled = useSelector(
    selectPredictWithAnyTokenEnabledFlag,
  );
  const queryClient = useQueryClient();

  const onApprovalRejectRef = useRef(onApprovalReject);
  onApprovalRejectRef.current = onApprovalReject;

  useEffect(() => {
    const controller = Engine.context.PredictController;

    controller.trackPredictOrderEvent({
      status: PredictTradeStatus.INITIATED,
      analyticsProperties,
      sharePrice: analyticsProperties?.sharePrice,
    });
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!payWithAnyTokenEnabled) {
      return;
    }
    let initialized = false;
    const unsubscribe = navigation.addListener('transitionEnd', (e) => {
      if (!e.data.closing && !initialized) {
        initialized = true;
        PredictController.initiPayWithAnyToken();
      }
    });
    return () => {
      if (payWithAnyTokenEnabled) {
        unsubscribe();
        onApprovalRejectRef.current();
      }
    };
  }, [navigation, PredictController, payWithAnyTokenEnabled]);

  const handlePlaceOrder = useCallback(async () => {
    if (!preview) {
      return;
    }

    placeOrder({
      analyticsProperties,
      preview,
    });
  }, [preview, placeOrder, analyticsProperties]);

  const handlePlaceOrderRef = useRef(handlePlaceOrder);
  handlePlaceOrderRef.current = handlePlaceOrder;

  const handleConfirm = useCallback(async () => {
    setIsConfirming(true);
    if (currentState === ActiveOrderState.PAY_WITH_ANY_TOKEN) {
      onApprovalConfirm({
        deleteAfterResult: true,
        waitForResult: true,
        handleErrors: false,
      });
    }
    handlePlaceOrder();
  }, [setIsConfirming, currentState, handlePlaceOrder, onApprovalConfirm]);

  useEffect(() => {
    if (
      currentState === ActiveOrderState.DEPOSITING ||
      currentState === ActiveOrderState.PLACING_ORDER
    ) {
      setIsConfirming(true);
    }

    if (
      currentState === ActiveOrderState.PREVIEW ||
      currentState === ActiveOrderState.PAY_WITH_ANY_TOKEN
    ) {
      setIsConfirming(false);
    }
  }, [currentState, setIsConfirming]);

  useEffect(() => {
    if (currentState === ActiveOrderState.SUCCESS) {
      queryClient.invalidateQueries({
        queryKey: predictQueries.balance.keys.all(),
      });

      queryClient.invalidateQueries({
        queryKey: predictQueries.positions.keys.all(),
      });

      queryClient.invalidateQueries({
        queryKey: predictQueries.activity.keys.all(),
      });

      queryClient.invalidateQueries({
        queryKey: predictQueries.unrealizedPnL.keys.all(),
      });
      showOrderPlacedToast();
      PredictController.onPlaceOrderEnd();
      navigation.dispatch(StackActions.pop());
    }
  }, [
    PredictController,
    currentState,
    navigation,
    queryClient,
    setIsConfirming,
    showOrderPlacedToast,
  ]);

  return {
    handleConfirm,
  };
};

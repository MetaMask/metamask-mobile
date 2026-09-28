import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { toast, ToastSeverity } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Logger from '../../../../../util/Logger';
import { useParams } from '../../../../../util/navigation/navUtils';
import { useCancelLimitOrder } from '../../api/limitOrders/cancel';
import { CancelLimitOrderModal } from './CancelLimitOrderModal';
import type { CancelLimitOrderModalParams } from './types';
import { CancelLimitOrderOutcome } from '../../api/limitOrders/cancel/constants';

export const CancelLimitOrderModalScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { order } = useParams<CancelLimitOrderModalParams>();
  const {
    mutate: cancelLimitOrder,
    isPending,
    isError,
  } = useCancelLimitOrder();

  const handleConfirm = useCallback(() => {
    cancelLimitOrder(
      { orderId: order.id, accountAddress: order.account },
      {
        onSuccess: (outcome) => {
          if (navigation.isFocused()) {
            navigation.getParent()?.goBack();
          }

          if (outcome === CancelLimitOrderOutcome.Cancelled) {
            toast({
              severity: ToastSeverity.Success,
              title: strings('bridge.limit.order_canceled_title'),
              showCloseButton: false,
            });
          }
        },
        onError: (error) => {
          Logger.error(
            error,
            'CancelLimitOrderModalScreen: Failed to cancel limit order',
          );
        },
      },
    );
  }, [cancelLimitOrder, navigation, order.account, order.id]);

  return (
    <CancelLimitOrderModal
      onConfirm={handleConfirm}
      isCancelling={isPending}
      error={
        isError ? strings('bridge.limit.error_canceling_order') : undefined
      }
      goBack={navigation.goBack}
    />
  );
};

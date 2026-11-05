import { useCallback, useMemo } from 'react';
import { strings } from '../../../../../locales/i18n';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ToastVariants } from '../../../../component-library/components/Toast';
import type { ToastRef } from '../../../../component-library/components/Toast/Toast.types';
import type { ToastRegistration } from '../../../Nav/App/ControllerEventToastBridge';
import { useAppThemeFromContext } from '../../../../util/theme';
import type {
  PredictOrderOutcome,
  PredictOrderServiceOrderResolvedEvent,
} from '../services/PredictOrderService';

type OrderResolvedPayload = PredictOrderServiceOrderResolvedEvent['payload'][0];

interface OrderToastCopy {
  title: string;
  description?: string;
  isSuccess: boolean;
}

const copyFor = (outcome: PredictOrderOutcome): OrderToastCopy => {
  if (outcome.status === 'not_placed') {
    return {
      title: strings('predict_next.order_notification.not_placed_title'),
      description: strings(
        'predict_next.order_notification.not_placed_description',
      ),
      isSuccess: false,
    };
  }
  const { receipt } = outcome;
  const isSell = receipt.action === 'sell';
  switch (receipt.status) {
    case 'filled':
      return {
        title: strings(
          isSell
            ? 'predict_next.order_receipt.sell_filled_title'
            : 'predict_next.order_receipt.filled_title',
        ),
        isSuccess: true,
      };
    case 'partially_filled':
      return {
        title: strings(
          isSell
            ? 'predict_next.order_receipt.sell_partial_title'
            : 'predict_next.order_receipt.partial_title',
        ),
        isSuccess: true,
      };
    case 'rejected':
      return {
        title: strings('predict_next.order_receipt.rejected_title'),
        description: strings(
          isSell
            ? 'predict_next.order_receipt.sell_rejected_description'
            : 'predict_next.order_receipt.rejected_description',
        ),
        isSuccess: false,
      };
    case 'needs_manual_review':
      return {
        title: strings('predict_next.order_receipt.reconciling_title'),
        description: strings(
          'predict_next.order_receipt.reconciling_description',
        ),
        isSuccess: false,
      };
    default:
      // Only terminal receipts resolve an operation; `not_filled` is the
      // remaining one.
      return {
        title: strings('predict_next.order_receipt.not_filled_title'),
        isSuccess: false,
      };
  }
};

/**
 * The PredictNext Order completion notification. The app mounts it once,
 * next to the legacy Predict registrations and outside the Predict
 * navigator, so it stays subscribed across screen closure and Active Venue
 * changes. `PredictOrderService` publishes one `orderResolved` event per
 * operation; an operation an Order sheet is still showing is not repeated
 * here.
 */
export const usePredictOrderToastRegistrations = (): ToastRegistration[] => {
  const theme = useAppThemeFromContext();

  const handleOrderResolved = useCallback(
    (payload: unknown, showToast: ToastRef['showToast']): void => {
      const { presented, outcome } = payload as OrderResolvedPayload;
      if (presented) {
        return;
      }
      const { title, description, isSuccess } = copyFor(outcome);
      showToast({
        variant: ToastVariants.Icon,
        iconName: isSuccess ? IconName.Confirmation : IconName.Warning,
        iconColor: isSuccess
          ? theme.colors.success.default
          : theme.colors.warning.default,
        labelOptions: description
          ? [
              { label: title, isBold: true },
              { label: '\n', isBold: false },
              { label: description, isBold: false },
            ]
          : [{ label: title, isBold: true }],
        hasNoTimeout: false,
      });
    },
    [theme.colors.success.default, theme.colors.warning.default],
  );

  return useMemo(
    () => [
      {
        eventName: 'PredictOrderService:orderResolved',
        handler: handleOrderResolved,
      },
    ],
    [handleOrderResolved],
  );
};

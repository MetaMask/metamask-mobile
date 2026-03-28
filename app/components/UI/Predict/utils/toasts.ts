import { strings } from '../../../../../locales/i18n';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ToastVariants } from '../../../../component-library/components/Toast/Toast.types';
import ToastService from '../../../../core/ToastService/ToastService';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import { PREDICT_CONSTANTS } from '../constants/errors';

export function showOrderPlacedToast(): void {
  const traceId = `order-toast-${Date.now()}`;
  trace({
    name: TraceName.PredictOrderConfirmationToast,
    op: TraceOperation.PredictOperation,
    id: traceId,
    tags: {
      feature: PREDICT_CONSTANTS.FEATURE_NAME,
    },
  });

  ToastService.showToast({
    variant: ToastVariants.Icon,
    iconName: IconName.Check,
    labelOptions: [
      {
        label: strings('predict.order.prediction_placed'),
        isBold: true,
      },
    ],
    hasNoTimeout: false,
  });

  endTrace({
    name: TraceName.PredictOrderConfirmationToast,
    id: traceId,
    data: { success: true },
  });
}

export function showOrderFailedToast(): void {
  ToastService.showToast({
    variant: ToastVariants.Icon,
    iconName: IconName.Error,
    labelOptions: [
      {
        label: strings('predict.order.prediction_failed'),
        isBold: true,
      },
    ],
    hasNoTimeout: false,
  });
}

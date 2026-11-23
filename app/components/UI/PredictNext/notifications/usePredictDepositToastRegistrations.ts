import { useCallback, useMemo } from 'react';
import { IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { ToastVariants } from '../../../../component-library/components/Toast';
import type { ToastRef } from '../../../../component-library/components/Toast/Toast.types';
import type { ToastRegistration } from '../../../Nav/App/ControllerEventToastBridge';
import { useAppThemeFromContext } from '../../../../util/theme';
import type { PredictFundingServiceDepositResolvedEvent } from '../services/PredictFundingService';
import { formatUsd } from '../utils/formatUsd';

type DepositResolvedPayload =
  PredictFundingServiceDepositResolvedEvent['payload'][0];

/**
 * The PredictNext Deposit completion notification. Mounted unconditionally in
 * `App.tsx` next to `usePredictOrderToastRegistrations`, outside the Predict
 * navigator, so it fires on whichever screen is open when a watched deposit
 * completes. `PredictFundingService` publishes `depositResolved` once per
 * transition; only `completed` raises the completion toast.
 */
export const usePredictDepositToastRegistrations = (): ToastRegistration[] => {
  const theme = useAppThemeFromContext();

  const handleDepositResolved = useCallback(
    (payload: unknown, showToast: ToastRef['showToast']): void => {
      const { deposit } = payload as DepositResolvedPayload;
      if (deposit.status !== 'completed') {
        return;
      }
      showToast({
        variant: ToastVariants.Icon,
        iconName: IconName.Confirmation,
        iconColor: theme.colors.success.default,
        labelOptions: [
          {
            label: strings('predict_next.deposit.notification.completed_title'),
            isBold: true,
          },
          { label: '\n', isBold: false },
          {
            label: strings(
              'predict_next.deposit.notification.completed_description',
              { amount: formatUsd(deposit.amount) },
            ),
            isBold: false,
          },
        ],
        hasNoTimeout: false,
      });
    },
    [theme.colors.success.default],
  );

  return useMemo(
    () => [
      {
        eventName: 'PredictFundingService:depositResolved',
        handler: handleDepositResolved,
      },
    ],
    [handleDepositResolved],
  );
};

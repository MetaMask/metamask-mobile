import {
  Box,
  IconColor as ReactNativeDsIconColor,
  IconSize as ReactNativeDsIconSize,
} from '@metamask/design-system-react-native';
import { Spinner } from '@metamask/design-system-react-native/spinner';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import React, { useCallback, useMemo } from 'react';
import { strings } from '../../../../../locales/i18n';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ToastVariants } from '../../../../component-library/components/Toast';
import type { ToastRef } from '../../../../component-library/components/Toast/Toast.types';
import type { ToastRegistration } from '../../../Nav/App/ControllerEventToastBridge';
import { useAppThemeFromContext } from '../../../../util/theme';
import { hasTransactionType } from '../../../Views/confirmations/utils/transaction';
import { resolveWithdrawTokenInfo } from '../../../Views/confirmations/utils/withdraw-token-resolution';
import { store } from '../../../../store';

function getWithdrawConfirmedDescription(transactionId: string): string {
  const { isPostQuote, targetFiat, tokenSymbol } = resolveWithdrawTokenInfo(
    store.getState(),
    transactionId,
  );

  if (!isPostQuote || targetFiat === undefined) {
    return strings('perps.withdrawal.toast_completed_subtitle_generic');
  }

  return strings('perps.withdrawal.toast_completed_any_token_subtitle', {
    amount: `$${targetFiat.toFixed(2)}`,
    token: tokenSymbol,
  });
}

export const usePerpsWithdrawToastRegistrations = (): ToastRegistration[] => {
  const theme = useAppThemeFromContext();

  const processedRef = React.useRef<Set<string>>(new Set());

  const handleTransactionStatusUpdated = useCallback(
    (payload: unknown, showToast: ToastRef['showToast']): void => {
      const { transactionMeta } = payload as {
        transactionMeta: TransactionMeta;
      };

      if (
        !hasTransactionType(transactionMeta, [TransactionType.perpsWithdraw])
      ) {
        return;
      }

      const { id, status } = transactionMeta;
      const key = `${id}-${status}`;
      if (processedRef.current.has(key)) {
        return;
      }
      processedRef.current.add(key);

      if (status === TransactionStatus.approved) {
        showToast({
          variant: ToastVariants.Icon,
          labelOptions: [
            {
              label: strings('perps.withdrawal.toast_pending_title'),
              isBold: true,
            },
            { label: '\n', isBold: false },
            {
              label: strings('perps.withdrawal.toast_pending_subtitle'),
              isBold: false,
            },
          ],
          iconName: IconName.Loading,
          hasNoTimeout: false,
          startAccessory: (
            <Box twClassName="pr-3">
              <Spinner
                color={ReactNativeDsIconColor.PrimaryDefault}
                spinnerIconProps={{ size: ReactNativeDsIconSize.Lg }}
              />
            </Box>
          ),
        });
        return;
      }

      if (status === TransactionStatus.confirmed) {
        const description = getWithdrawConfirmedDescription(id);

        showToast({
          variant: ToastVariants.Icon,
          labelOptions: [
            {
              label: strings('perps.withdrawal.toast_completed_title'),
              isBold: true,
            },
            { label: '\n', isBold: false },
            { label: description, isBold: false },
          ],
          iconName: IconName.Confirmation,
          iconColor: theme.colors.success.default,
          hasNoTimeout: false,
        });
        return;
      }

      if (status === TransactionStatus.failed) {
        showToast({
          variant: ToastVariants.Icon,
          labelOptions: [
            {
              label: strings('perps.withdrawal.toast_error_title'),
              isBold: true,
            },
            { label: '\n', isBold: false },
            {
              label: strings('perps.withdrawal.toast_error_description'),
              isBold: false,
            },
          ],
          iconName: IconName.Error,
          iconColor: theme.colors.error.default,
          backgroundColor: theme.colors.accent04.normal,
          hasNoTimeout: false,
        });
      }
    },
    [
      theme.colors.accent04.normal,
      theme.colors.error.default,
      theme.colors.success.default,
    ],
  );

  return useMemo(
    () => [
      {
        eventName: 'TransactionController:transactionStatusUpdated',
        handler: handleTransactionStatusUpdated,
      },
    ],
    [handleTransactionStatusUpdated],
  );
};

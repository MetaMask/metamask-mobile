import {
  IconSize as ReactNativeDsIconSize,
  Spinner,
  toast,
  ToastSeverity,
} from '@metamask/design-system-react-native';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import React, { useCallback, useMemo } from 'react';
import { strings } from '../../../../../locales/i18n';
import type { ToastRegistration } from '../../../Nav/App/ControllerEventToastBridge';
import { resolveWithdrawTokenInfo } from '../../../Views/confirmations/utils/withdraw-token-resolution';
import { isPerpsPredictMoneyWithdraw } from '../../Money/utils/moneyTransactionGuards';
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
  const processedRef = React.useRef<Set<string>>(new Set());

  const handleTransactionStatusUpdated = useCallback(
    (payload: unknown): void => {
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
        toast({
          title: strings('perps.withdrawal.toast_pending_title'),
          description: strings('perps.withdrawal.toast_pending_subtitle'),
          hasNoTimeout: false,
          startAccessory: (
            <Spinner spinnerIconProps={{ size: ReactNativeDsIconSize.Lg }} />
          ),
        });
        return;
      }

      if (status === TransactionStatus.confirmed) {
        if (isPerpsPredictMoneyWithdraw(transactionMeta)) {
          return;
        }

        toast({
          title: strings('perps.withdrawal.toast_completed_title'),
          description: getWithdrawConfirmedDescription(id),
          severity: ToastSeverity.Success,
          hasNoTimeout: false,
        });
        return;
      }

      if (status === TransactionStatus.failed) {
        toast({
          title: strings('perps.withdrawal.toast_error_title'),
          description: strings('perps.withdrawal.toast_error_description'),
          severity: ToastSeverity.Danger,
          hasNoTimeout: false,
        });
      }
    },
    [],
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

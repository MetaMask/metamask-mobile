import { useCallback } from 'react';
import { Hex } from '@metamask/utils';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import Engine from '../../../../../core/Engine';
import EngineService from '../../../../../core/EngineService';
import { isTransactionPayWithdraw } from '../../utils/transaction';

/**
 * Whether the withdrawal token picker feature is enabled.
 * When false, withdrawals always use the default Polygon USDC.E.
 */
const isWithdrawalTokenPickerEnabled =
  process.env.MM_PREDICT_WITHDRAW_ANY_TOKEN === 'true';

export interface UseWithdrawalTokenResult {
  /** Whether this transaction is a withdrawal type */
  isWithdrawal: boolean;
  /** Whether the user can select a different withdrawal token (feature flag) */
  canSelectWithdrawalToken: boolean;
  /** Set the withdrawal destination token - updates TransactionPayController paymentToken */
  setWithdrawalToken: (token: { address: Hex; chainId: Hex }) => void;
}

/**
 * Hook for managing withdrawal token selection.
 * For withdrawal transactions, this calls TransactionPayController.updatePaymentToken
 * to set the destination token for the post-quote bridge.
 *
 * Note: The actual token data (symbol, balance, etc.) should be read from
 * useTransactionPayToken's payToken, not from this hook.
 */
export function useWithdrawalToken(): UseWithdrawalTokenResult {
  const transactionMeta = useTransactionMetadataRequest();
  const transactionId = transactionMeta?.id ?? '';
  const isWithdrawal = isTransactionPayWithdraw(transactionMeta);

  const setWithdrawalToken = useCallback(
    (newToken: { address: Hex; chainId: Hex }) => {
      if (!transactionId) {
        return;
      }

      const { NetworkController, TransactionPayController } = Engine.context;

      // Find the network client ID for the selected chain
      const networkClientId = NetworkController.findNetworkClientIdByChainId(
        newToken.chainId,
      );

      if (!networkClientId) {
        return;
      }

      // Update TransactionPayController's paymentToken (which represents destination in post-quote mode)
      // This triggers a new quote fetch with the selected destination token
      TransactionPayController.updatePaymentToken({
        transactionId,
        tokenAddress: newToken.address,
        chainId: newToken.chainId,
      });

      EngineService.flushState();
    },
    [transactionId],
  );

  return {
    isWithdrawal,
    canSelectWithdrawalToken: isWithdrawal && isWithdrawalTokenPickerEnabled,
    setWithdrawalToken,
  };
}

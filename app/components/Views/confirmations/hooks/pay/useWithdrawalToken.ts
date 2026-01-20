import { useCallback, useSyncExternalStore } from 'react';
import { Hex } from '@metamask/utils';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import Engine from '../../../../../core/Engine';
import EngineService from '../../../../../core/EngineService';
import { isWithdrawalTransaction } from '../../utils/transaction';
import { withdrawalTokenStore, WithdrawalToken } from './withdrawalTokenStore';

// Re-export the type for consumers
export type { WithdrawalToken } from './withdrawalTokenStore';

/**
 * Whether the withdrawal token picker feature is enabled.
 * When false, withdrawals always use the default Polygon USDC.E.
 */
const isWithdrawalTokenPickerEnabled =
  process.env.MM_PREDICT_WITHDRAWAL_TO_ANY_TOKEN === 'true';

export interface UseWithdrawalTokenResult {
  /** Whether this transaction is a withdrawal type */
  isWithdrawal: boolean;
  /** Whether the user can select a different withdrawal token (feature flag) */
  canSelectWithdrawalToken: boolean;
  /** The currently selected withdrawal token (defaults to Polygon USDC.E) */
  withdrawalToken: WithdrawalToken | undefined;
  /** Set the withdrawal destination token - updates TransactionPayController paymentToken */
  setWithdrawalToken: (token: {
    address: Hex;
    chainId: Hex;
    symbol?: string;
    decimals?: number;
    name?: string;
  }) => void;
}

/**
 * Hook for managing withdrawal token selection.
 * For withdrawal transactions, this calls TransactionPayController.updatePaymentToken
 * to set the destination token for the post-quote bridge.
 * Defaults to Polygon USDC.E if no token is selected.
 * Uses a simple store to share state across navigation screens.
 */
export function useWithdrawalToken(): UseWithdrawalTokenResult {
  const transactionMeta = useTransactionMetadataRequest();
  const transactionId = transactionMeta?.id ?? '';
  const isWithdrawal = isWithdrawalTransaction(transactionMeta);

  // Subscribe to store changes using useSyncExternalStore
  const storeToken = useSyncExternalStore(
    withdrawalTokenStore.subscribe.bind(withdrawalTokenStore),
    withdrawalTokenStore.getToken.bind(withdrawalTokenStore),
  );

  // Return the token for withdrawals, undefined otherwise
  const withdrawalToken = isWithdrawal ? storeToken : undefined;

  const setWithdrawalToken = useCallback(
    (newToken: {
      address: Hex;
      chainId: Hex;
      symbol?: string;
      decimals?: number;
      name?: string;
    }) => {
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

      // Update store state immediately for UI responsiveness
      withdrawalTokenStore.setToken({
        address: newToken.address,
        chainId: newToken.chainId,
        symbol: newToken.symbol,
        decimals: newToken.decimals,
        name: newToken.name,
      });

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
    withdrawalToken,
    setWithdrawalToken,
  };
}

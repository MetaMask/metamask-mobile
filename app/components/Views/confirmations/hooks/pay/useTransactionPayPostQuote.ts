import { useEffect, useRef } from 'react';
import Engine from '../../../../../core/Engine';
import { createProjectLogger, type Hex } from '@metamask/utils';
import {
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { useTransactionPayWithdraw } from './useTransactionPayWithdraw';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { computeProxyAddress } from '../../../../UI/Predict/providers/polymarket/safe/utils';
import { usePredictAccountState } from '../../../../UI/Predict/hooks/usePredictAccountState';

const log = createProjectLogger('transaction-pay-post-quote');

/**
 * Hook that sets isPostQuote=true for post-quote transactions.
 * This tells TransactionPayController to treat the paymentToken as
 * the destination (not source) and to create a post-quote bridge.
 *
 * Note: We don't set a default payment token here to avoid triggering
 * quote retrieval. The UI renders the default token when no payment
 * token is selected.
 *
 * When the confirmations_pay_post_quote feature flag is disabled via
 * canSelectWithdrawToken, this hook does nothing -
 * withdrawals will use same-token-same-chain flow without bridging.
 */
export function useTransactionPayPostQuote(): void {
  const isSet = useRef<string | undefined>(undefined);
  const { canSelectWithdrawToken } = useTransactionPayWithdraw();
  const transactionMeta = useTransactionMetadataRequest();
  const transactionId = transactionMeta?.id;
  const isPerpsWithdraw = hasTransactionType(transactionMeta, [
    TransactionType.perpsWithdraw,
  ]);
  const isMoneyAccountWithdraw = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountWithdraw,
  ]);
  const isPredictWithdraw = hasTransactionType(transactionMeta, [
    TransactionType.predictWithdraw,
  ]);

  const { data: accountState } = usePredictAccountState({
    enabled: isPredictWithdraw,
  });

  const isDepositWalletWithdraw =
    isPredictWithdraw && accountState?.walletType === 'deposit-wallet';

  useEffect(() => {
    if (
      !canSelectWithdrawToken ||
      !transactionId ||
      isSet.current === transactionId
    ) {
      return;
    }

    if (isPredictWithdraw && !accountState) {
      return;
    }

    const from = transactionMeta?.txParams?.from as Hex | undefined;

    // txParams.from is the Money Account. Wait until it is present so the
    // Relay quote can name it as the refund target.
    if (isMoneyAccountWithdraw && !from) {
      return;
    }

    try {
      const { TransactionPayController } = Engine.context;

      // Predict Safe withdrawals refund to the proxy.
      // Money Account withdrawals refund to the Money Account in txParams.from.
      // Relay funds the bridge from the EOA after the unvault transfer, so the
      // quote must send a failed fill's mUSD back to the Money Account.
      // Perps and Polymarket deposit-wallet withdrawals leave refundTo unset.
      let refundTo: Hex | undefined;
      if (isMoneyAccountWithdraw) {
        refundTo = from;
      } else if (!isPerpsWithdraw && !isDepositWalletWithdraw && from) {
        refundTo = computeProxyAddress(from);
      }

      TransactionPayController.setTransactionConfig(transactionId, (config) => {
        config.isPostQuote = true;

        if (refundTo) {
          config.refundTo = refundTo;
        }

        if (isPerpsWithdraw) {
          config.isHyperliquidSource = true;
        }

        if (isDepositWalletWithdraw) {
          config.isPolymarketDepositWallet = true;
        }
      });

      isSet.current = transactionId;

      log('Initialized post-quote transaction', {
        transactionId,
        refundTo,
        isPerpsWithdraw,
        isMoneyAccountWithdraw,
        isDepositWalletWithdraw,
      });
    } catch (error) {
      log('Error initializing post-quote transaction', {
        error,
        transactionId,
      });
    }
  }, [
    accountState,
    canSelectWithdrawToken,
    isDepositWalletWithdraw,
    isMoneyAccountWithdraw,
    isPerpsWithdraw,
    isPredictWithdraw,
    transactionId,
    transactionMeta?.txParams?.from,
  ]);
}

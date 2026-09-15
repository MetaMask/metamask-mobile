import type {
  CaipAccountId,
  CaipAssetType,
  CaipChainId,
} from '@metamask/utils';
import { SolScope } from '@metamask/keyring-api';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import {
  PaymentOverride,
  type TransactionPayIntent,
} from '@metamask/transaction-pay-controller';
import {
  hasTransactionType,
  TransactionType,
} from '@metamask/transaction-controller';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { useCallback, useMemo } from 'react';
import BigNumber from 'bignumber.js';
import { useSelector } from 'react-redux';

import Engine from '../../../../../core/Engine';
import EngineService from '../../../../../core/EngineService';
import Logger from '../../../../../util/Logger';
import { requestSolanaPayQuote } from '../../../../../core/Engine/controllers/transaction-pay-controller/request-solana-pay-quote';
import type { RootState } from '../../../../../reducers';
import { selectInternalAccountsById } from '../../../../../selectors/accountsController';
import { selectTransactionPayIntentByTransactionId } from '../../../../../selectors/transactionPayController';
import type { AssetType } from '../../types/token';
import { useAccountTokens } from '../send/useAccountTokens';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionPayToken } from './useTransactionPayToken';
import { buildEvmCaip19AssetId } from '../../../../../util/multichain/buildEvmCaip19AssetId';

type PaySourceSelection =
  | AssetType
  | { address: `0x${string}`; chainId: `0x${string}` };

export function isSolanaPayAsset(token: { chainId?: string }): boolean {
  return token.chainId === SolScope.Mainnet;
}

function getSourceAmountRaw(token: AssetType): string {
  return new BigNumber(token.balance)
    .shiftedBy(token.decimals)
    .integerValue(BigNumber.ROUND_DOWN)
    .toString(10);
}

export function buildSolanaPayIntent(
  token: AssetType,
  account: InternalAccount,
): TransactionPayIntent {
  const sourceChainId = token.chainId as CaipChainId;

  return {
    sourceAmountRaw: getSourceAmountRaw(token),
    sourceAccountId: `${sourceChainId}:${account.address}` as CaipAccountId,
    sourceAssetId: (token.assetId ?? token.address) as CaipAssetType,
    sourceChainId,
    sourceWalletAccountId: account.id,
    version: 2,
  };
}

export function useTransactionPaySource() {
  const transaction = useTransactionMetadataRequest();
  const transactionId = transaction?.id ?? '';
  const intent = useSelector((state: RootState) =>
    selectTransactionPayIntentByTransactionId(state, transactionId),
  );
  const accounts = useSelector(selectInternalAccountsById);
  const assets = useAccountTokens({ includeNoBalance: true });
  const { payToken, setPayToken } = useTransactionPayToken();
  const solanaIntent =
    intent?.sourceChainId === SolScope.Mainnet ? intent : undefined;
  const solanaAsset = useMemo(
    () =>
      solanaIntent
        ? assets.find(
            (asset) =>
              asset.accountId === solanaIntent.sourceWalletAccountId &&
              (asset.assetId ?? asset.address) === solanaIntent.sourceAssetId,
          )
        : undefined,
    [assets, solanaIntent],
  );

  const setPaySource = useCallback(
    (token: PaySourceSelection) => {
      if (!transactionId) {
        return;
      }

      const accountId = 'accountId' in token ? token.accountId : undefined;
      const account = accountId ? accounts[accountId] : undefined;

      if (!isSolanaPayAsset(token)) {
        if (solanaIntent) {
          Engine.context.TransactionPayController.setTransactionConfig(
            transactionId,
            (config) => {
              config.atomic = undefined;
              config.paymentOverride = undefined;
            },
          );
        }
        if (account) {
          const chainId = token.chainId as `0x${string}`;
          const sourceChainId = toEvmCaipChainId(chainId);
          Engine.context.TransactionPayController.setPayIntent({
            transactionId,
            intent: {
              sourceAccountId:
                `${sourceChainId}:${account.address}` as CaipAccountId,
              sourceAssetId: buildEvmCaip19AssetId(
                token.address,
                chainId,
              ) as CaipAssetType,
              sourceAmountRaw: getSourceAmountRaw(token as AssetType),
              sourceChainId,
              sourceWalletAccountId: account.id,
              version: 2,
            },
          });
        }
        setPayToken({
          address: token.address as `0x${string}`,
          chainId: token.chainId as `0x${string}`,
        });
        return;
      }

      if (!account) {
        throw new Error('Solana Pay source account unavailable');
      }

      if (
        hasTransactionType(transaction, [TransactionType.moneyAccountDeposit])
      ) {
        Engine.context.TransactionPayController.setTransactionConfig(
          transactionId,
          (config) => {
            config.atomic = false;
            config.paymentOverride = PaymentOverride.MoneyAccount;
          },
        );
      }

      Engine.context.TransactionPayController.setPayIntent({
        transactionId,
        intent: buildSolanaPayIntent(token as AssetType, account),
      });
      Engine.context.TransactionPayController.updateFiatPayment({
        transactionId,
        callback: (fiatPayment) => {
          fiatPayment.selectedPaymentMethodId = undefined;
        },
      });

      const targetAmount =
        Engine.context.TransactionPayController.state.transactionData[
          transactionId
        ]?.tokens[0]?.amountRaw;
      if (targetAmount && targetAmount !== '0') {
        requestSolanaPayQuote(transactionId).catch((error) => {
          Logger.error(error as Error, 'Failed to update Solana Pay quote');
        });
      }

      EngineService.flushState();
    },
    [accounts, setPayToken, solanaIntent, transaction, transactionId],
  );

  return {
    isSolana: Boolean(solanaIntent),
    paySource: solanaAsset ?? payToken,
    setPaySource,
    solanaAsset,
    solanaIntent,
  };
}

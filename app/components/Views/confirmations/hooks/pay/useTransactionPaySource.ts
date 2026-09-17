import {
  parseCaipAccountId,
  type CaipAccountId,
  type CaipAssetType,
} from '@metamask/utils';
import { SolScope } from '@metamask/keyring-api';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import {
  PaymentOverride,
  type TransactionPaySource,
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
import { selectInternalAccountsById } from '../../../../../selectors/accountsController';
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

export function getSourceAmountRaw(token: AssetType): string {
  return new BigNumber(token.balance)
    .shiftedBy(token.decimals)
    .integerValue(BigNumber.ROUND_DOWN)
    .toString(10);
}

export function buildSolanaPaySource(
  token: AssetType,
  account: InternalAccount,
): TransactionPaySource {
  const sourceChainId = token.chainId as typeof SolScope.Mainnet;

  return {
    sourceAccountId: `${sourceChainId}:${account.address}` as CaipAccountId,
    sourceAssetId: (token.assetId ?? token.address) as CaipAssetType,
  };
}

export function useTransactionPaySource() {
  const transaction = useTransactionMetadataRequest();
  const transactionId = transaction?.id ?? '';
  const source = transaction?.metamaskPay?.source;
  const accounts = useSelector(selectInternalAccountsById);
  const assets = useAccountTokens({ includeNoBalance: true });
  const { payToken, setPayToken } = useTransactionPayToken();
  const solanaSource = source?.sourceAccountId.startsWith(
    `${SolScope.Mainnet}:`,
  )
    ? source
    : undefined;
  const solanaAccountAddress = solanaSource
    ? parseCaipAccountId(solanaSource.sourceAccountId).address
    : undefined;
  const solanaAsset = useMemo(
    () =>
      solanaSource
        ? assets.find((asset) => {
            const account = asset.accountId
              ? accounts[asset.accountId]
              : undefined;
            return (
              account?.address === solanaAccountAddress &&
              (asset.assetId ?? asset.address) === solanaSource.sourceAssetId
            );
          })
        : undefined,
    [accounts, assets, solanaAccountAddress, solanaSource],
  );

  const setPaySource = useCallback(
    (token: PaySourceSelection) => {
      if (!transactionId) {
        return;
      }

      const accountId = 'accountId' in token ? token.accountId : undefined;
      const account = accountId ? accounts[accountId] : undefined;

      if (!isSolanaPayAsset(token)) {
        if (solanaSource) {
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
          Engine.context.TransactionPayController.setPaySource({
            transactionId,
            source: {
              sourceAccountId:
                `${sourceChainId}:${account.address}` as CaipAccountId,
              sourceAssetId: buildEvmCaip19AssetId(
                token.address,
                chainId,
              ) as CaipAssetType,
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

      const solanaToken = token as AssetType;
      Engine.context.TransactionPayController.setPaySource({
        transactionId,
        source: buildSolanaPaySource(solanaToken, account),
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
        requestSolanaPayQuote({
          sourceAmountRaw: getSourceAmountRaw(solanaToken),
          sourceWalletAccountId: account.id,
          transactionId,
        }).catch((error) => {
          Logger.error(error as Error, 'Failed to update Solana Pay quote');
        });
      }

      EngineService.flushState();
    },
    [accounts, setPayToken, solanaSource, transaction, transactionId],
  );

  return {
    isSolana: Boolean(solanaSource),
    paySource: solanaAsset ?? payToken,
    setPaySource,
    solanaAsset,
    solanaExecution: transaction?.metamaskPay?.solanaExecution,
    solanaSource,
  };
}

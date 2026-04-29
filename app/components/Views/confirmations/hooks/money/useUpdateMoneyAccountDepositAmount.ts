import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { BigNumber } from 'bignumber.js';
import { Hex } from '@metamask/utils';
import { selectMoneyAccountVaultConfig } from '../../../../../selectors/featureFlagController/moneyAccount';
import { buildMoneyAccountDepositBatch } from '../../../../UI/Money/utils/moneyAccountTransactions';
import { updateAtomicBatchData } from '../../../../../util/transaction-controller';
import { getProviderByChainId } from '../../../../../util/notifications/methods/common';
import { calcTokenValue } from '../../../../../util/transactions';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import Logger from '../../../../../util/Logger';

const LOG_TAG = '[Money Account]';

/** Decimals for USDC (the deposit asset). */
const USDC_DECIMALS = 6;

/**
 * Returns an async callback that, given a human-readable amount (e.g. "12.50"),
 * rebuilds the Money Account approve + deposit batch transactions and updates
 * both entries in the pending atomic batch via `updateAtomicBatchData`.
 *
 * This is the Money Account equivalent of `useUpdateTokenAmount`, replacing the
 * zero-amount placeholder submitted by `initiateDeposit` with calldata built
 * from the amount the user typed in the Custom Amount confirmation screen.
 */
export function useUpdateMoneyAccountDepositAmount() {
  const vaultConfig = useSelector(selectMoneyAccountVaultConfig);
  const transactionMeta = useTransactionMetadataRequest();
  const transactionId = transactionMeta?.id;

  const updateMoneyAccountDepositAmount = useCallback(
    async (amountHuman: string) => {
      if (!vaultConfig || !transactionId) {
        Logger.error(
          new Error(`${LOG_TAG} Missing vault config or transaction ID`),
          `${LOG_TAG} Cannot update deposit amount`,
        );
        return;
      }

      const {
        chainId,
        boringVault,
        tellerAddress,
        accountantAddress,
        lensAddress,
      } = vaultConfig;
      const chainIdHex = chainId as Hex;

      const provider = getProviderByChainId(chainIdHex);
      if (!provider) {
        Logger.error(
          new Error(`${LOG_TAG} No provider available for chain ${chainId}`),
          `${LOG_TAG} Cannot update deposit amount`,
        );
        return;
      }

      const amountRaw = calcTokenValue(
        amountHuman,
        USDC_DECIMALS,
      ).decimalPlaces(0, BigNumber.ROUND_UP);
      const amount = BigInt(amountRaw.toFixed(0));

      try {
        const { approveTx, depositTx } = await buildMoneyAccountDepositBatch({
          amount,
          chainId: chainIdHex,
          boringVault,
          tellerAddress,
          accountantAddress,
          lensAddress,
          provider,
        });

        await updateAtomicBatchData({
          transactionId,
          transactionIndex: 0,
          transactionData: approveTx.params.data,
        });

        await updateAtomicBatchData({
          transactionId,
          transactionIndex: 1,
          transactionData: depositTx.params.data,
        });
      } catch (error) {
        Logger.error(
          error as Error,
          `${LOG_TAG} Failed to update deposit amount`,
        );
      }
    },
    [vaultConfig, transactionId],
  );

  return { updateMoneyAccountDepositAmount };
}

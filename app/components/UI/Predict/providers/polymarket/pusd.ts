import { Interface } from '@ethersproject/abi';
import type { TransactionMeta } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';

import { generateApprovalData } from '../../../../../util/transactions';
import {
  updateAtomicBatchData,
  updateTransaction,
} from '../../../../../util/transaction-controller';
import Logger from '../../../../../util/Logger';
import { COLLATERAL_ONRAMP_WRAP_ABI } from './constants';

const FOUR_BYTE_APPROVE = '0x095ea7b3';
const FOUR_BYTE_WRAP = '0x62355638';

const onrampInterface = new Interface(COLLATERAL_ONRAMP_WRAP_ABI);

/**
 * Update the pUSD deposit batch amount across all related fields.
 *
 * Updates the approve calldata, wrap calldata, and requiredAssets amount so
 * the TransactionPayController sources the correct USDC.e amount for quoting.
 *
 * NOTE: Each update currently triggers its own state change event, which
 * causes multiple re-parses and re-quotes in the TransactionPayController.
 * Ideally this would be a single atomic state update — pending a batch
 * update API on the TransactionController that can set nested call data and
 * top-level fields together.
 */
export function updatePredictDepositData({
  transactionId,
  transactionMeta,
  amountHex,
}: {
  transactionId: string;
  transactionMeta: TransactionMeta;
  amountHex: string;
}): void {
  const { nestedTransactions, requiredAssets } = transactionMeta;

  if (requiredAssets?.[0]) {
    updateTransaction(
      {
        ...transactionMeta,
        requiredAssets: [
          { ...requiredAssets[0], amount: `0x${amountHex}` as Hex },
          ...requiredAssets.slice(1),
        ],
      },
      'Predict deposit amount update',
    );
  }

  nestedTransactions?.forEach((nestedTx, index) => {
    const fourByte = nestedTx.data?.slice(0, 10);

    if (fourByte === FOUR_BYTE_APPROVE && nestedTx.data) {
      const spender = `0x${nestedTx.data.slice(34, 74)}`;

      const approveData = generateApprovalData({
        spender,
        value: amountHex,
      }) as Hex;

      updateAtomicBatchData({
        transactionId,
        transactionIndex: index,
        transactionData: approveData,
      }).catch((error) => {
        Logger.error(error, 'Failed to update approve amount');
      });
    }

    if (fourByte === FOUR_BYTE_WRAP) {
      const decoded = onrampInterface.decodeFunctionData(
        'wrap',
        nestedTx.data as string,
      );

      const wrapData = onrampInterface.encodeFunctionData('wrap', [
        decoded.token,
        decoded.to,
        `0x${amountHex}`,
      ]) as Hex;

      updateAtomicBatchData({
        transactionId,
        transactionIndex: index,
        transactionData: wrapData,
      }).catch((error) => {
        Logger.error(error, 'Failed to update wrap amount');
      });
    }
  });
}

import { useCallback } from 'react';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';
import { useSelector } from 'react-redux';
import { selectSingleTokenByAddressAndChainId } from '../../../../../selectors/tokensController';
import { RootState } from '../../../../../reducers';
import { Hex } from '@metamask/utils';
import {
  calcTokenValue,
  generateTransferData,
} from '../../../../../util/transactions';
import {
  updateAtomicBatchData,
  updateEditableParams,
} from '../../../../../util/transaction-controller';
import { BigNumber } from 'bignumber.js';
import { parseStandardTokenTransactionData } from '../../utils/transaction';
import { getTokenTransferData } from '../../utils/transaction-pay';

export function useUpdateTokenAmount() {
  const transactionMeta = useTransactionMetadataRequest();
  const { chainId } = transactionMeta ?? {};
  const transactionId = transactionMeta?.id ?? '';

  const {
    data,
    to,
    index: nestedCallIndex,
  } = (transactionMeta && getTokenTransferData(transactionMeta)) ?? {};

  const { decimals } =
    useSelector((state: RootState) =>
      selectSingleTokenByAddressAndChainId(state, to as Hex, chainId as Hex),
    ) ?? {};

  const updateTokenAmount = useCallback(
    (amountHuman: string) => {
      const amountRaw = calcTokenValue(
        amountHuman,
        decimals ?? 18,
      ).decimalPlaces(0, BigNumber.ROUND_UP);

      const transactionData = parseStandardTokenTransactionData(data);
      const recipient = transactionData?.args?._to;

      const newData = generateTransferData('transfer', {
        toAddress: recipient,
        amount: amountRaw.toString(16),
      }) as Hex;

      if (nestedCallIndex !== undefined) {
        updateAtomicBatchData({
          transactionId,
          transactionIndex: nestedCallIndex,
          transactionData: newData,
        }).catch((error) => {
          console.error(
            'Failed to update token amount in nested transaction',
            error,
          );
        });

        return;
      }

      updateEditableParams(transactionId as string, {
        data: newData,
        updateType: false,
      });
    },
    [data, decimals, nestedCallIndex, transactionId],
  );

  return {
    updateTokenAmount,
  };
}

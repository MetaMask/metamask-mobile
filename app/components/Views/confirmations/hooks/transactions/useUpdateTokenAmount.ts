import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';
import { useDispatch, useSelector } from 'react-redux';
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
import {
  getTokenAddress,
  getTokenTransferData,
} from '../../utils/transaction-pay';
import { useConfirmationContext } from '../../context/confirmation-context';
import Logger from '../../../../../util/Logger';
import { updateTransactionPayData } from '../../utils/external/update-transaction-pay-data';

export function useUpdateTokenAmount() {
  const dispatch = useDispatch();
  const { setIsTransactionDataUpdating } = useConfirmationContext();
  const transactionMeta = useTransactionMetadataRequest();
  const { chainId } = transactionMeta ?? {};
  const transactionId = transactionMeta?.id ?? '';
  const [previousAmountRaw, setPreviousAmountRaw] = useState<string>();

  const { data, index: nestedCallIndex } =
    (transactionMeta && getTokenTransferData(transactionMeta)) ?? {};

  const tokenAddress = getTokenAddress(transactionMeta);

  const { decimals } =
    useSelector((state: RootState) =>
      selectSingleTokenByAddressAndChainId(
        state,
        tokenAddress as Hex,
        chainId as Hex,
      ),
    ) ?? {};

  const amountRaw = useMemo(() => {
    const requiredAssetAmount = transactionMeta?.requiredAssets?.[0]?.amount;

    if (requiredAssetAmount) {
      return new BigNumber(requiredAssetAmount).toString(10);
    }

    const transactionData = parseStandardTokenTransactionData(data);
    return new BigNumber(transactionData?.args?._value.toString()).toString(10);
  }, [data, transactionMeta]);

  const isUpdating =
    Boolean(previousAmountRaw) && amountRaw === previousAmountRaw;

  useEffect(() => {
    setIsTransactionDataUpdating(isUpdating);

    if (!isUpdating) {
      setPreviousAmountRaw(undefined);
    }
  }, [dispatch, isUpdating, transactionId, setIsTransactionDataUpdating]);

  const updateTokenAmount = useCallback(
    (amountHuman: string) => {
      const newAmountRaw = calcTokenValue(
        amountHuman,
        decimals ?? 18,
      ).decimalPlaces(0, BigNumber.ROUND_UP);

      if (newAmountRaw.isEqualTo(amountRaw)) {
        return;
      }

      const newAmountHex = newAmountRaw.toString(16);

      setPreviousAmountRaw(amountRaw);

      if (
        transactionMeta &&
        updateTransactionPayData({
          transactionId,
          transactionMeta,
          amountHex: newAmountHex,
        })
      ) {
        return;
      }

      const transactionData = parseStandardTokenTransactionData(data);
      const recipient = transactionData?.args?._to;

      const newData = generateTransferData('transfer', {
        toAddress: recipient,
        amount: newAmountHex,
      }) as Hex;

      if (nestedCallIndex !== undefined) {
        updateAtomicBatchData({
          transactionId,
          transactionIndex: nestedCallIndex,
          transactionData: newData,
        }).catch((error) => {
          Logger.error(
            error,
            'Failed to update token amount in nested transaction',
          );
        });

        return;
      }

      updateEditableParams(transactionId as string, {
        data: newData,
        updateType: false,
      });
    },
    [
      amountRaw,
      data,
      decimals,
      nestedCallIndex,
      transactionId,
      transactionMeta,
    ],
  );

  return {
    updateTokenAmount,
  };
}

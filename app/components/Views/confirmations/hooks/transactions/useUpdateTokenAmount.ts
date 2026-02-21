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
import { getTokenTransferData } from '../../utils/transaction-pay';
import { useConfirmationContext } from '../../context/confirmation-context';

export function useUpdateTokenAmount() {
  const dispatch = useDispatch();
  const { setIsTransactionDataUpdating } = useConfirmationContext();
  const transactionMeta = useTransactionMetadataRequest();
  const { chainId } = transactionMeta ?? {};
  const transactionId = transactionMeta?.id ?? '';
  const [previousAmountRaw, setPreviousAmountRaw] = useState<string>();

  const {
    data,
    to,
    index: nestedCallIndex,
  } = (transactionMeta && getTokenTransferData(transactionMeta)) ?? {};

  const { decimals } =
    useSelector((state: RootState) =>
      selectSingleTokenByAddressAndChainId(state, to as Hex, chainId as Hex),
    ) ?? {};

  const amountRaw = useMemo(() => {
    const transactionData = parseStandardTokenTransactionData(data);
    return new BigNumber(transactionData?.args?._value.toString()).toString(10);
  }, [data]);

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

      const transactionData = parseStandardTokenTransactionData(data);
      const recipient = transactionData?.args?._to;

      const newData = generateTransferData('transfer', {
        toAddress: recipient,
        amount: newAmountRaw.toString(16),
      }) as Hex;

      setPreviousAmountRaw(amountRaw);

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
    [amountRaw, data, decimals, nestedCallIndex, transactionId],
  );

  return {
    updateTokenAmount,
  };
}

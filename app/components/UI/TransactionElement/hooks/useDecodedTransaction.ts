import { useEffect, useRef, useState } from 'react';
import decodeTransaction from '../utils';
import type {
  DecodedTransactionElement,
  DecodedTransactionDetails,
  DecodedTransaction,
} from '../types';

interface UseDecodedTransactionParams {
  props: Record<string, unknown>;
  txChainId?: string;
  swapsTransactions: unknown;
  selectedAddress?: string;
}

interface DecodedTransactionState {
  transactionElement?: DecodedTransactionElement;
  transactionDetails?: DecodedTransactionDetails;
}

const useDecodedTransaction = ({
  props,
  txChainId,
  swapsTransactions,
  selectedAddress,
}: UseDecodedTransactionParams): DecodedTransactionState => {
  const [transactionData, setTransactionData] =
    useState<DecodedTransactionState>({
      transactionElement: undefined,
      transactionDetails: undefined,
    });
  const mountedRef = useRef(false);
  const decodeRequestRef = useRef(0);
  const latestPropsRef = useRef(props);

  useEffect(() => {
    latestPropsRef.current = props;
  });

  useEffect(() => {
    mountedRef.current = true;
    const requestId = ++decodeRequestRef.current;

    const decode = async () => {
      const decodedTransaction: DecodedTransaction = await decodeTransaction(
        latestPropsRef.current,
      );
      const [transactionElement, transactionDetails] = decodedTransaction;

      if (mountedRef.current && requestId === decodeRequestRef.current) {
        setTransactionData({
          transactionElement,
          transactionDetails,
        });
      }
    };

    decode();

    return () => {
      mountedRef.current = false;
    };
  }, [txChainId, swapsTransactions, selectedAddress]);

  return transactionData;
};

export default useDecodedTransaction;

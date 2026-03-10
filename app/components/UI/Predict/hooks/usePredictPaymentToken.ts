import { Hex } from '@metamask/utils';
import { useCallback, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { useTransactionPayToken } from '../../../Views/confirmations/hooks/pay/useTransactionPayToken';
import { useTransactionMetadataRequest } from '../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import { AssetType } from '../../../Views/confirmations/types/token';
import {
  PREDICT_BALANCE_PLACEHOLDER_ADDRESS,
  PREDICT_BALANCE_TOKEN_KEY,
} from '../constants/transactions';
import { selectPredictSelectedPaymentToken } from '../selectors/predictController';

interface UsePredictPaymentTokenParams {
  onTokenSelected?: ({
    tokenAddress,
    tokenKey,
  }: {
    tokenAddress: string | null;
    tokenKey: string | null;
  }) => Promise<void> | void;
}

export interface UsePredictPaymentTokenResult {
  onPaymentTokenChange: (token: AssetType | null) => void;
  isPredictBalanceSelected: boolean;
  selectedPaymentToken: {
    address: string;
    chainId: string;
    symbol?: string;
  } | null;
  resetSelectedPaymentToken: () => void;
}

export function usePredictPaymentToken({
  onTokenSelected,
}: UsePredictPaymentTokenParams = {}): UsePredictPaymentTokenResult {
  const { payToken, setPayToken } = useTransactionPayToken();
  const transactionMeta = useTransactionMetadataRequest();
  const selectedPaymentToken = useSelector(selectPredictSelectedPaymentToken);
  const isPredictBalanceSelected = selectedPaymentToken === null;
  const hasInitializedSelectionRef = useRef(false);
  const previousSelectedTokenKeyRef = useRef<string | null>(null);

  const { PredictController } = Engine.context;

  const onPaymentTokenChange = useCallback(
    (token: AssetType | null) => {
      if (!token) {
        return;
      }

      if (token.address === PREDICT_BALANCE_PLACEHOLDER_ADDRESS) {
        PredictController.setSelectedPaymentToken(null);
        return;
      }

      Engine.context.PredictController?.setSelectedPaymentToken({
        address: token.address,
        chainId: token.chainId ?? '',
        symbol: token.symbol,
      });
      if (transactionMeta?.id) {
        setPayToken({
          address: token.address as Hex,
          chainId: (token.chainId ?? '') as Hex,
        });
      }
    },
    [PredictController, setPayToken, transactionMeta?.id],
  );

  useEffect(() => {
    if (!transactionMeta || isPredictBalanceSelected || !selectedPaymentToken) {
      return;
    }

    const hasSelectedTokenApplied =
      payToken?.address?.toLowerCase() ===
        selectedPaymentToken.address.toLowerCase() &&
      payToken?.chainId?.toLowerCase() ===
        selectedPaymentToken.chainId.toLowerCase();

    if (!hasSelectedTokenApplied) {
      setPayToken({
        address: selectedPaymentToken.address as Hex,
        chainId: selectedPaymentToken.chainId as Hex,
      });
    }
  }, [
    transactionMeta,
    isPredictBalanceSelected,
    selectedPaymentToken,
    payToken?.address,
    payToken?.chainId,
    setPayToken,
  ]);

  useEffect(() => {
    const selectedTokenAddress = selectedPaymentToken?.address ?? null;
    const selectedTokenKey = isPredictBalanceSelected
      ? PREDICT_BALANCE_TOKEN_KEY
      : selectedTokenAddress;

    if (!hasInitializedSelectionRef.current) {
      hasInitializedSelectionRef.current = true;
      previousSelectedTokenKeyRef.current = selectedTokenKey;
      return;
    }

    if (previousSelectedTokenKeyRef.current === selectedTokenKey) {
      return;
    }

    previousSelectedTokenKeyRef.current = selectedTokenKey;
    const callbackResult = onTokenSelected?.({
      tokenAddress: selectedTokenAddress,
      tokenKey: selectedTokenKey,
    });

    if (callbackResult) {
      Promise.resolve(callbackResult).catch(() => undefined);
    }
  }, [
    isPredictBalanceSelected,
    onTokenSelected,
    selectedPaymentToken?.address,
  ]);

  const resetSelectedPaymentToken = useCallback(() => {
    PredictController.setSelectedPaymentToken(null);
  }, [PredictController]);

  return {
    onPaymentTokenChange,
    isPredictBalanceSelected,
    selectedPaymentToken,
    resetSelectedPaymentToken,
  };
}

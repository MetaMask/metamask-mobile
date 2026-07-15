import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { AssetType } from '../../../Views/confirmations/types/token';
import { selectPredictSelectedPaymentToken } from '../selectors/predictController';

export type PredictPaymentTokenInput =
  | AssetType
  | { address: string; chainId: string; symbol?: string }
  | null;

export interface UsePredictPaymentTokenResult {
  onPaymentTokenChange: (token: PredictPaymentTokenInput) => void;
  isPredictBalanceSelected: boolean;
  selectedPaymentToken: {
    address: string;
    chainId: string;
    symbol?: string;
  } | null;
  resetSelectedPaymentToken: () => void;
}

export function usePredictPaymentToken(): UsePredictPaymentTokenResult {
  const selectedPaymentToken = useSelector(selectPredictSelectedPaymentToken);
  const isPredictBalanceSelected = selectedPaymentToken === null;

  const { PredictController } = Engine.context;

  const onPaymentTokenChange = useCallback(
    (token: PredictPaymentTokenInput) => {
      if (!token) {
        return;
      }

      PredictController.selectPaymentToken(token as AssetType);
    },
    [PredictController],
  );

  const resetSelectedPaymentToken = useCallback(() => {
    PredictController.selectPaymentToken(null);
  }, [PredictController]);

  return {
    onPaymentTokenChange,
    isPredictBalanceSelected,
    selectedPaymentToken,
    resetSelectedPaymentToken,
  };
}

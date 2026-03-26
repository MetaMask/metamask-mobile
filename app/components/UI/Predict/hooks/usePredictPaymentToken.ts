import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { AssetType } from '../../../Views/confirmations/types/token';
import { selectPredictSelectedPaymentToken } from '../selectors/predictController';

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

export function usePredictPaymentToken(): UsePredictPaymentTokenResult {
  const selectedPaymentToken = useSelector(selectPredictSelectedPaymentToken);
  const isPredictBalanceSelected = selectedPaymentToken === null;

  const { PredictController } = Engine.context;

  const onPaymentTokenChange = useCallback(
    (token: AssetType | null) => {
      if (!token) {
        return;
      }

      PredictController.selectPaymentToken(token);
    },
    [PredictController],
  );

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

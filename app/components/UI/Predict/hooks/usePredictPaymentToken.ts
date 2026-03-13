import { Hex } from '@metamask/utils';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { useTransactionPayToken } from '../../../Views/confirmations/hooks/pay/useTransactionPayToken';
import { AssetType } from '../../../Views/confirmations/types/token';
import { PREDICT_BALANCE_PLACEHOLDER_ADDRESS } from '../constants/transactions';
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
  const { setPayToken } = useTransactionPayToken();
  const selectedPaymentToken = useSelector(selectPredictSelectedPaymentToken);
  const isPredictBalanceSelected = selectedPaymentToken === null;

  const { PredictController } = Engine.context;

  const onPaymentTokenChange = useCallback(
    (token: AssetType | null) => {
      if (!token) {
        return;
      }

      if (token.address !== PREDICT_BALANCE_PLACEHOLDER_ADDRESS) {
        setPayToken({
          address: token.address as Hex,
          chainId: (token.chainId ?? '') as Hex,
        });
      }

      PredictController.onBuyPaymentTokenChange(token);
    },
    [PredictController, setPayToken],
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

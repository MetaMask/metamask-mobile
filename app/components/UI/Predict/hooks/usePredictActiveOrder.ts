import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectSelectedAccountGroupId } from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectPredictActiveOrderByAddress } from '../selectors/predictController';
import { ActiveOrderState, PredictMarket, PredictOutcomeToken } from '../types';
import { PredictEntryPoint } from '../types/navigation';
import { getEvmAccountFromSelectedAccountGroup } from '../utils/accounts';

export interface InitializeActiveOrderParams {
  market: PredictMarket;
  outcomeToken: PredictOutcomeToken;
  entryPoint?: PredictEntryPoint;
}

export const usePredictActiveOrder = () => {
  const { PredictController } = Engine.context;

  // Subscribe to account group changes so the hook re-renders when the user switches accounts
  useSelector(selectSelectedAccountGroupId);
  const evmAccount = getEvmAccountFromSelectedAccountGroup();
  const selectedAddress = evmAccount?.address ?? '0x0';

  const activeOrder = useSelector(
    selectPredictActiveOrderByAddress({ address: selectedAddress }),
  );

  const clearOrderError = useCallback(() => {
    PredictController.clearOrderError();
  }, [PredictController]);

  const currentState = useMemo(() => activeOrder?.state, [activeOrder]);

  const isDepositing = useMemo(
    () => currentState === ActiveOrderState.DEPOSITING,
    [currentState],
  );

  const isPlacingOrder = useMemo(
    () => currentState === ActiveOrderState.PLACING_ORDER || isDepositing,
    [currentState, isDepositing],
  );

  return {
    activeOrder,
    isDepositing,
    isPlacingOrder,
    clearOrderError,
  };
};

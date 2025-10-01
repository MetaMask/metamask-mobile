import { createSelector } from 'reselect';
import { RootState } from '../../../../reducers';
import { useSelector } from 'react-redux';
import { useCallback, useMemo, useState } from 'react';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import { getAllowanceCalls } from '../providers/polymarket/utils';
import { addTransactionBatch } from '../../../../util/transaction-controller';
import Engine from '../../../../core/Engine';
import { POLYGON_MAINNET_CHAIN_ID } from '../providers/polymarket/constants';
import { Hex, numberToHex } from '@metamask/utils';

export const usePredictOnboarding = () => {
  const [isLoading, setIsLoading] = useState(false);
  const selectedInternalAccountAddress = useSelector(
    selectSelectedInternalAccountAddress,
  );
  const selectOnboardingState = createSelector(
    (state: RootState) => state.engine.backgroundState.PredictController,
    (predictState) => predictState.isOnboarded,
  );
  const { NetworkController } = Engine.context;

  const onboardingState = useSelector(selectOnboardingState);

  const isOnboarded = useMemo(
    () =>
      selectedInternalAccountAddress
        ? onboardingState[selectedInternalAccountAddress] ?? false
        : false,
    [onboardingState, selectedInternalAccountAddress],
  );

  const enablePredict = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!selectedInternalAccountAddress) {
        return;
      }
      const calls = getAllowanceCalls({
        address: selectedInternalAccountAddress,
      });

      await addTransactionBatch({
        from: selectedInternalAccountAddress as Hex,
        networkClientId: NetworkController.findNetworkClientIdByChainId(
          numberToHex(POLYGON_MAINNET_CHAIN_ID),
        ),
        transactions: calls.map((call) => ({
          params: {
            to: call.to as Hex,
            data: call.data as Hex,
            value: call.value as Hex,
          },
        })),
        disable7702: true,
        disableHook: true,
        disableSequential: false,
        requireApproval: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [NetworkController, selectedInternalAccountAddress]);

  return { isOnboarded, isLoading, enablePredict };
};

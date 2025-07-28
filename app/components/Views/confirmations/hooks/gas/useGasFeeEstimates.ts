import isEqual from 'lodash/isEqual';
import { useSelector } from 'react-redux';
import { useEffect, useState } from 'react';

import { selectGasFeeEstimatesByChainId } from '../../../../../selectors/gasFeeController';
import usePolling from '../../../../../components/hooks/usePolling';
import { RootState } from '../../../../../reducers';
import Engine from '../../../../../core/Engine';

/**
 * Gets the current gasFeeEstimates from state and begins polling for new
 * estimates. When this hook is removed from the tree it will signal to the
 * GasFeeController that it is done requiring new gas estimates. Also checks
 * the returned gas estimate for validity on the current network.
 *
 * @param _networkClientId - The optional network client ID to get gas fee estimates for. Defaults to the currently selected network.
 * @returns {GasEstimates} GasEstimates object
 */
export function useGasFeeEstimates(networkClientId: string) {
  const [chainId, setChainId] = useState('');

  const gasFeeEstimates = useSelector(
    (state: RootState) => selectGasFeeEstimatesByChainId(state, chainId),
    isEqual,
  );
  const { NetworkController } = Engine.context;

  useEffect(() => {
    let isMounted = true;
    const networkConfig =
      NetworkController.getNetworkConfigurationByNetworkClientId(
        networkClientId,
      );

    if (networkConfig && isMounted) {
      setChainId(networkConfig.chainId);
    }

    return () => {
      isMounted = false;
    };
  }, [networkClientId, NetworkController]);

  usePolling({
    startPolling: Engine.context.GasFeeController.startPolling.bind(
      Engine.context.GasFeeController,
    ),
    stopPollingByPollingToken:
      Engine.context.GasFeeController.stopPollingByPollingToken.bind(
        Engine.context.GasFeeController,
      ),
    input: [{ networkClientId }],
  });

  return {
    gasFeeEstimates,
  };
}

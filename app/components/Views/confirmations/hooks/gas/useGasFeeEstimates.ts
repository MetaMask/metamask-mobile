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
 * Normalizes falsy networkClientId (e.g. '' from networkClientId ?? '') to
 * undefined so NetworkController.getNetworkClientById is never called with
 * a falsy value (which throws "No network client ID was provided").
 *
 * @param _networkClientId - The optional network client ID to get gas fee estimates for. Defaults to the currently selected network.
 * @returns {GasEstimates} GasEstimates object
 */
export function useGasFeeEstimates(networkClientId: string | undefined) {
  const [chainId, setChainId] = useState('');

  // Avoid passing '' or other falsy values to NetworkController/GasFeeController;
  // getNetworkClientById(undefined) is never called, getNetworkClientById('') throws.
  const effectiveNetworkClientId = networkClientId?.trim()
    ? networkClientId
    : undefined;

  const gasFeeEstimates = useSelector(
    (state: RootState) => selectGasFeeEstimatesByChainId(state, chainId),
    isEqual,
  );
  const { NetworkController } = Engine.context;

  useEffect(() => {
    if (!effectiveNetworkClientId) {
      return;
    }
    let isMounted = true;
    const networkConfig =
      NetworkController.getNetworkConfigurationByNetworkClientId(
        effectiveNetworkClientId,
      );

    if (networkConfig && isMounted) {
      setChainId(networkConfig.chainId);
    }

    return () => {
      isMounted = false;
    };
  }, [effectiveNetworkClientId, NetworkController]);

  usePolling({
    startPolling: Engine.context.GasFeeController.startPolling.bind(
      Engine.context.GasFeeController,
    ),
    stopPollingByPollingToken:
      Engine.context.GasFeeController.stopPollingByPollingToken.bind(
        Engine.context.GasFeeController,
      ),
    // GasFeeController.startPolling requires networkClientId: string; never pass
    // undefined/'' (see hook JSDoc). When missing, skip polling until we have an id.
    input: effectiveNetworkClientId
      ? [{ networkClientId: effectiveNetworkClientId }]
      : [],
  });

  return {
    gasFeeEstimates,
  };
}

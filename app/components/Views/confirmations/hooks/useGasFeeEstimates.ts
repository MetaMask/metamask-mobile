import { NetworkConfiguration } from '@metamask/network-controller';
import isEqual from 'lodash/isEqual';
import { useSelector } from 'react-redux';
import { useEffect, useState } from 'react';

import { selectSelectedNetworkClientId } from '../../../../selectors/networkController';
import {
  getGasEstimateTypeByChainId,
  getGasFeeEstimatesByChainId,
  getIsGasEstimatesLoadingByChainId,
  getIsNetworkBusyByChainId,
} from '../../../../selectors/gasFeeController';
import usePolling from '../../../../components/hooks/usePolling';
import { RootState } from '../../../../reducers';

import Engine from '../../../../core/Engine';

/**
 * @typedef {object} GasEstimates
 * @property {import(
 *   '@metamask/gas-fee-controller'
 * ).GasFeeState['gasFeeEstimates']} gasFeeEstimates - The estimate object
 * @property {object} gasEstimateType - The type of estimate provided
 * @property {boolean} isGasEstimateLoading - indicates whether the gas
 *  estimates are currently loading.
 * @property {boolean} isNetworkBusy - indicates whether the network is busy.
 */

/**
 * Gets the current gasFeeEstimates from state and begins polling for new
 * estimates. When this hook is removed from the tree it will signal to the
 * GasFeeController that it is done requiring new gas estimates. Also checks
 * the returned gas estimate for validity on the current network.
 *
 * @param _networkClientId - The optional network client ID to get gas fee estimates for. Defaults to the currently selected network.
 * @returns {GasEstimates} GasEstimates object
 */
export function useGasFeeEstimates(_networkClientId?: string) {
  const selectedNetworkClientId = useSelector(selectSelectedNetworkClientId);
  const networkClientId = _networkClientId ?? selectedNetworkClientId;

  const [chainId, setChainId] = useState('');

  const gasEstimateType = useSelector((state: RootState) =>
    getGasEstimateTypeByChainId(state, chainId),
  );
  const gasFeeEstimates = useSelector(
    (state: RootState) => getGasFeeEstimatesByChainId(state, chainId),
    isEqual,
  );
  const isGasEstimatesLoading = useSelector((state: RootState) =>
    getIsGasEstimatesLoadingByChainId(state, {
      chainId,
      networkClientId,
    }),
  );
  const isNetworkBusy = useSelector((state: RootState) =>
    getIsNetworkBusyByChainId(state, chainId),
  );
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { NetworkController }: any = Engine.context;

  useEffect(() => {
    let isMounted = true;
    // TODO - Replace any with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  }, [networkClientId]);

  usePolling({
    startPolling: (input) =>
      Engine.context.GasFeeController.startPolling({
        networkClientId: input.networkClientId,
      }),
    stopPollingByPollingToken:
      Engine.context.GasFeeController.stopPollingByPollingToken,
    input: [{ networkClientId }],
  });

  return {
    gasFeeEstimates,
    gasEstimateType,
    isGasEstimatesLoading,
    isNetworkBusy,
  };
}
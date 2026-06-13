import usePolling from '../usePolling';
import Engine from '../../../core/Engine';
import { usePollingNetworks } from './use-polling-networks';
import { useSelector } from 'react-redux';
import { selectEvmNetworkConfigurationsByChainId } from '../../../selectors/networkController';
import { isE2EOrExpEnvironment } from '../../../util/test/utils';

const ANVIL_CHAIN_ID = '0x539';

// Polls native currency prices across networks.
const useAccountTrackerPolling = ({
  networkClientIds,
}: { networkClientIds?: string[] } = {}) => {
  const pollingNetworks = usePollingNetworks();
  const networkConfigsByChainId = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const pollingNetworkClientIds = pollingNetworks
    .map((c) => c?.rpcEndpoints?.[c?.defaultRpcEndpointIndex]?.networkClientId)
    .filter((networkClientId) => Boolean(networkClientId));

  if (isE2EOrExpEnvironment && networkConfigsByChainId[ANVIL_CHAIN_ID]) {
    const localConfig = networkConfigsByChainId[ANVIL_CHAIN_ID];
    const localClientId =
      localConfig?.rpcEndpoints?.[localConfig?.defaultRpcEndpointIndex]
        ?.networkClientId;
    if (localClientId && !pollingNetworkClientIds.includes(localClientId)) {
      pollingNetworkClientIds.push(localClientId);
    }
  }
  const pollingInput =
    pollingNetworkClientIds.length > 0
      ? [{ networkClientIds: pollingNetworkClientIds }]
      : [];

  let overridePollingInput: { networkClientIds: string[] }[] | undefined;
  if (networkClientIds) {
    overridePollingInput = [{ networkClientIds }];
  }

  const { AccountTrackerController } = Engine.context;

  const input = overridePollingInput ?? pollingInput;

  usePolling({
    startPolling: AccountTrackerController.startPolling.bind(
      AccountTrackerController,
    ),
    stopPollingByPollingToken:
      AccountTrackerController.stopPollingByPollingToken.bind(
        AccountTrackerController,
      ),
    input,
  });
};

export default useAccountTrackerPolling;

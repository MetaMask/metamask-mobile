import usePolling from '../usePolling';
import Engine from '../../../core/Engine';
import { usePollingNetworks } from './use-polling-networks';

// Polls native currency prices across networks.
const useAccountTrackerPolling = ({
  networkClientIds,
}: { networkClientIds?: string[] } = {}) => {
  const pollingNetworks = usePollingNetworks();
  const pollingNetworkClientIds = pollingNetworks
    .map((c) => c?.rpcEndpoints?.[c?.defaultRpcEndpointIndex]?.networkClientId)
    .filter((networkClientId) => Boolean(networkClientId));
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

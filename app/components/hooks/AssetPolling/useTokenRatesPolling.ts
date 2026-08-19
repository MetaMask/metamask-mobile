import { useSelector } from 'react-redux';
import usePolling from '../usePolling';
import Engine from '../../../core/Engine';
import { Hex } from '@metamask/utils';
import { usePollingNetworks } from './use-polling-networks';
import { selectIsAssetsUnifyStateEnabled } from '../../../selectors/featureFlagController/assetsUnifyState';

const useTokenRatesPolling = ({ chainIds }: { chainIds?: Hex[] } = {}) => {
  const isAssetsUnifyStateEnabled = useSelector(
    selectIsAssetsUnifyStateEnabled,
  );

  const pollingNetworks = usePollingNetworks();
  const pollingInput =
    pollingNetworks.length > 0
      ? [{ chainIds: pollingNetworks.map((c) => c.chainId) }]
      : [];

  let overridePollingInput: [{ chainIds: Hex[] }] | undefined;
  if (chainIds) {
    overridePollingInput = [{ chainIds }];
  }

  const { TokenRatesController } = Engine.context;

  const resolvedInput = overridePollingInput ?? pollingInput;
  const input = isAssetsUnifyStateEnabled ? [] : resolvedInput;

  usePolling({
    startPolling: TokenRatesController.startPolling.bind(TokenRatesController),
    stopPollingByPollingToken:
      TokenRatesController.stopPollingByPollingToken.bind(TokenRatesController),
    input,
  });
};

export default useTokenRatesPolling;

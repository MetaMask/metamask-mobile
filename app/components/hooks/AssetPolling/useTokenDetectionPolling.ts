import { useSelector } from 'react-redux';
import usePolling from '../usePolling';
import Engine from '../../../core/Engine';
import {
  selectChainId,
  selectChainIdsToPoll,
} from '../../../selectors/networkController';
import { Hex } from '@metamask/utils';
import { isPortfolioViewEnabled } from '../../../util/networks';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import { selectUseTokenDetection } from '../../../selectors/preferencesController';

const useTokenDetectionPolling = ({ chainIds }: { chainIds?: Hex[] } = {}) => {
  const networkConfigurations = useSelector(selectChainIdsToPoll);
  const currentChainId = useSelector(selectChainId);
  const selectedAccount = useSelector(selectSelectedInternalAccount);
  const useTokenDetection = useSelector(selectUseTokenDetection);

  const chainIdsToPoll = isPortfolioViewEnabled()
    ? chainIds ?? networkConfigurations
    : [currentChainId];

  const { TokenDetectionController } = Engine.context;

  usePolling({
    startPolling: TokenDetectionController.startPolling.bind(
      TokenDetectionController,
    ),
    stopPollingByPollingToken:
      TokenDetectionController.stopPollingByPollingToken.bind(
        TokenDetectionController,
      ),
    input: useTokenDetection
      ? [
          {
            chainIds: chainIdsToPoll as Hex[],
            address: selectedAccount?.address as Hex,
          },
        ]
      : [],
  });

  return {};
};

export default useTokenDetectionPolling;

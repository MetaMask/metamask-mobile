import { useSelector } from 'react-redux';
import usePolling from '../usePolling';
import Engine from '../../../core/Engine';
import {
  selectAllPopularNetworkConfigurations,
  selectEvmChainId,
  selectIsAllNetworks,
  selectIsPopularNetwork,
} from '../../../selectors/networkController';
import { Hex } from '@metamask/utils';
import { isPortfolioViewEnabled } from '../../../util/networks';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import { selectUseTokenDetection } from '../../../selectors/preferencesController';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';

const useDeFiPolling = () => {

    const { DeFiPositionsController } = Engine.context;

  usePolling({
    startPolling: DeFiPositionsController.startPolling.bind(
      DeFiPositionsController,
    ),
    stopPollingByPollingToken:
    DeFiPositionsController.stopPollingByPollingToken.bind(
      DeFiPositionsController,
      ),
    input: [null],
  });
};

export default useDeFiPolling;

import { useSelector } from 'react-redux';
import usePolling from '../usePolling';
import Engine from '../../../core/Engine';
import { Hex } from '@metamask/utils';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import { selectUseTokenDetection } from '../../../selectors/preferencesController';
import { usePollingNetworks } from './use-polling-networks';

const useTokenDetectionPolling = ({
  chainIds,
  address,
}: { chainIds?: Hex[]; address?: Hex } = {}) => {
  const selectedAccount = useSelector(selectSelectedInternalAccount);
  const useTokenDetection = useSelector(selectUseTokenDetection);

  const pollingNetworks = usePollingNetworks();
  const pollingInput =
    pollingNetworks.length > 0 && selectedAccount?.address
      ? [
          {
            chainIds: pollingNetworks.map((c) => c.chainId),
            address: selectedAccount.address as Hex,
          },
        ]
      : [];

  let overridePollingInput: { chainIds: Hex[]; address: Hex }[] | undefined;
  if (chainIds && address) {
    // We don't want to take evmNetwork into account
    overridePollingInput = [
      {
        chainIds,
        address: address as Hex,
      },
    ];
  }

  const { TokenDetectionController } = Engine.context;

  const input = useTokenDetection
    ? (overridePollingInput ?? pollingInput).filter(
        (i) => i.chainIds && i.address,
      )
    : [];

  usePolling({
    startPolling: TokenDetectionController.startPolling.bind(
      TokenDetectionController,
    ),
    stopPollingByPollingToken:
      TokenDetectionController.stopPollingByPollingToken.bind(
        TokenDetectionController,
      ),
    input,
  });
};

export default useTokenDetectionPolling;

import { useSelector } from 'react-redux';
import usePolling from '../usePolling';
import Engine from '../../../core/Engine';
import { selectIsAssetsUnifyStateEnabled } from '../../../selectors/featureFlagController/assetsUnifyState';

const useMultichainAssetsRatePolling = ({
  accountId,
}: {
  accountId: string;
}) => {
  const isAssetsUnifyStateEnabled = useSelector(
    selectIsAssetsUnifyStateEnabled,
  );

  const { MultichainAssetsRatesController } = Engine.context;

  const input = isAssetsUnifyStateEnabled ? [{ accountId }] : [];

  usePolling({
    startPolling: MultichainAssetsRatesController.startPolling.bind(
      MultichainAssetsRatesController,
    ),
    stopPollingByPollingToken:
      MultichainAssetsRatesController.stopPollingByPollingToken.bind(
        MultichainAssetsRatesController,
      ),
    input,
  });
};

export default useMultichainAssetsRatePolling;

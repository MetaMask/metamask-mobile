import usePolling from '../usePolling';
import Engine from '../../../core/Engine';

const useMultichainAssetsRatePolling = ({
  accountId,
}: {
  accountId: string;
}) => {
  const { MultichainAssetsRatesController } = Engine.context;

  usePolling({
    startPolling: MultichainAssetsRatesController.startPolling.bind(
      MultichainAssetsRatesController,
    ),
    stopPollingByPollingToken:
      MultichainAssetsRatesController.stopPollingByPollingToken.bind(
        MultichainAssetsRatesController,
      ),
    input: [{ accountId }],
  });
};

export default useMultichainAssetsRatePolling;

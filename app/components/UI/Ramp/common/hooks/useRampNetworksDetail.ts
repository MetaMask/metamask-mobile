import { useCallback, useEffect, useState } from 'react';
// import { SDK } from '../sdk';

import Logger from '../../../../../util/Logger';
import { Network } from '../../../../Views/Settings/NetworksSettings/NetworkSettings/CustomNetworkView/CustomNetwork.types';

function useRampNetworksDetail() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const [networksDetails, setNetworksDetails] = useState<Network[]>([]);
  const getNetworksDetail = useCallback(async () => {
    try {
      setError(undefined);
      setIsLoading(true);
      // TODO: change this mocked response to the real one once the SDK method is ready
      // const networkDetails = await SDK.getNetworksDetails();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const networksDetailsResponse = [
        {
          chainId: '25',
          nickname: 'Cronos Mainnet',
          rpcUrl: 'https://evm.cronos.org',
          ticker: 'CRO',
          rpcPrefs: {
            blockExplorerUrl: 'https://cronoscan.com',
            imageUrl:
              'https://static.metafi.codefi.network/api/v1/tokenIcons/1/0x0c9c7712c83b3c70e7c5e11100d33d9401bdf9dd.png',
          },
        },
      ];
      setNetworksDetails(networksDetailsResponse);
    } catch (requestError) {
      setError(requestError as Error);
      Logger.error(
        'useRampNetworksDetail::getNetworksDetails',
        requestError as Error,
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    getNetworksDetail();
  }, [getNetworksDetail]);

  return { networksDetails, isLoading, error, getNetworksDetail };
}

export default useRampNetworksDetail;

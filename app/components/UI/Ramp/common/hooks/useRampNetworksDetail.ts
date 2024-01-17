import { useCallback, useEffect, useState } from 'react';
import { SDK } from '../sdk';

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
      const networkDetails = await SDK.getNetworkDetails();
      setNetworksDetails(networkDetails);
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

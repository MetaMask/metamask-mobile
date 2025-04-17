import { useCallback, useEffect, useState } from 'react';
import { SDK } from '../sdk';

import Logger from '../../../../util/Logger';

function useRampNetworksDetail() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const [networksDetails, setNetworksDetails] = useState<
    Awaited<ReturnType<(typeof SDK)['getNetworkDetails']>>
  >([]);
  const getNetworksDetail = useCallback(async () => {
    try {
      setError(undefined);
      setIsLoading(true);
      const networkDetails = await SDK.getNetworkDetails();
      setNetworksDetails(networkDetails);
    } catch (requestError) {
      setError(requestError as Error);
      Logger.error(
        requestError as Error,
        'useRampNetworksDetail::getNetworksDetails',
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

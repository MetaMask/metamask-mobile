import { useCallback, useEffect, useState } from 'react';
import { SDK } from '../sdk';

<<<<<<< HEAD:app/components/UI/Ramp/Aggregator/hooks/useRampNetworksDetail.ts
import Logger from '../../../../../util/Logger';
import { Network } from '../../../../Views/Settings/NetworksSettings/NetworkSettings/CustomNetworkView/CustomNetwork.types';
=======
import Logger from '../../../../util/Logger';
import { Network } from '../../../Views/Settings/NetworksSettings/NetworkSettings/CustomNetworkView/CustomNetwork.types';
>>>>>>> stable:app/components/UI/Ramp/hooks/useRampNetworksDetail.ts

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

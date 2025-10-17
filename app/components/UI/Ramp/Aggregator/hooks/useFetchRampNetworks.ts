import { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { SDK } from '../sdk';
import { updateOnRampNetworks } from '../../../../../reducers/fiatOrders';
import Logger from '../../../../../util/Logger';

/**
 * Hook that fetches the available networks from the aggregator
 * and updates the store.
 *
 * @returns {[boolean, Error | undefined, () => Promise<void>]} A tuple where:
 * - The first element is a boolean indicating if the data is loading.
 * - The second element is an Error object if there was an error, or undefined if there was no error.
 * - The third element is a function to fetch the networks.
 */
function useFetchRampNetworks() {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();

  const fetchNetworks = useCallback(async () => {
    try {
      setError(undefined);
      setIsLoading(true);
      const networks = await SDK.getNetworks();
      dispatch(updateOnRampNetworks(networks ?? []));
    } catch (requestError) {
      setError(requestError as Error);
      Logger.error(
        requestError as Error,
        'useFetchOnRampNetworks::getNetworks',
      );
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchNetworks();
  }, [fetchNetworks]);

  return [isLoading, error, fetchNetworks] as const;
}

export default useFetchRampNetworks;

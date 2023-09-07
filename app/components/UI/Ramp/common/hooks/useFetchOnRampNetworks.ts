import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { SDK } from '../sdk';
import {
  chainIdSelector,
  updateOnRampNetworks,
} from '../../../../../reducers/fiatOrders';
import Logger from '../../../../../util/Logger';

/**
 * Hook that fetches the available networks from the aggregator
 * and updates the store
 * @returns {null}
 */
function useFetchOnRampNetworks() {
  const dispatch = useDispatch();
  const chainId = useSelector(chainIdSelector);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();

  const fetchNetworks = useCallback(async () => {
    try {
      setError(undefined);
      setIsLoading(true);
      const networks = await SDK.getNetworks();
      dispatch(updateOnRampNetworks(networks));
    } catch (requestError) {
      setError(requestError as Error);
      Logger.error(
        'useFetchOnRampNetworks::getNetworks',
        requestError as Error,
      );
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchNetworks();
  }, [chainId, fetchNetworks]);

  return [isLoading, error, fetchNetworks] as const;
}

export default useFetchOnRampNetworks;

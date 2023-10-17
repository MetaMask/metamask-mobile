import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { SDK } from '../sdk';
import {
  chainIdSelector,
  updateOnRampNetworks,
} from '../../../../reducers/fiatOrders';
import Logger from '../../../../util/Logger';

/**
 * Hook that fetches the available networks from the aggregator
 * and updates the store
 * @returns {null}
 */
function useFetchOnRampNetworks() {
  const dispatch = useDispatch();
  const chainId = useSelector(chainIdSelector);
  useEffect(() => {
    const getNetworks = async () => {
      try {
        const networks = await SDK.getNetworks();
        dispatch(updateOnRampNetworks(networks));
      } catch (error) {
        Logger.error('useFetchOnRampNetworks::getNetworks', error as Error);
      }
    };
    getNetworks();
  }, [chainId, dispatch]);

  return null;
}

export default useFetchOnRampNetworks;

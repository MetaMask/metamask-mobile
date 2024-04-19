import { swapsUtils } from '@metamask/swaps-controller';
import { useCallback, useEffect } from 'react';
import { selectChainId } from '../../../selectors/networkController';
import { AppState } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import AppConstants from '../../../core/AppConstants';
import {
  setSwapsLiveness,
  swapsLivenessSelector,
} from '../../../reducers/swaps';
import Logger from '../../../util/Logger';
import useInterval from '../../hooks/useInterval';
import { allowedTestnetChainIds, isSwapsAllowed } from './utils';
import { EngineState } from '../../../selectors/types';
import { NETWORKS_CHAIN_ID } from '../../../constants/network';

const POLLING_FREQUENCY = AppConstants.SWAPS.LIVENESS_POLLING_FREQUENCY;

// If we are in dev and on a testnet, just use mainnet feature flags,
// since we don't have feature flags for testnets in the API
// export const getFeatureFlagChainId = (chainId: `0x${string}`) =>
//   __DEV__ && allowedTestnetChainIds.includes(chainId)
//     ? NETWORKS_CHAIN_ID.MAINNET
//     : chainId;

// TODO remove this and restore the above when we are done QA. This is to let ppl test on sepolia
export const getFeatureFlagChainId = (chainId: `0x${string}`) =>
  allowedTestnetChainIds.includes(chainId)
    ? NETWORKS_CHAIN_ID.MAINNET
    : chainId;

function SwapLiveness() {
  const isLive = useSelector(swapsLivenessSelector);
  const chainId = useSelector((state: EngineState) => selectChainId(state));
  const dispatch = useDispatch();
  const setLiveness = useCallback(
    (_chainId, featureFlags) => {
      dispatch(setSwapsLiveness(_chainId, featureFlags));
    },
    [dispatch],
  );
  const checkLiveness = useCallback(async () => {
    try {
      const featureFlags = await swapsUtils.fetchSwapsFeatureFlags(
        getFeatureFlagChainId(chainId),
        AppConstants.SWAPS.CLIENT_ID,
      );

      Logger.log('STX SwapLiveness featureFlags', featureFlags);

      setLiveness(chainId, featureFlags);
    } catch (error) {
      Logger.error(error as any, 'Swaps: error while fetching swaps liveness');
      setLiveness(chainId, null);
    }
  }, [setLiveness, chainId]);

  // Need to check swap feature flags once on load, so we can use it for STX
  useEffect(() => {
    checkLiveness();
  }, [checkLiveness]);

  useEffect(() => {
    if (isSwapsAllowed(chainId) && !isLive) {
      checkLiveness();
    }
  }, [chainId, checkLiveness, isLive]);
  // Check on AppState change
  const appStateHandler = useCallback(
    (newState) => {
      if (!isLive && newState === 'active') {
        checkLiveness();
      }
    },
    [checkLiveness, isLive],
  );
  useEffect(() => {
    if (isSwapsAllowed(chainId)) {
      const appStateListener = AppState.addEventListener(
        'change',
        appStateHandler,
      );
      return () => {
        appStateListener.remove();
      };
    }
  }, [appStateHandler, chainId]);
  // Check on interval
  useInterval(
    async () => {
      checkLiveness();
    },
    isSwapsAllowed(chainId) && !isLive ? POLLING_FREQUENCY : null,
  );
  return null;
}
export default SwapLiveness;

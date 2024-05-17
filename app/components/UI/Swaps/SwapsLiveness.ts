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
import { isSwapsAllowed } from './utils';
import { EngineState } from '../../../selectors/types';

const POLLING_FREQUENCY = AppConstants.SWAPS.LIVENESS_POLLING_FREQUENCY;

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
        chainId,
        AppConstants.SWAPS.CLIENT_ID,
      );

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

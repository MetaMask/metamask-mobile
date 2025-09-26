import { FeatureFlags, swapsUtils } from '@metamask/swaps-controller';
import { useCallback, useEffect } from 'react';
import { selectEvmChainId } from '../../../selectors/networkController';
import { AppState, AppStateStatus } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import AppConstants from '../../../core/AppConstants';
import { setSwapsLiveness } from '../../../reducers/swaps';
import Logger from '../../../util/Logger';
import useInterval from '../../hooks/useInterval';
import { isSwapsAllowed } from './utils';
import { RootState } from '../../../reducers';
import { selectIsSwapsLive } from '../../../core/redux/slices/bridge';

const POLLING_FREQUENCY = AppConstants.SWAPS.LIVENESS_POLLING_FREQUENCY;

function SwapLiveness() {
  const chainId = useSelector(selectEvmChainId);
  const isLive = useSelector((state: RootState) =>
    selectIsSwapsLive(state, chainId),
  );
  const dispatch = useDispatch();
  const setLiveness = useCallback(
    (_chainId: string, featureFlags?: FeatureFlags | null) => {
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
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    (newState: AppStateStatus) => {
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
    { delay: isSwapsAllowed(chainId) && !isLive ? POLLING_FREQUENCY : null },
  );
  return null;
}
export default SwapLiveness;

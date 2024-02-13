import { swapsUtils } from '@metamask/swaps-controller';
import { useCallback, useEffect } from 'react';
import { selectChainId } from '../../../selectors/networkController';
import { AppState } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import AppConstants from '../../../core/AppConstants';
import {
  setSwapsLiveness,
  setSwapsSmartTxFeatureFlag,
  swapsLivenessSelector,
} from '../../../reducers/swaps';
import Device from '../../../util/device';
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
    (liveness, currentChainId) => {
      dispatch(setSwapsLiveness(liveness, currentChainId));
    },
    [dispatch],
  );
  const checkLiveness = useCallback(async () => {
    try {
      const data = await swapsUtils.fetchSwapsFeatureLiveness(
        chainId,
        AppConstants.SWAPS.CLIENT_ID,
      );
      const isIphone = Device.isIos();
      const isAndroid = Device.isAndroid();
      const featureFlagKey = isIphone
        ? 'mobileActiveIOS'
        : isAndroid
        ? 'mobileActiveAndroid'
        : 'mobileActive';
      const liveness =
        // @ts-expect-error interface mismatch
        typeof data === 'boolean' ? data : data?.[featureFlagKey] ?? false;
      setLiveness(liveness, chainId);
    } catch (error) {
      Logger.error(error as any, 'Swaps: error while fetching swaps liveness');
      setLiveness(false, chainId);
    }
  }, [setLiveness, chainId]);

  // TODO improve this with error handling like
  useEffect(() => {
    const checkSmartTransactions = async () => {
      const featureFlags = await swapsUtils.fetchSwapsFeatureFlags();

      const isIphone = Device.isIos();
      const isAndroid = Device.isAndroid();

      let isActiveForDevice = false;
      if (
        isIphone &&
        featureFlags?.smartTransactions?.mobileActiveIOS !== undefined
      ) {
        isActiveForDevice = featureFlags?.smartTransactions?.mobileActiveIOS;
      } else if (
        isAndroid &&
        featureFlags?.smartTransactions?.mobileActiveAndroid !== undefined
      ) {
        isActiveForDevice =
          featureFlags?.smartTransactions?.mobileActiveAndroid;
      }

      const isMobileActive = featureFlags?.smartTransactions.mobileActive;

      dispatch(setSwapsSmartTxFeatureFlag(isMobileActive && isActiveForDevice));
    };
    checkSmartTransactions();
  }, [dispatch]);

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

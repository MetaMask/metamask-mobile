import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { useSelector } from 'react-redux';

import Engine from '../../../../core/Engine';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { selectIsSignedIn } from '../../../../selectors/identity';
import { selectIsUnlocked } from '../../../../selectors/keyringController';
import { getHardwareTier } from '../../../../util/deviceCapability';
import type {
  HardwareTier,
  NetworkTier,
} from '../../../../util/deviceCapability/types';
import Logger from '../../../../util/Logger';
import { selectPredictConfig } from '../selectors/predictConfig';
import { isA2tSessionCleared } from './a2tSession';
import { refreshVenueProfile } from './venueSigningProfiles';

interface PredictDeviceAuthBootstrapProps {
  children: React.ReactNode;
}

export const shouldPrefetchA2t = (
  hardwareTier: HardwareTier | null,
  networkTier: NetworkTier | null,
): boolean =>
  networkTier === null ||
  ((networkTier === 'FAST_CELLULAR' || networkTier === 'WIFI') &&
    hardwareTier !== 'LOW');

/** Skip a registry refresh only on a known offline tier. `null` is unknown,
 * not offline, and follows the product-default path. */
export const canRefreshVenueProfiles = (
  networkTier: NetworkTier | null,
): boolean => networkTier !== 'NONE';

/**
 * Starts non-blocking preparation when PredictNext opens.
 *
 * Local key preparation is cheap and always attempted. Network prefetch is
 * withheld on known constrained hardware or networks; unknown tiers follow
 * the product-default path.
 */
export const PredictDeviceAuthBootstrap = ({
  children,
}: PredictDeviceAuthBootstrapProps) => {
  const networkTier = useNetworkTier();
  const hardwareTier = getHardwareTier();
  const isSignedIn = useSelector(selectIsSignedIn);
  const isUnlocked = useSelector(selectIsUnlocked);
  const predictConfig = useSelector(selectPredictConfig);
  const isPredictEnabled = predictConfig.enabled;
  const includeA2t = shouldPrefetchA2t(hardwareTier, networkTier);
  const canRefresh = canRefreshVenueProfiles(networkTier);

  useEffect(() => {
    if (!isUnlocked || !isPredictEnabled || !canRefresh) {
      return;
    }
    refreshVenueProfile().catch((error: unknown) => {
      Logger.error(
        error instanceof Error
          ? error
          : new Error('Venue profile refresh failed'),
        'Predict venue profile refresh failed',
      );
    });
  }, [canRefresh, isPredictEnabled, isUnlocked]);

  useEffect(() => {
    if (!isUnlocked || !isPredictEnabled || !canRefresh) {
      return undefined;
    }
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        return;
      }
      refreshVenueProfile().catch((error: unknown) => {
        Logger.error(
          error instanceof Error
            ? error
            : new Error('Venue profile refresh failed'),
          'Predict venue profile refresh failed',
        );
      });
    });
    return () => subscription.remove();
  }, [canRefresh, isPredictEnabled, isUnlocked]);

  useEffect(() => {
    if (!isUnlocked || !isPredictEnabled) {
      return;
    }
    Engine.controllerMessenger
      .call('PredictDeviceAuthService:prefetch', includeA2t && isSignedIn)
      .catch((error: unknown) => {
        if (isA2tSessionCleared(error)) {
          return;
        }
        Logger.error(
          new Error('Predict device authentication prefetch failed'),
          'Predict device authentication prefetch failed',
        );
      });
  }, [includeA2t, isPredictEnabled, isSignedIn, isUnlocked]);

  return <>{children}</>;
};

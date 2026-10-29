import React, { useEffect } from 'react';
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
import { resolveVenueAuthProfile } from '../config/predictConfig';
import { selectPredictConfig } from '../selectors/predictConfig';
import { isA2tSessionCleared } from './a2tSession';

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
  const isKalshiEnabled = resolveVenueAuthProfile(predictConfig) !== undefined;
  const includeA2t = shouldPrefetchA2t(hardwareTier, networkTier);

  useEffect(() => {
    if (!isUnlocked || !isKalshiEnabled) {
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
  }, [includeA2t, isKalshiEnabled, isSignedIn, isUnlocked]);

  return <>{children}</>;
};

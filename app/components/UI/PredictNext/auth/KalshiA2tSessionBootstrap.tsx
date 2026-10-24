import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';

import { selectIsSignedIn } from '../../../../selectors/identity';
import { selectIsUnlocked } from '../../../../selectors/keyringController';
import Logger from '../../../../util/Logger';
import { selectPredictConfig } from '../selectors/predictConfig';
import { a2tSession } from './a2tSessionInstance';
import { isKalshiDeviceKeyEnabled } from './kalshiDeviceKey';

interface KalshiA2tSessionBootstrapProps {
  children: React.ReactNode;
}

/**
 * Prefetches one A2T when PredictNext is on screen, Kalshi is enabled, and
 * the wallet is signed in and unlocked. Page screens do not call this.
 * Remounting joins the in-flight request or reuses the cached token.
 */
export const KalshiA2tSessionBootstrap = ({
  children,
}: KalshiA2tSessionBootstrapProps) => {
  const signedIn = useSelector(selectIsSignedIn);
  const walletUnlocked = useSelector(selectIsUnlocked);
  const config = useSelector(selectPredictConfig);
  const kalshiActive = isKalshiDeviceKeyEnabled(config);

  useEffect(() => {
    if (!signedIn || !kalshiActive) {
      a2tSession.clear();
      return;
    }
    if (!walletUnlocked) {
      return;
    }

    a2tSession.ensureA2T().catch((error: unknown) => {
      if (error instanceof Error && error.name === 'A2tSessionClearedError') {
        return;
      }
      Logger.error(
        error instanceof Error ? error : new Error('A2T issuance failed'),
        'A2T issuance failed',
      );
    });
  }, [signedIn, walletUnlocked, kalshiActive]);

  return <>{children}</>;
};

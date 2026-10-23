import React, { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';

import { selectIsUnlocked } from '../../../../selectors/keyringController';
import Logger from '../../../../util/Logger';
import { selectPredictConfig } from '../selectors/predictConfig';
import {
  clearKalshiDeviceKey,
  ensureKalshiDeviceKey,
  isKalshiDeviceKeyEnabled,
} from './kalshiDeviceKey';

interface KalshiDeviceKeyBootstrapProps {
  children: React.ReactNode;
}

/**
 * Loads the Kalshi P-256 device key when Kalshi is enabled and the wallet is
 * unlocked. Locking the wallet, turning Kalshi off, or leaving this stack
 * drops the plaintext key. The encrypted copy stays in SecureKeychain until
 * the wallet is reset.
 *
 * The effect follows the enabled flag. `parsePredictConfig` returns a new
 * object whenever remote flags refresh, and an effect that depended on
 * that object cleared the key while an issuance was waiting to sign.
 */
export const KalshiDeviceKeyBootstrap = ({
  children,
}: KalshiDeviceKeyBootstrapProps) => {
  const config = useSelector(selectPredictConfig);
  const walletUnlocked = useSelector(selectIsUnlocked);
  const kalshiEnabled = isKalshiDeviceKeyEnabled(config);
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    ensureKalshiDeviceKey(configRef.current, walletUnlocked).catch(
      (error: unknown) => {
        Logger.error(
          error instanceof Error
            ? error
            : new Error('Kalshi device key failed'),
          'Kalshi device key failed',
        );
      },
    );

    return () => {
      clearKalshiDeviceKey();
    };
  }, [kalshiEnabled, walletUnlocked]);

  return <>{children}</>;
};

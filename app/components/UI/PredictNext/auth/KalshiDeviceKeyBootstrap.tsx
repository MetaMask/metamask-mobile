import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';

import { selectIsUnlocked } from '../../../../selectors/keyringController';
import Logger from '../../../../util/Logger';
import { selectPredictConfig } from '../selectors/predictConfig';
import { clearKalshiDeviceKey, ensureKalshiDeviceKey } from './kalshiDeviceKey';

interface KalshiDeviceKeyBootstrapProps {
  children: React.ReactNode;
}

/**
 * Loads the Kalshi P-256 device key when `predictConfig` enables Kalshi and
 * the wallet is unlocked. Locking the wallet, turning Kalshi off, or leaving
 * this stack drops the plaintext key. The encrypted copy stays in
 * SecureKeychain until the wallet is reset.
 */
export const KalshiDeviceKeyBootstrap = ({
  children,
}: KalshiDeviceKeyBootstrapProps) => {
  const config = useSelector(selectPredictConfig);
  const walletUnlocked = useSelector(selectIsUnlocked);

  useEffect(() => {
    ensureKalshiDeviceKey(config, walletUnlocked).catch((error: unknown) => {
      Logger.error(
        error instanceof Error ? error : new Error('Kalshi device key failed'),
        'Kalshi device key failed',
      );
    });

    return () => {
      clearKalshiDeviceKey();
    };
  }, [config, walletUnlocked]);

  return <>{children}</>;
};

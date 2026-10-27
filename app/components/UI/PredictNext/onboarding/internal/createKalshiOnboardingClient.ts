import { v4 as uuidv4 } from 'uuid';

import Engine from '../../../../../core/Engine';
import packageJSON from '../../../../../../package.json';
import { KalshiOnboardingClient } from '../../adapters/remote/KalshiOnboardingClient';
import { a2tSession } from '../../auth/a2tSessionInstance';
import { KALSHI_DEMO_AUTHORITY } from '../../auth/kalshiAuthority';
import {
  getKalshiDeviceKey,
  signWithKalshiDeviceKey,
} from '../../auth/kalshiDeviceKey';

export const createKalshiOnboardingClient = (): KalshiOnboardingClient =>
  new KalshiOnboardingClient({
    baseUrl: process.env.MM_PREDICT_API_URL,
    clientVersion: packageJSON.version,
    getBearerToken: () =>
      Engine.context.AuthenticationController.getBearerToken(),
    authority: KALSHI_DEMO_AUTHORITY,
    getSigningSession: async () => {
      const a2t = await a2tSession.ensureA2T();
      const material = getKalshiDeviceKey();
      if (!a2t || !material) {
        return undefined;
      }
      return { a2t, deviceKey: material.publicKey, salt: material.salt };
    },
    invalidateSigningSession: () => a2tSession.clear(),
    signer: {
      sign: signWithKalshiDeviceKey,
      requestId: () => uuidv4(),
      now: () => Math.floor(Date.now() / 1000),
    },
  });

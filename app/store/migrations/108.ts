import { captureException } from '@sentry/react-native';

import { ensureValidState } from './util';
import StorageWrapper from '../storage-wrapper';
import {
  AGREED,
  METRICS_OPT_IN,
  METRICS_OPT_IN_SOCIAL_LOGIN,
} from '../../constants/storage';

const migrationVersion = 108;
/**
 * Migration 108: Migrate Social Login Metrics Opt-In to Metrics Enable System
 */
export default async function migrate(state: unknown) {
  try {
    if (!ensureValidState(state, migrationVersion)) {
      return state;
    }

    const metricsOptIn = await StorageWrapper.getItem(METRICS_OPT_IN);
    const socialLoginOptIn = await StorageWrapper.getItem(
      METRICS_OPT_IN_SOCIAL_LOGIN,
    );

    // migrate Social Login user metric to metrics enable system
    if (metricsOptIn !== AGREED && socialLoginOptIn === AGREED) {
      await StorageWrapper.setItem(METRICS_OPT_IN, AGREED);
    }

    if (socialLoginOptIn) {
      await StorageWrapper.removeItem(METRICS_OPT_IN_SOCIAL_LOGIN);
    }
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to migrate Social Login Metrics Opt-In: ${error}`,
      ),
    );
  }
  return state;
}

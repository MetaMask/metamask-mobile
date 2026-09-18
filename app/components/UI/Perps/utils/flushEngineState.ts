import { PERPS_CONSTANTS } from '@metamask/perps-controller';
import EngineService from '../../../../core/EngineService';
import Logger from '../../../../util/Logger';
import { ensureError } from '../../../../util/errorUtils';

/**
 * Delivers pending controller state before the default 250 ms batch window can
 * leave time-sensitive Perps UI stale. Redux delivery is best-effort and must
 * not turn a successful controller update into a failed user action.
 */
export const flushEngineState = (): void => {
  try {
    EngineService.flushState();
  } catch (error) {
    Logger.error(ensureError(error, 'flushEngineState'), {
      tags: {
        feature: PERPS_CONSTANTS.FeatureName,
        component: 'flushEngineState',
        action: 'flush_engine_state',
      },
    });
  }
};

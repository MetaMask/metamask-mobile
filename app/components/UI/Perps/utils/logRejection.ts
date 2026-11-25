import { PERPS_CONSTANTS } from '@metamask/perps-controller';
import Logger from '../../../../util/Logger';
import { ensureError } from '../../../../util/errorUtils';

/**
 * Builds a rejection reporter for fire-and-forget promises, naming each error
 * `<scope>.<operation>` so Sentry groups by feature surface.
 */
export const createLogRejection =
  (scope: string) => (operation: string) => (error: unknown) => {
    const name = `${scope}.${operation}`;
    Logger.error(ensureError(error, name), {
      tags: { feature: PERPS_CONSTANTS.FeatureName },
      context: { name, data: {} },
    });
  };

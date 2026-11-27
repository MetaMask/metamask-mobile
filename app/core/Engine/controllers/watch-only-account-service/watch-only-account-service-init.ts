// eslint-disable-next-line import-x/no-namespace
import type * as WatchOnlyAccountServiceModule from '@metamask/watch-only-account-service';
import type { MessengerClientInitFunction } from '../../types';
import type { WatchOnlyAccountServiceMessenger } from '../../messengers/watch-only-account-service-messenger/watch-only-account-service-messenger';
import { isWatchOnlyAccountsBuildEnabled } from '../../../../constants/featureFlags';

type WatchOnlyAccountService =
  WatchOnlyAccountServiceModule.WatchOnlyAccountService;

/**
 * Initialize the watch-only account service. Development-only: without the
 * build gate the package is never loaded and the service stays undefined.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized service, or no service when the gate is off.
 */
export const watchOnlyAccountServiceInit: MessengerClientInitFunction<
  WatchOnlyAccountService | undefined,
  WatchOnlyAccountServiceMessenger
> = ({ controllerMessenger }) => {
  if (!isWatchOnlyAccountsBuildEnabled()) {
    return { controller: undefined };
  }

  // Loaded on demand so builds without the gate never evaluate the package.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const serviceModule: typeof WatchOnlyAccountServiceModule = require('@metamask/watch-only-account-service');

  const controller = new serviceModule.WatchOnlyAccountService({
    messenger: controllerMessenger,
    isEnabled: isWatchOnlyAccountsBuildEnabled,
  });

  return { controller };
};

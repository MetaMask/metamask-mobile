import { WatchOnlyAccountService } from '@metamask/watch-only-account-service';
import type { MessengerClientInitFunction } from '../../types';
import type { WatchOnlyAccountServiceMessenger } from '../../messengers/watch-only-account-service-messenger/watch-only-account-service-messenger';
import { isWatchOnlyAccountsBuildEnabled } from '../../../../constants/featureFlags';

/**
 * Initialize the watch-only account service. It is always constructed, but
 * only creates accounts when the development build gate is on.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized service.
 */
export const watchOnlyAccountServiceInit: MessengerClientInitFunction<
  WatchOnlyAccountService,
  WatchOnlyAccountServiceMessenger
> = ({ controllerMessenger }) => {
  const controller = new WatchOnlyAccountService({
    messenger: controllerMessenger,
    isEnabled: isWatchOnlyAccountsBuildEnabled,
  });

  return { controller };
};

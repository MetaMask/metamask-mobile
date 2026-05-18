import { SnapAccountService } from '@metamask/snap-account-service';
import type { MessengerClientInitFunction } from '../../types';
import type { SnapAccountServiceMessenger } from '../../messengers/snap-account-service-messenger/snap-account-service-messenger';
import { createEnsureOnboardingCompleteCallback } from '../../utils/ensureOnboardingComplete';

/**
 * Initialize the Snap account service.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized service.
 */
export const snapAccountServiceInit: MessengerClientInitFunction<
  SnapAccountService,
  SnapAccountServiceMessenger
> = ({ controllerMessenger }) => {
  const controller = new SnapAccountService({
    messenger: controllerMessenger,
    config: {
      snapPlatformWatcher: {
        ensureOnboardingComplete: createEnsureOnboardingCompleteCallback(),
      },
    },
  });

  return { controller };
};

import {
  AccountTreeController,
  AccountTreeControllerMessenger,
} from '@metamask/account-tree-controller';
import type { ControllerInitFunction } from '../../../core/Engine/types';
import { trace } from '../../../util/trace';

/**
 * Initialize the AccountTreeController.
 *
 * @param request - The request object.
 * @returns The AccountTreeController.
 */
export const accountTreeControllerInit: ControllerInitFunction<
  AccountTreeController,
  AccountTreeControllerMessenger
> = (request) => {
  const { controllerMessenger, persistedState } = request;

  const accountTreeControllerState = persistedState.AccountTreeController ?? {};

  const controller = new AccountTreeController({
    messenger: controllerMessenger,
    state: accountTreeControllerState,
    config: {
      backupAndSync: {
        enableDebugLogging: true,
        onBackupAndSyncEvent: (event) => {
          // Handle backup and sync events here, e.g., logging or tracking.
          // eslint-disable-next-line no-console
          console.log('Backup and Sync Event:', event);
        },
      },
      // @ts-expect-error Controller uses string for names rather than enum
      trace,
    },
  });

  return { controller };
};

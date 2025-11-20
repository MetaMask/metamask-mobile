import {
  AccountTreeController,
  AccountTreeControllerMessenger,
} from '@metamask/account-tree-controller';
import type { ControllerInitFunction } from '../../../core/Engine/types';
import { trace } from '../../../util/trace';
import { forwardSelectedAccountGroupToSnapKeyring } from '../../../core/SnapKeyring/utils/forwardSelectedAccountGroupToSnapKeyring';
import { MetaMetrics, MetaMetricsEvents } from '../../../core/Analytics';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import { AccountGroupId } from '@metamask/account-api';
import { AccountTreeControllerInitMessenger } from '../../messengers/account-tree-controller-messenger';

/**
 * Initialize the AccountTreeController.
 *
 * @param request - The request object.
 * @returns The AccountTreeController.
 */
export const accountTreeControllerInit: ControllerInitFunction<
  AccountTreeController,
  AccountTreeControllerMessenger,
  AccountTreeControllerInitMessenger
> = (request) => {
  const { controllerMessenger, initMessenger, persistedState } = request;

  const accountTreeControllerState = persistedState.AccountTreeController ?? {};

  const controller = new AccountTreeController({
    messenger: controllerMessenger,
    state: accountTreeControllerState,
    config: {
      // @ts-expect-error Controller uses string for names rather than enum
      trace,
      backupAndSync: {
        onBackupAndSyncEvent: (event) => {
          MetaMetrics.getInstance().trackEvent(
            MetricsEventBuilder.createEventBuilder(
              MetaMetricsEvents.PROFILE_ACTIVITY_UPDATED,
            )
              .addProperties(event)
              .build(),
          );
        },
      },
    },
  });

  // Forward selected accounts every time the selected account group changes.
  initMessenger.subscribe(
    'AccountTreeController:selectedAccountGroupChange',
    (groupId: AccountGroupId | '') => {
      // TODO: Move this logic to the SnapKeyring directly.
      // eslint-disable-next-line no-void
      void forwardSelectedAccountGroupToSnapKeyring(groupId);
    },
  );

  return { controller };
};

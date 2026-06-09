import {
  AccountTreeController,
  AccountTreeControllerMessenger,
} from '@metamask/account-tree-controller';
import type { MessengerClientInitFunction } from '../../../core/Engine/types';
import { trace } from '../../../util/trace';
import { forwardSelectedAccountGroupToSnapKeyring } from '../../../core/SnapKeyring/utils/forwardSelectedAccountGroupToSnapKeyring';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import { AccountGroupId } from '@metamask/account-api';
import { AccountTreeControllerInitMessenger } from '../../messengers/account-tree-controller-messenger';

/**
 * Initialize the AccountTreeController.
 *
 * @param request - The request object.
 * @returns The AccountTreeController.
 */
export const accountTreeControllerInit: MessengerClientInitFunction<
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
          try {
            const analyticsEvent = AnalyticsEventBuilder.createEventBuilder(
              MetaMetricsEvents.PROFILE_ACTIVITY_UPDATED.category,
            )
              .addProperties(event)
              .build();

            // Cast needed until @metamask/analytics-controller removes saveDataRecording from its AnalyticsTrackingEvent
            (
              initMessenger as unknown as {
                call: (
                  action: 'AnalyticsController:trackEvent',
                  event: typeof analyticsEvent,
                ) => void;
              }
            ).call('AnalyticsController:trackEvent', analyticsEvent);
          } catch (error) {
            // Analytics tracking failures should not break account tree functionality
            // Error is logged but not thrown
          }
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

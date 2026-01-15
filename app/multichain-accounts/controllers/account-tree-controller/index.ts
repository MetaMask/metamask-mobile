import {
  AccountTreeController,
  AccountTreeControllerMessenger,
} from '@metamask/account-tree-controller';
import type { ControllerInitFunction } from '../../../core/Engine/types';
import { trace } from '../../../util/trace';
import { forwardSelectedAccountGroupToSnapKeyring } from '../../../core/SnapKeyring/utils/forwardSelectedAccountGroupToSnapKeyring';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import type { AnalyticsEventProperties } from '@metamask/analytics-controller';
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
          try {
            const analyticsEvent = AnalyticsEventBuilder.createEventBuilder(
              MetaMetricsEvents.PROFILE_ACTIVITY_UPDATED.category,
            )
              .addProperties((event as AnalyticsEventProperties) || {})
              .build();

            initMessenger.call(
              'AnalyticsController:trackEvent',
              analyticsEvent,
            );
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

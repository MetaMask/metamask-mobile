import {
  AccountTreeController,
  AccountTreeControllerMessenger,
} from '@metamask/account-tree-controller';
import type { MessengerClientInitFunction } from '../../../core/Engine/types';
import { trace } from '../../../util/trace';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import type { AnalyticsTrackingEvent as PackageAnalyticsTrackingEvent } from '@metamask/analytics-controller';
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
            initMessenger.call(
              'AnalyticsController:trackEvent',
              analyticsEvent as unknown as PackageAnalyticsTrackingEvent,
            );
          } catch (error) {
            // Analytics tracking failures should not break account tree functionality
            // Error is logged but not thrown
          }
        },
      },
    },
  });

  return { controller };
};

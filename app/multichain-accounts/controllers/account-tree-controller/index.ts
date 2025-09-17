import {
  AccountTreeController,
  AccountTreeControllerMessenger,
} from '@metamask/account-tree-controller';
import type { ControllerInitFunction } from '../../../core/Engine/types';
import { trace } from '../../../util/trace';
import { MetaMetrics, MetaMetricsEvents } from '../../../core/Analytics';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';

/**
 * Initialize the AccountTreeController.
 *
 * @param request - The request object.
 * @returns The AccountTreeController.
 */
export const accountTreeControllerInit: ControllerInitFunction<
  AccountTreeController,
  // @ts-expect-error TODO: Resolve mismatch between base-controller versions.
  AccountTreeControllerMessenger
> = (request) => {
  const { controllerMessenger, persistedState } = request;

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

  return { controller };
};

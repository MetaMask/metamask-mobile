import { ControllerInitFunction } from '../../types';
import {
  Controller as UserStorageController,
  UserStorageControllerMessenger,
} from '@metamask/profile-sync-controller/user-storage';
import type { UserStorageControllerInitMessenger } from '../../messengers/identity/user-storage-controller-messenger';
import { calculateScryptKey } from './calculate-scrypt-key';
import { MetaMetricsEvents } from '../../../Analytics';
import { trace } from '../../../../util/trace';
import { trackEvent } from '../../utils/analytics';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';

/**
 * Initialize the user storage controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const userStorageControllerInit: ControllerInitFunction<
  UserStorageController,
  UserStorageControllerMessenger,
  UserStorageControllerInitMessenger
> = ({ controllerMessenger, initMessenger, persistedState }) => {
  const controller = new UserStorageController({
    messenger: controllerMessenger,

    // @ts-expect-error: `UserStorageController` does not accept partial state.
    state: persistedState.UserStorageController,

    nativeScryptCrypto: calculateScryptKey,

    // @ts-expect-error: Type of `TraceRequest` is different.
    trace,

    config: {
      contactSyncing: {
        onContactUpdated: (profileId) => {
          const event = AnalyticsEventBuilder.createEventBuilder(
            MetaMetricsEvents.PROFILE_ACTIVITY_UPDATED.category,
          )
            .addProperties({
              profile_id: profileId,
              feature_name: 'Contacts Sync',
              action: 'Contacts Sync Contact Updated',
            })
            .build();
          trackEvent(initMessenger, event);
        },
        onContactDeleted: (profileId) => {
          const event = AnalyticsEventBuilder.createEventBuilder(
            MetaMetricsEvents.PROFILE_ACTIVITY_UPDATED.category,
          )
            .addProperties({
              profile_id: profileId,
              feature_name: 'Contacts Sync',
              action: 'Contacts Sync Contact Deleted',
            })
            .build();
          trackEvent(initMessenger, event);
        },
        onContactSyncErroneousSituation(profileId, situationMessage) {
          const event = AnalyticsEventBuilder.createEventBuilder(
            MetaMetricsEvents.PROFILE_ACTIVITY_UPDATED.category,
          )
            .addProperties({
              profile_id: profileId,
              feature_name: 'Contacts Sync',
              action: 'Contacts Sync Erroneous Situation',
              additional_description: situationMessage,
            })
            .build();
          trackEvent(initMessenger, event);
        },
      },
    },
  });

  return {
    controller,
  };
};

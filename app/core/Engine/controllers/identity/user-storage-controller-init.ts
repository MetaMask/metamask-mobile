import { ControllerInitFunction } from '../../types';
import {
  Controller as UserStorageController,
  UserStorageControllerMessenger,
} from '@metamask/profile-sync-controller/user-storage';
import { calculateScryptKey } from './calculate-scrypt-key';
import { EVENT_NAME } from '../../../Analytics/MetaMetrics.events';
import { AnalyticsEventBuilder } from '../../../Analytics/AnalyticsEventBuilder';
import { trace } from '../../../../util/trace';
import { UserStorageControllerInitMessenger } from '../../messengers/identity/user-storage-controller-messenger';

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
> = ({ controllerMessenger, persistedState, initMessenger }) => {
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
            EVENT_NAME.PROFILE_ACTIVITY_UPDATED,
          )
            .addProperties({
              profile_id: profileId,
              feature_name: 'Contacts Sync',
              action: 'Contacts Sync Contact Updated',
            })
            .build();
          initMessenger.call('AnalyticsController:trackEvent', event);
        },
        onContactDeleted: (profileId) => {
          const event = AnalyticsEventBuilder.createEventBuilder(
            EVENT_NAME.PROFILE_ACTIVITY_UPDATED,
          )
            .addProperties({
              profile_id: profileId,
              feature_name: 'Contacts Sync',
              action: 'Contacts Sync Contact Deleted',
            })
            .build();
          initMessenger.call('AnalyticsController:trackEvent', event);
        },
        onContactSyncErroneousSituation(profileId, situationMessage) {
          const event = AnalyticsEventBuilder.createEventBuilder(
            EVENT_NAME.PROFILE_ACTIVITY_UPDATED,
          )
            .addProperties({
              profile_id: profileId,
              feature_name: 'Contacts Sync',
              action: 'Contacts Sync Erroneous Situation',
              additional_description: situationMessage,
            })
            .build();
          initMessenger.call('AnalyticsController:trackEvent', event);
        },
      },
    },
  });

  return {
    controller,
  };
};

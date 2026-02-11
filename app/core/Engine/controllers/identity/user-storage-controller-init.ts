import { scrypt } from 'react-native-fast-crypto';
import { ControllerInitFunction } from '../../types';
import {
  Controller as UserStorageController,
  UserStorageControllerMessenger,
} from '@metamask/profile-sync-controller/user-storage';
import type { UserStorageControllerInitMessenger } from '../../messengers/identity/user-storage-controller-messenger';
import { MetaMetricsEvents } from '../../../Analytics';
import { trace } from '../../../../util/trace';
import { buildAndTrackEvent } from '../../utils/analytics';

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

    nativeScryptCrypto: scrypt,

    // @ts-expect-error: Type of `TraceRequest` is different.
    trace,

    config: {
      contactSyncing: {
        onContactUpdated: (profileId) => {
          buildAndTrackEvent(
            initMessenger,
            MetaMetricsEvents.PROFILE_ACTIVITY_UPDATED.category,
            {
              profile_id: profileId,
              feature_name: 'Contacts Sync',
              action: 'Contacts Sync Contact Updated',
            },
          );
        },
        onContactDeleted: (profileId) => {
          buildAndTrackEvent(
            initMessenger,
            MetaMetricsEvents.PROFILE_ACTIVITY_UPDATED.category,
            {
              profile_id: profileId,
              feature_name: 'Contacts Sync',
              action: 'Contacts Sync Contact Deleted',
            },
          );
        },
        onContactSyncErroneousSituation(profileId, situationMessage) {
          buildAndTrackEvent(
            initMessenger,
            MetaMetricsEvents.PROFILE_ACTIVITY_UPDATED.category,
            {
              profile_id: profileId,
              feature_name: 'Contacts Sync',
              action: 'Contacts Sync Erroneous Situation',
              additional_description: situationMessage,
            },
          );
        },
      },
    },
  });

  return {
    controller,
  };
};

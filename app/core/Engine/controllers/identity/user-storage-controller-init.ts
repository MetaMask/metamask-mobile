import { scrypt } from 'react-native-fast-crypto';
import { ControllerInitFunction } from '../../types';
import {
  Controller as UserStorageController,
  UserStorageControllerMessenger,
} from '@metamask/profile-sync-controller/user-storage';
import { MetaMetrics, MetaMetricsEvents } from '../../../Analytics';
import { MetricsEventBuilder } from '../../../Analytics/MetricsEventBuilder';
import { trace } from '../../../../util/trace';

/**
 * Initialize the user storage controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const userStorageControllerInit: ControllerInitFunction<
  UserStorageController,
  UserStorageControllerMessenger
> = ({ controllerMessenger, persistedState }) => {
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
          MetaMetrics.getInstance().trackEvent(
            MetricsEventBuilder.createEventBuilder(
              MetaMetricsEvents.PROFILE_ACTIVITY_UPDATED,
            )
              .addProperties({
                profile_id: profileId,
                feature_name: 'Contacts Sync',
                action: 'Contacts Sync Contact Updated',
              })
              .build(),
          );
        },
        onContactDeleted: (profileId) => {
          MetaMetrics.getInstance().trackEvent(
            MetricsEventBuilder.createEventBuilder(
              MetaMetricsEvents.PROFILE_ACTIVITY_UPDATED,
            )
              .addProperties({
                profile_id: profileId,
                feature_name: 'Contacts Sync',
                action: 'Contacts Sync Contact Deleted',
              })
              .build(),
          );
        },
        onContactSyncErroneousSituation(profileId, situationMessage) {
          MetaMetrics.getInstance().trackEvent(
            MetricsEventBuilder.createEventBuilder(
              MetaMetricsEvents.PROFILE_ACTIVITY_UPDATED,
            )
              .addProperties({
                profile_id: profileId,
                feature_name: 'Contacts Sync',
                action: 'Contacts Sync Erroneous Situation',
                additional_description: situationMessage,
              })
              .build(),
          );
        },
      },
    },
  });

  return {
    controller,
  };
};

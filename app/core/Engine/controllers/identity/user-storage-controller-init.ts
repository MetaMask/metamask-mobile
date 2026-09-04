import QuickCrypto from 'react-native-quick-crypto';
import { Buffer } from '@craftzdog/react-native-buffer';
import { MessengerClientInitFunction } from '../../types';
import {
  Controller as UserStorageController,
  UserStorageControllerMessenger,
} from '@metamask/profile-sync-controller/user-storage';
import type { UserStorageControllerInitMessenger } from '../../messengers/identity/user-storage-controller-messenger';
import { MetaMetricsEvents } from '../../../Analytics';
import { trace } from '../../../../util/trace';
import { buildAndTrackEvent } from '../../utils/analytics';
import { authEnv } from '../../../devApiEnv';

/**
 * scrypt adapter shaped to match the react-native-fast-crypto interface.
 * Uses react-native-quick-crypto's OpenSSL-backed scrypt under the hood.
 *
 * maxmem is set to 256 MiB because profile-sync parameters (N=2^17, r=8)
 * require ~134 MiB — well above Node's default 32 MiB cap.
 */
export const scrypt = (
  passwd: Uint8Array,
  salt: Uint8Array,
  N: number,
  r: number,
  p: number,
  size: number,
): Promise<Uint8Array> =>
  new Promise((resolve, reject) =>
    QuickCrypto.scrypt(
      Buffer.from(passwd),
      Buffer.from(salt),
      size,
      { N, r, p, maxmem: 256 * 1024 * 1024 },
      (err, derived) =>
        err ? reject(err) : resolve(new Uint8Array(derived as Buffer)),
    ),
  );

/**
 * Initialize the user storage controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const userStorageControllerInit: MessengerClientInitFunction<
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
      env: authEnv(),

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

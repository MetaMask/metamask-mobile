import {
  SnapController,
  SnapControllerMessenger,
} from '@metamask/snaps-controllers';
import { Duration, inMilliseconds } from '@metamask/utils';
import { hmacSha512 } from '@metamask/native-utils';
import { MessengerClientInitFunction } from '../../types';
import { SnapControllerInitMessenger } from '../../messengers/snaps';
import {
  EndowmentPermissions,
  ExcludedSnapEndowments,
  ExcludedSnapPermissions,
  detectSnapLocation,
} from '../../../Snaps';
import {
  Encryptor,
  LEGACY_DERIVATION_OPTIONS,
  pbkdf2,
} from '../../../Encryptor';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import { store } from '../../../../store';
import PREINSTALLED_SNAPS from '../../../../lib/snaps/preinstalled-snaps';
import { getMnemonicSeed } from '../../../Snaps/permissions/utils';
import { getClientConfig } from './utils';
import { ensureOnboardingComplete } from '../../utils/ensureOnboardingComplete';
import { CAN_INSTALL_THIRD_PARTY_SNAPS } from '../../../../constants/snaps';
import { isFlaskBuild } from '../../../../util/environment';

/**
 * Initialize the Snap controller.
 *
 * @param request - The request object.
 * @param request.initMessenger - The init messenger. This has access to
 * different functions than the controller messenger, and should be used for
 * initialization purposes only.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.persistedState - The persisted state of the extension.
 * @returns The initialized controller.
 */
export const snapControllerInit: MessengerClientInitFunction<
  SnapController,
  SnapControllerMessenger,
  SnapControllerInitMessenger
> = ({ initMessenger, controllerMessenger, persistedState }) => {
  const requireAllowlist = !isFlaskBuild;
  const disableSnapInstallation = !CAN_INSTALL_THIRD_PARTY_SNAPS;
  const allowLocalSnaps = isFlaskBuild;
  const autoUpdatePreinstalledSnaps = true;

  const forcePreinstalledSnaps =
    isFlaskBuild && process.env.FORCE_PREINSTALLED_SNAPS === 'true';

  const encryptor = new Encryptor({
    keyDerivationOptions: LEGACY_DERIVATION_OPTIONS,
  });

  /**
   * Get the feature flags for the `SnapController.
   *
   * @returns The feature flags.
   */
  function getFeatureFlags() {
    const isBasicFunctionalityToggleEnabled = () =>
      selectBasicFunctionalityEnabled(store.getState());

    return {
      disableSnaps: !isBasicFunctionalityToggleEnabled(),
    };
  }

  const controller = new SnapController({
    environmentEndowmentPermissions: Object.values(EndowmentPermissions),
    excludedPermissions: {
      ...ExcludedSnapPermissions,
      ...ExcludedSnapEndowments,
    },

    // @ts-expect-error: `persistedState.SnapController` is not compatible with
    // the expected type.
    // TODO: Look into the type mismatch.
    state: persistedState.SnapController,
    messenger: controllerMessenger,
    maxIdleTime: inMilliseconds(5, Duration.Minute),
    maxRequestTime: inMilliseconds(2, Duration.Minute),
    featureFlags: {
      allowLocalSnaps,
      disableSnapInstallation,
      requireAllowlist,
      autoUpdatePreinstalledSnaps,
      forcePreinstalledSnaps,
    },

    // @ts-expect-error: `encryptorFactory` is not compatible with the expected
    // type.
    // TODO: Look into the type mismatch.
    encryptor,

    getMnemonicSeed: getMnemonicSeed.bind(null, initMessenger, undefined),

    // @ts-expect-error: `PREINSTALLED_SNAPS` is readonly, but the controller
    // expects a mutable array.
    // TODO: Update the controller to accept a readonly array.
    preinstalledSnaps: PREINSTALLED_SNAPS,
    getFeatureFlags,

    ensureOnboardingComplete,

    detectSnapLocation,
    clientCryptography: {
      pbkdf2Sha512: pbkdf2,
      hmacSha512: async (key, data) => hmacSha512(key, data),
    },

    clientConfig: getClientConfig(),
  });

  initMessenger.subscribe('KeyringController:lock', () => {
    initMessenger.call('SnapController:setClientActive', false);
  });

  initMessenger.subscribe('KeyringController:unlock', () => {
    initMessenger.call('SnapController:setClientActive', true);
  });

  return {
    controller,
  };
};

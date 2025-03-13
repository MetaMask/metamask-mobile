import { SnapController } from '@metamask/snaps-controllers';
import { Duration, hasProperty, inMilliseconds } from '@metamask/utils';
import { ControllerInitFunction } from '../../types';
import {
  SnapControllerInitMessenger,
  SnapControllerMessenger,
} from '../../messengers/snaps';
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
import { KeyringTypes } from '@metamask/keyring-controller';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import { store } from '../../../../store';
import PREINSTALLED_SNAPS from '../../../../lib/snaps/preinstalled-snaps';

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
export const snapControllerInit: ControllerInitFunction<
  SnapController,
  SnapControllerMessenger,
  SnapControllerInitMessenger
> = ({ initMessenger, controllerMessenger, persistedState }) => {
  const requireAllowlist = process.env.METAMASK_BUILD_TYPE !== 'flask';
  const disableSnapInstallation = process.env.METAMASK_BUILD_TYPE !== 'flask';
  const allowLocalSnaps = process.env.METAMASK_BUILD_TYPE === 'flask';

  const encryptor = new Encryptor({
    keyDerivationOptions: LEGACY_DERIVATION_OPTIONS,
  });

  // Async because `SnapController` expects a promise.
  async function getMnemonic() {
    const keyrings = initMessenger.call(
      'KeyringController:getKeyringsByType',
      KeyringTypes.hd,
    );

    if (
      !keyrings[0] ||
      !hasProperty(keyrings[0], 'mnemonic') ||
      !(keyrings[0].mnemonic instanceof Uint8Array)
    ) {
      throw new Error('Primary keyring mnemonic unavailable.');
    }

    return keyrings[0].mnemonic;
  }

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

    // @ts-expect-error: `controllerMessenger` is not compatible with the
    // expected type.
    // TODO: Look into the type mismatch.
    messenger: controllerMessenger,
    maxIdleTime: inMilliseconds(5, Duration.Minute),
    featureFlags: {
      allowLocalSnaps,
      disableSnapInstallation,
      requireAllowlist,
    },

    // @ts-expect-error: `encryptorFactory` is not compatible with the expected
    // type.
    // TODO: Look into the type mismatch.
    encryptor,

    getMnemonic,

    // @ts-expect-error: `PREINSTALLED_SNAPS` is readonly, but the controller
    // expects a mutable array.
    // TODO: Update the controller to accept a readonly array.
    preinstalledSnaps: PREINSTALLED_SNAPS,
    getFeatureFlags,

    detectSnapLocation,
    clientCryptography: {
      pbkdf2Sha512: pbkdf2,
    },
  });

  return {
    controller,
  };
};

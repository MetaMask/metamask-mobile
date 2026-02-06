import { SnapController } from '@metamask/snaps-controllers';
import { Duration, hasProperty, inMilliseconds } from '@metamask/utils';
import { hmacSha512 } from '@metamask/native-utils';
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
import { store, runSaga } from '../../../../store';
import PREINSTALLED_SNAPS from '../../../../lib/snaps/preinstalled-snaps';
import { buildAndTrackEvent } from '../../utils/analytics';
import type { AnalyticsEventProperties } from '@metamask/analytics-controller';
import { take } from 'redux-saga/effects';
import { selectCompletedOnboarding } from '../../../../selectors/onboarding';
import {
  SET_COMPLETED_ONBOARDING,
  SetCompletedOnboardingAction,
} from '../../../../actions/onboarding';
import { SagaIterator } from 'redux-saga';

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
  const autoUpdatePreinstalledSnaps = true;

  ///: BEGIN:ONLY_INCLUDE_IF(flask)
  const forcePreinstalledSnaps =
    process.env.FORCE_PREINSTALLED_SNAPS === 'true';
  ///: END:ONLY_INCLUDE_IF

  const encryptor = new Encryptor({
    keyDerivationOptions: LEGACY_DERIVATION_OPTIONS,
  });

  // Async because `SnapController` expects a promise.
  async function getMnemonicSeed() {
    const keyrings = initMessenger.call(
      'KeyringController:getKeyringsByType',
      KeyringTypes.hd,
    );

    if (
      !keyrings[0] ||
      !hasProperty(keyrings[0], 'seed') ||
      !(keyrings[0].seed instanceof Uint8Array)
    ) {
      throw new Error('Primary keyring mnemonic unavailable.');
    }

    return keyrings[0].seed;
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

  function* ensureOnboardingCompleteSaga(): SagaIterator {
    while (true) {
      const result = (yield take([
        SET_COMPLETED_ONBOARDING,
      ])) as SetCompletedOnboardingAction;

      if (result.completedOnboarding) {
        return;
      }
    }
  }

  let onboardingPromise: Promise<void> | null = null;

  async function ensureOnboardingComplete() {
    if (selectCompletedOnboarding(store.getState())) {
      return;
    }

    if (!onboardingPromise) {
      onboardingPromise = runSaga(ensureOnboardingCompleteSaga).toPromise();
    }

    await onboardingPromise;
    onboardingPromise = null;
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
    maxRequestTime: inMilliseconds(2, Duration.Minute),
    featureFlags: {
      allowLocalSnaps,
      disableSnapInstallation,
      requireAllowlist,
      autoUpdatePreinstalledSnaps,
      ///: BEGIN:ONLY_INCLUDE_IF(flask)
      forcePreinstalledSnaps,
      ///: END:ONLY_INCLUDE_IF
    },

    // @ts-expect-error: `encryptorFactory` is not compatible with the expected
    // type.
    // TODO: Look into the type mismatch.
    encryptor,

    getMnemonicSeed,

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
    trackEvent: (params: {
      event: string;
      properties?: Record<string, unknown>;
    }) => {
      buildAndTrackEvent(
        initMessenger,
        params.event,
        params.properties as AnalyticsEventProperties | null | undefined,
      );
    },
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

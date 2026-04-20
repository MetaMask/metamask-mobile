/**
 * Haptic playback for non-React call sites (singleton Redux gates).
 *
 * Vendor calls are centralized in `vendorPlayback.ts`; this file wires Redux
 * gate options and `withGatedPlayback`. App code imports from `app/util/haptics`.
 */
import { type HapticGateOptions } from './gates';
import { withGatedPlayback } from './gatedExecution';
import {
  NotificationMoment,
  type HapticImpactMoment,
  type HapticNotificationMoment,
} from './catalog';
import {
  vendorImpact,
  vendorNotifyError,
  vendorNotifySuccess,
  vendorNotifyWarning,
  vendorSelection,
} from './vendorPlayback';
import ReduxService from '../../core/redux';
import { selectHapticsEnabled } from '../../selectors/settings';
import { selectHapticsKillSwitch } from '../../selectors/featureFlagController/haptics';
import Logger from '../Logger';

/**
 * Reads Redux state to build gate options.
 * Safe to call outside React — uses the singleton store.
 */
function getGateOptions(): HapticGateOptions {
  try {
    const state = ReduxService.store.getState();
    return {
      reducedHaptics: !selectHapticsEnabled(state),
      killSwitchActive: selectHapticsKillSwitch(state),
    };
  } catch {
    // Store not initialized yet — allow playback (fail-open for startup flows).
    return { reducedHaptics: false, killSwitchActive: false };
  }
}

export async function playSuccessNotification(): Promise<void> {
  await withGatedPlayback(getGateOptions(), vendorNotifySuccess);
}

export async function playErrorNotification(): Promise<void> {
  await withGatedPlayback(getGateOptions(), vendorNotifyError);
}

export async function playWarningNotification(): Promise<void> {
  await withGatedPlayback(getGateOptions(), vendorNotifyWarning);
}

export async function playImpact(moment: HapticImpactMoment): Promise<void> {
  await withGatedPlayback(getGateOptions(), () => vendorImpact(moment));
}

/**
 * Dispatch a notification haptic by moment string — useful for config-driven
 * patterns (e.g. toast hooks that store the moment type on each config).
 */
export async function playNotification(
  moment: HapticNotificationMoment,
): Promise<void> {
  switch (moment) {
    case NotificationMoment.Success:
      return playSuccessNotification();
    case NotificationMoment.Error:
      return playErrorNotification();
    case NotificationMoment.Warning:
      return playWarningNotification();
    default: {
      Logger.error(new Error('Unexpected haptic notification moment'), {
        moment: moment as unknown,
      });
      const _exhaustive: never = moment;
      return _exhaustive;
    }
  }
}

export async function playSelection(): Promise<void> {
  await withGatedPlayback(getGateOptions(), vendorSelection);
}

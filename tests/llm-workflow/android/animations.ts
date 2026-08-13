import { runDeviceAdb as defaultRunDeviceAdb } from './adb';

const ANIMATION_SCALE_SETTINGS = [
  'window_animation_scale',
  'transition_animation_scale',
  'animator_duration_scale',
] as const;

type AnimationScaleSetting = (typeof ANIMATION_SCALE_SETTINGS)[number];

type RunDeviceAdb = (serial: string, args: string[]) => string;

export interface AndroidAnimationState {
  readonly serial: string;
  readonly previous: ReadonlyMap<AnimationScaleSetting, string>;
}

// UiAutomator's dump waits for the app to reach an idle state. Disabling the
// emulator's system animation scales reduces transition churn around snapshots
// and makes that idle-state check more reliable. The app can override the
// system reduce-motion preference, so this is a UiAutomator/system-animation
// mitigation rather than a guarantee that app-owned animations stop. Record
// prior values and restore only the settings this session changes.
export function disableAndroidAnimations(
  serial: string,
  runDeviceAdb: RunDeviceAdb = defaultRunDeviceAdb,
): AndroidAnimationState {
  const previous = new Map<AnimationScaleSetting, string>();
  try {
    for (const setting of ANIMATION_SCALE_SETTINGS) {
      const current = runDeviceAdb(serial, [
        'shell',
        'settings',
        'get',
        'global',
        setting,
      ]).trim();
      if (current !== '0') {
        previous.set(setting, current);
        runDeviceAdb(serial, [
          'shell',
          'settings',
          'put',
          'global',
          setting,
          '0',
        ]);
      }
    }
  } catch (error) {
    restoreAndroidAnimations({ serial, previous }, runDeviceAdb);
    throw error;
  }
  return { serial, previous };
}

export function restoreAndroidAnimations(
  state: AndroidAnimationState,
  runDeviceAdb: RunDeviceAdb = defaultRunDeviceAdb,
): void {
  const errors: Error[] = [];
  for (const [setting, value] of state.previous) {
    try {
      if (value === 'null') {
        runDeviceAdb(state.serial, ['shell', 'settings', 'delete', 'global', setting]);
      } else {
        runDeviceAdb(state.serial, ['shell', 'settings', 'put', 'global', setting, value]);
      }
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }
  }
  if (errors.length === 1) {
    throw errors[0];
  }
  if (errors.length > 1) {
    throw new AggregateError(
      errors,
      'Failed to restore one or more Android animation settings',
    );
  }
}

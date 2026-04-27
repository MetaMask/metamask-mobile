import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { withGatedPlayback } from './gatedExecution';
import { type HapticImpactMoment, type HapticsPlayer } from './catalog';
import {
  vendorImpact,
  vendorNotifyError,
  vendorNotifySuccess,
  vendorNotifyWarning,
  vendorSelection,
} from './vendorPlayback';
import { selectHapticsEnabled } from '../../selectors/settings';
import { selectHapticsKillSwitch } from '../../selectors/featureFlagController/haptics';

/**
 * React hook that returns a stable bundle of semantic haptic functions.
 *
 * Reads reactive state (user preference + remote kill switch) from Redux so
 * toggling "reduced haptics" applies immediately without app restart.
 * Playback matches `play.ts`: gates, then try/catch with `// no-op` on failure.
 *
 * For non-React contexts (sagas, utilities, class components), import the
 * plain functions from `app/util/haptics` instead.
 */
export function useHaptics(): HapticsPlayer {
  const hapticsEnabled = useSelector(selectHapticsEnabled);
  const killSwitchActive = useSelector(selectHapticsKillSwitch);

  const gateOptions = useMemo(
    () => ({
      reducedHaptics: !hapticsEnabled,
      killSwitchActive,
    }),
    [hapticsEnabled, killSwitchActive],
  );

  const playSuccessNotification = useCallback(async () => {
    await withGatedPlayback(gateOptions, vendorNotifySuccess);
  }, [gateOptions]);

  const playErrorNotification = useCallback(async () => {
    await withGatedPlayback(gateOptions, vendorNotifyError);
  }, [gateOptions]);

  const playWarningNotification = useCallback(async () => {
    await withGatedPlayback(gateOptions, vendorNotifyWarning);
  }, [gateOptions]);

  const playImpact = useCallback(
    async (moment: HapticImpactMoment) => {
      await withGatedPlayback(gateOptions, () => vendorImpact(moment));
    },
    [gateOptions],
  );

  const playSelectionFn = useCallback(async () => {
    await withGatedPlayback(gateOptions, vendorSelection);
  }, [gateOptions]);

  return useMemo(
    () => ({
      playSuccessNotification,
      playErrorNotification,
      playWarningNotification,
      playImpact,
      playSelection: playSelectionFn,
    }),
    [
      playSuccessNotification,
      playErrorNotification,
      playWarningNotification,
      playImpact,
      playSelectionFn,
    ],
  );
}

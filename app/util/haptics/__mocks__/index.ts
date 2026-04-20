/**
 * Manual mock for `app/util/haptics` when tests call `jest.mock('…/util/haptics')`
 * with no factory (avoids `require()` and `jest.mock` + ESM import TDZ).
 */
import { createHapticsJestMock } from '../testing/createHapticsJestMock';

const m = createHapticsJestMock();

export const playSuccessNotification = m.playSuccessNotification;
export const playErrorNotification = m.playErrorNotification;
export const playWarningNotification = m.playWarningNotification;
export const playNotification = m.playNotification;
export const playImpact = m.playImpact;
export const playSelection = m.playSelection;
export const useHaptics = m.useHaptics;
export const ImpactMoment = m.ImpactMoment;
export const NotificationMoment = m.NotificationMoment;

export type {
  HapticMoment,
  HapticImpactMoment,
  HapticNotificationMoment,
  HapticsPlayer,
} from '../catalog';

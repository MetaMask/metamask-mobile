/**
 * Raw expo-haptics calls — no gates, no try/catch.
 * All `expo-haptics` imports for the haptics toolkit live here alongside `play.ts`
 * barrel usage; `play.ts` / `useHaptics.ts` add gating and error swallowing.
 */
import {
  impactAsync,
  ImpactFeedbackStyle,
  notificationAsync,
  NotificationFeedbackType,
  selectionAsync,
} from 'expo-haptics';
import { ImpactMoment, type HapticImpactMoment } from './catalog';

/** Maps each catalog impact moment to exactly one Expo impact style. */
export const IMPACT_STYLE_MAP: Record<HapticImpactMoment, ImpactFeedbackStyle> =
  {
    [ImpactMoment.QuickAmountSelection]: ImpactFeedbackStyle.Light,
    [ImpactMoment.SliderTick]: ImpactFeedbackStyle.Light,
    [ImpactMoment.EdgeGestureEngage]: ImpactFeedbackStyle.Light,
    [ImpactMoment.SliderGrip]: ImpactFeedbackStyle.Medium,
    [ImpactMoment.TabChange]: ImpactFeedbackStyle.Medium,
    [ImpactMoment.PullToRefreshEngage]: ImpactFeedbackStyle.Light,
    [ImpactMoment.PullToRefresh]: ImpactFeedbackStyle.Medium,
    [ImpactMoment.ChartCrosshair]: ImpactFeedbackStyle.Light,
  };

export async function vendorNotifySuccess(): Promise<void> {
  await notificationAsync(NotificationFeedbackType.Success);
}

export async function vendorNotifyError(): Promise<void> {
  await notificationAsync(NotificationFeedbackType.Error);
}

export async function vendorNotifyWarning(): Promise<void> {
  await notificationAsync(NotificationFeedbackType.Warning);
}

export async function vendorImpact(moment: HapticImpactMoment): Promise<void> {
  await impactAsync(IMPACT_STYLE_MAP[moment]);
}

export async function vendorSelection(): Promise<void> {
  await selectionAsync();
}

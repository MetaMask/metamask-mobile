import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { MetaMetricsEvents } from '../../../core/Analytics';
import type { AnalyticsTrackingEvent } from '../../analytics/AnalyticsEventBuilder';
import {
  ONBOARDING_LOADING_STALL_MS,
  type OnboardingLoadingStallScreen,
} from '../onboardingLoadingStallTracking';
import {
  trackDeferredOnboardingEvent,
  type DeferredOnboardingEventProperties,
} from '../trackDeferredOnboardingEvent';

export interface UseOnboardingLoadingStallTrackerParams {
  isLoading: boolean;
  screen: OnboardingLoadingStallScreen;
  properties?: DeferredOnboardingEventProperties;
  saveOnboardingEvent?: (event: AnalyticsTrackingEvent) => void;
}

/**
 * Fires Onboarding Loading Stalled once when `isLoading` stays true for
 * {@link ONBOARDING_LOADING_STALL_MS}. Cancels if loading ends first.
 * Behavior-neutral: tracking only.
 */
export function useOnboardingLoadingStallTracker({
  isLoading,
  screen,
  properties,
  saveOnboardingEvent,
}: UseOnboardingLoadingStallTrackerParams): void {
  const propertiesRef = useRef(properties);
  propertiesRef.current = properties;
  const saveOnboardingEventRef = useRef(saveOnboardingEvent);
  saveOnboardingEventRef.current = saveOnboardingEvent;

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const startedAt = Date.now();
    const timeoutId = setTimeout(() => {
      trackDeferredOnboardingEvent(
        MetaMetricsEvents.ONBOARDING_LOADING_STALLED,
        {
          screen,
          elapsed_ms: Date.now() - startedAt,
          app_state: String(AppState.currentState),
          ...propertiesRef.current,
        },
        saveOnboardingEventRef.current,
      );
    }, ONBOARDING_LOADING_STALL_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isLoading, screen]);
}

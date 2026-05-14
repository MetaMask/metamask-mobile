import { useEffect, useRef } from 'react';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { useHomepageScrollContext } from '../../Views/Homepage/context/HomepageScrollContext';
import {
  WALLET_HOME_ONBOARDING_VISIBLE_STEPS,
  walletHomeOnboardingCappedVisualStepIndex,
} from './walletHomeOnboardingStepsModel';
import {
  WALLET_HOME_ONBOARDING_CHECKLIST_INTERACTION_TYPE,
  walletHomeOnboardingStepKindToHomeViewedSectionName,
} from './walletHomeOnboardingChecklistAnalytics';

/**
 * Fires {@link MetaMetricsEvents.HOME_VIEWED} when the user views a checklist step
 * (`interaction_type`: onboarding_checklist, `section_name` per step).
 *
 * Aligns core props with {@link useHomeViewedEvent} / homepage scroll context.
 *
 * @see https://consensyssoftware.atlassian.net/browse/TMCU-680
 */
export function useWalletHomeOnboardingChecklistHomeViewed({
  isAwaitingBalance,
  stepIndex,
  isFocused,
}: {
  isAwaitingBalance: boolean;
  stepIndex: number;
  isFocused: boolean;
}): void {
  const { entryPoint, visitId, appSessionId } = useHomepageScrollContext();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const lastFiredVisitStepKeyRef = useRef<string | null>(null);

  useEffect(() => {
    lastFiredVisitStepKeyRef.current = null;
  }, [visitId]);

  useEffect(() => {
    if (!isFocused || visitId === 0) {
      return;
    }

    const displayIdx = isAwaitingBalance ? 0 : stepIndex;
    const cappedVisual = walletHomeOnboardingCappedVisualStepIndex(displayIdx);
    const stepKind = WALLET_HOME_ONBOARDING_VISIBLE_STEPS[cappedVisual].kind;
    const sectionName =
      walletHomeOnboardingStepKindToHomeViewedSectionName(stepKind);

    const dedupeKey = `${visitId}:${cappedVisual}`;
    if (lastFiredVisitStepKeyRef.current === dedupeKey) {
      return;
    }
    lastFiredVisitStepKeyRef.current = dedupeKey;

    trackEvent(
      createEventBuilder(MetaMetricsEvents.HOME_VIEWED)
        .addProperties({
          interaction_type: WALLET_HOME_ONBOARDING_CHECKLIST_INTERACTION_TYPE,
          location: 'home',
          section_name: sectionName,
          section_index: cappedVisual,
          total_sections_loaded: WALLET_HOME_ONBOARDING_VISIBLE_STEPS.length,
          is_empty: isAwaitingBalance && cappedVisual === 0,
          item_count: 1,
          entry_point: entryPoint,
          app_session_id: appSessionId,
          visit_number: visitId,
        })
        .build(),
    );
  }, [
    appSessionId,
    createEventBuilder,
    entryPoint,
    isAwaitingBalance,
    isFocused,
    stepIndex,
    trackEvent,
    visitId,
  ]);
}

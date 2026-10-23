import { useCallback, useEffect, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { selectIsSocialV1Enabled } from '../../../../selectors/featureFlagController/socialV1';
import type {
  SocialEventOutcome,
  SocialEventSource,
  SocialOnboardingStep,
  SocialScreenName,
  SocialScreenViewedProperties,
  SocialTabName,
  SocialUIInteractionProperties,
} from './socialEvents';
import { useSocialLeaderboardAnalytics } from './useSocialLeaderboardAnalytics';

type SocialScreenOutcome = Extract<
  SocialEventOutcome,
  'content' | 'empty' | 'error'
>;

interface UseSocialScreenViewedOptions {
  screenName: SocialScreenName;
  tabName?: SocialTabName;
  source?: SocialEventSource;
  /** `null` is loading; omit for surfaces without a data outcome. */
  outcome?: SocialScreenOutcome | null;
  step?: SocialOnboardingStep;
  isActive?: boolean;
}

/**
 * Treatment-gated emitters for the two governed Social V1 event contracts.
 */
export const useSocialV1Analytics = () => {
  const isSocialV1Enabled = useSelector(selectIsSocialV1Enabled);
  const { track } = useSocialLeaderboardAnalytics();

  const trackScreenViewed = useCallback(
    (properties: SocialScreenViewedProperties): void => {
      if (!isSocialV1Enabled) {
        return;
      }
      track(MetaMetricsEvents.SOCIAL_SCREEN_VIEWED, { ...properties });
    },
    [isSocialV1Enabled, track],
  );

  const trackInteraction = useCallback(
    (properties: SocialUIInteractionProperties): void => {
      if (!isSocialV1Enabled) {
        return;
      }
      track(MetaMetricsEvents.SOCIAL_UI_INTERACTION, { ...properties });
    },
    [isSocialV1Enabled, track],
  );

  return {
    isSocialV1Enabled,
    trackInteraction,
    trackScreenViewed,
  };
};

/**
 * Emits one screen view per focused activation. Data-backed surfaces wait for
 * a terminal outcome; surfaces without a data outcome emit on activation.
 */
export const useSocialScreenViewed = ({
  screenName,
  tabName,
  source,
  outcome,
  step,
  isActive = true,
}: UseSocialScreenViewedOptions): void => {
  const isFocused = useIsFocused();
  const { isSocialV1Enabled, trackScreenViewed } = useSocialV1Analytics();
  const activationOpenRef = useRef(false);
  const hasTrackedRef = useRef(false);
  const activationIsOpen = isSocialV1Enabled && isFocused && isActive;

  useEffect(() => {
    if (!activationIsOpen) {
      activationOpenRef.current = false;
      hasTrackedRef.current = false;
      return;
    }

    if (!activationOpenRef.current) {
      activationOpenRef.current = true;
      hasTrackedRef.current = false;
    }

    if (outcome === null || hasTrackedRef.current) {
      return;
    }

    hasTrackedRef.current = true;
    trackScreenViewed({
      screen_name: screenName,
      ...(tabName ? { tab_name: tabName } : {}),
      ...(source ? { source } : {}),
      ...(outcome ? { outcome } : {}),
      ...(step ? { step } : {}),
    });
  }, [
    activationIsOpen,
    outcome,
    screenName,
    source,
    step,
    tabName,
    trackScreenViewed,
  ]);
};

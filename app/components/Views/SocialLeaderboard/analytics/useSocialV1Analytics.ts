import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { selectIsSocialV1Enabled } from '../../../../selectors/featureFlagController/socialV1';
import {
  getSocialReactionType,
  SocialEvent,
  type SocialScreenName,
  type SocialScreenViewedProperties,
  type SocialTradeType,
  type SocialUIInteractionProperties,
} from './socialEvents';
import { useSocialLeaderboardAnalytics } from './useSocialLeaderboardAnalytics';

const { Interaction, Outcome } = SocialEvent;
type SocialScreenOutcome = NonNullable<SocialScreenViewedProperties['outcome']>;
interface UseSocialScreenViewedOptions {
  tabName?: SocialScreenViewedProperties['tab_name'];
  source?: SocialScreenViewedProperties['source'];
  outcome?: SocialScreenOutcome | null;
  state?: Parameters<typeof getSocialScreenOutcome>;
  step?: SocialScreenViewedProperties['step'];
  isActive?: boolean;
  /** Blur clears the latch. Manage Profile keeps one view for the visit. */
  resetWhenInactive?: boolean;
}
type SocialInteractionContext = Partial<
  Pick<SocialUIInteractionProperties, 'source' | 'tab_name' | 'step'>
>;
type SocialInteractionDetails = Omit<
  SocialUIInteractionProperties,
  'interaction_type' | 'screen_name'
>;
type SocialInteractionOutcome = NonNullable<
  SocialInteractionDetails['outcome']
>;
export const useSocialAnalytics = () => {
  const isSocialV1Enabled = useSelector(selectIsSocialV1Enabled);
  const { track } = useSocialLeaderboardAnalytics();
  const trackInteraction = useCallback(
    (properties: SocialUIInteractionProperties) => {
      if (isSocialV1Enabled) {
        track(MetaMetricsEvents.SOCIAL_UI_INTERACTION, { ...properties });
      }
    },
    [isSocialV1Enabled, track],
  );
  const trackScreenViewed = useCallback(
    (properties: SocialScreenViewedProperties) => {
      if (isSocialV1Enabled) {
        track(MetaMetricsEvents.SOCIAL_SCREEN_VIEWED, { ...properties });
      }
    },
    [isSocialV1Enabled, track],
  );
  return { isSocialV1Enabled, trackInteraction, trackScreenViewed };
};
type Tracker = ReturnType<typeof useSocialAnalytics>['trackInteraction'];
const useBoundSocialInteraction = (
  trackInteraction: Tracker,
  screen_name: SocialScreenName,
  { source, step, tab_name }: SocialInteractionContext = {},
  enabled = true,
) =>
  useCallback(
    (
      interaction_type: SocialUIInteractionProperties['interaction_type'],
      details?: SocialInteractionDetails | SocialInteractionOutcome,
    ) => {
      if (!enabled) {
        return;
      }
      trackInteraction({
        interaction_type,
        screen_name,
        ...(tab_name ? { tab_name } : {}),
        ...(source ? { source } : {}),
        ...(step ? { step } : {}),
        ...(typeof details === 'string' ? { outcome: details } : details),
      });
    },
    [enabled, screen_name, source, step, tab_name, trackInteraction],
  );
export const useSocialInteraction = (
  screenName: SocialScreenName,
  context?: SocialInteractionContext,
  enabled?: boolean,
) => {
  const { trackInteraction: emit } = useSocialAnalytics();
  return useBoundSocialInteraction(emit, screenName, context, enabled);
};
export const useSocialFeedInteractions = (
  screenName: SocialScreenName,
  context?: SocialInteractionContext,
  enabled = true,
) => {
  const track = useSocialInteraction(screenName, context, enabled);
  return useMemo(
    () => ({
      onCopyTradeInteraction: (trade_type: SocialTradeType) =>
        track(Interaction.COPY_TRADE_TAPPED, { trade_type }),
      onReactionInteraction: (action: 'added' | 'removed', emotion: string) => {
        const reaction_type = getSocialReactionType(emotion);
        if (reaction_type) {
          track(
            action === 'added'
              ? Interaction.REACTION_ADDED
              : Interaction.REACTION_REMOVED,
            { reaction_type },
          );
        }
      },
      onReactionPickerOpened: () => track(Interaction.REACTION_PICKER_OPENED),
    }),
    [track],
  );
};
const getSocialScreenOutcome = (
  isLoading: boolean,
  hasError: boolean,
  hasContent: boolean,
): SocialScreenOutcome | null =>
  isLoading && !hasContent
    ? null
    : hasError && !hasContent
      ? Outcome.ERROR
      : hasContent
        ? Outcome.CONTENT
        : Outcome.EMPTY;
export const useSocialScreenAnalytics = (
  screenName: SocialScreenName,
  {
    tabName,
    source,
    outcome,
    state,
    step,
    isActive = true,
    resetWhenInactive = true,
  }: UseSocialScreenViewedOptions = {},
) => {
  const isFocused = useIsFocused();
  const { isSocialV1Enabled, trackInteraction, trackScreenViewed } =
    useSocialAnalytics();
  const hasTrackedRef = useRef(false);
  const activationIsOpen = isSocialV1Enabled && isFocused && isActive;
  const resolvedOutcome = state ? getSocialScreenOutcome(...state) : outcome;
  useEffect(() => {
    if (!activationIsOpen) {
      if (resetWhenInactive) {
        hasTrackedRef.current = false;
      }
      return;
    }
    if (resolvedOutcome === null || hasTrackedRef.current) {
      return;
    }
    hasTrackedRef.current = true;
    trackScreenViewed({
      screen_name: screenName,
      ...(tabName ? { tab_name: tabName } : {}),
      ...(source ? { source } : {}),
      ...(resolvedOutcome ? { outcome: resolvedOutcome } : {}),
      ...(step ? { step } : {}),
    });
  }, [
    activationIsOpen,
    resolvedOutcome,
    screenName,
    source,
    resetWhenInactive,
    step,
    tabName,
    trackScreenViewed,
  ]);
  return useBoundSocialInteraction(
    trackInteraction,
    screenName,
    { tab_name: tabName, source, step },
    isActive,
  );
};

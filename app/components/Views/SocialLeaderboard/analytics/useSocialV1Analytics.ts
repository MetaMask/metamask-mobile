import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { selectIsSocialV1Enabled } from '../../../../selectors/featureFlagController/socialV1';
import { SOCIAL_TERMS_VERSION } from '../terms/socialTermsAcceptance';
import { withSocialAppBuild } from './socialAppBuild';
import {
  getSocialInteractionMilestones,
  getSocialScreenViewedMilestones,
  type SocialMilestoneEmission,
} from './socialMilestoneEvents';
import {
  getSocialReactionType,
  SocialEvent,
  type SocialBlockedAction,
  type SocialBlockedHandler,
  type SocialBlockedReason,
  type SocialCopyTradeAnalyticsProperties,
  type SocialPositionAnalyticsProperties,
  type SocialScreenName,
  type SocialScreenViewedProperties,
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
  /**
   * Sent on the view and on every interaction bound to it. Pass a memoized
   * object so the bound tracker stays stable.
   */
  properties?: SocialScreenContextProperties;
  isActive?: boolean;
  /** Blur clears the latch. Manage Profile keeps one view for the visit. */
  resetWhenInactive?: boolean;
}
type SocialScreenContextProperties = SocialPositionAnalyticsProperties &
  Pick<
    SocialScreenViewedProperties,
    | 'composer_entry'
    | 'share_id'
    | 'order_id'
    | 'transaction_hash'
    | 'onboarding_trigger'
  >;
type SocialInteractionContext = Partial<
  Pick<SocialUIInteractionProperties, 'source' | 'tab_name' | 'step'>
> & { properties?: SocialScreenContextProperties };
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
  const trackMilestone = useCallback(
    (emission: SocialMilestoneEmission) => {
      if (isSocialV1Enabled) {
        track(emission.event, withSocialAppBuild(emission.properties));
      }
    },
    [isSocialV1Enabled, track],
  );
  const trackInteraction = useCallback(
    (properties: SocialUIInteractionProperties) => {
      if (isSocialV1Enabled) {
        // TODO(TSA-1860): remove this legacy `Social UI Interaction` emit once
        // the milestone events below are the only ones dashboards read.
        track(
          MetaMetricsEvents.SOCIAL_UI_INTERACTION,
          withSocialAppBuild(properties),
        );
        getSocialInteractionMilestones(properties).forEach((emission) =>
          trackMilestone(emission),
        );
      }
    },
    [isSocialV1Enabled, track, trackMilestone],
  );
  const trackScreenViewed = useCallback(
    (properties: SocialScreenViewedProperties) => {
      if (isSocialV1Enabled) {
        // TODO(TSA-1860): remove this legacy `Social Screen Viewed` emit once
        // the milestone events below are the only ones dashboards read.
        track(
          MetaMetricsEvents.SOCIAL_SCREEN_VIEWED,
          withSocialAppBuild(properties),
        );
        getSocialScreenViewedMilestones(properties).forEach((emission) =>
          trackMilestone(emission),
        );
      }
    },
    [isSocialV1Enabled, track, trackMilestone],
  );
  return {
    isSocialV1Enabled,
    trackInteraction,
    trackScreenViewed,
    trackMilestone,
  };
};
type Tracker = ReturnType<typeof useSocialAnalytics>['trackInteraction'];
const useBoundSocialInteraction = (
  trackInteraction: Tracker,
  screen_name: SocialScreenName,
  { source, step, tab_name, properties }: SocialInteractionContext = {},
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
      const detailProperties: SocialInteractionDetails =
        typeof details === 'string'
          ? { outcome: details }
          : { ...(details ?? {}) };
      const shareDestination =
        interaction_type === Interaction.POST_SHARED
          ? detailProperties.share_destination
          : undefined;
      delete detailProperties.share_destination;
      delete detailProperties.terms_version;
      const resolvedStep = detailProperties.step ?? step;
      trackInteraction({
        interaction_type,
        screen_name,
        ...(tab_name ? { tab_name } : {}),
        ...(source ? { source } : {}),
        ...(resolvedStep ? { step: resolvedStep } : {}),
        ...properties,
        ...detailProperties,
        ...(resolvedStep === SocialEvent.Step.TERMS
          ? { terms_version: SOCIAL_TERMS_VERSION }
          : {}),
        ...(shareDestination ? { share_destination: shareDestination } : {}),
      });
    },
    [
      enabled,
      properties,
      screen_name,
      source,
      step,
      tab_name,
      trackInteraction,
    ],
  );
export const useSocialInteraction = (
  screenName: SocialScreenName,
  context?: SocialInteractionContext,
  enabled?: boolean,
) => {
  const { trackInteraction: emit } = useSocialAnalytics();
  return useBoundSocialInteraction(emit, screenName, context, enabled);
};
/**
 * Reports `action_blocked` for the surface that owns a gated tap. Hand the
 * result to `useRequireSocialProfileOnboarding` and `useSocialTermsGate` as
 * `onBlocked`. Pass `undefined` for a surface that must stay silent.
 */
export const useTrackSocialActionBlocked = (
  screenName: SocialScreenName | undefined,
): SocialBlockedHandler | undefined => {
  const track = useSocialInteraction(
    screenName ?? SocialEvent.Screen.TRENDING,
    undefined,
    screenName !== undefined,
  );
  return useMemo(
    () =>
      screenName === undefined
        ? undefined
        : (blocked: SocialBlockedAction) =>
            track(Interaction.ACTION_BLOCKED, blocked),
    [screenName, track],
  );
};
export const useSocialFeedInteractions = (
  screenName: SocialScreenName,
  context?: SocialInteractionContext,
  enabled = true,
) => {
  const track = useSocialInteraction(screenName, context, enabled);
  return useMemo(
    () => ({
      onCopyTradeInteraction: (position: SocialCopyTradeAnalyticsProperties) =>
        track(Interaction.COPY_TRADE_TAPPED, position),
      onCopyTradeBlocked: (
        position: SocialPositionAnalyticsProperties,
        blocked_reason: SocialBlockedReason,
      ) =>
        track(Interaction.COPY_TRADE_BLOCKED, { ...position, blocked_reason }),
      onActionBlocked: (blocked: SocialBlockedAction) =>
        track(Interaction.ACTION_BLOCKED, blocked),
      onPositionTap: (position: SocialPositionAnalyticsProperties) =>
        track(Interaction.TAP, position),
      onReactionInteraction: (
        action: 'added' | 'removed',
        emotion: string,
        subject?: { post_id?: string; author_trader_id?: string },
      ) => {
        const reaction_type = getSocialReactionType(emotion);
        if (reaction_type) {
          track(
            action === 'added'
              ? Interaction.REACTION_ADDED
              : Interaction.REACTION_REMOVED,
            { reaction_type, ...subject },
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
    properties,
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
      ...properties,
    });
  }, [
    activationIsOpen,
    properties,
    resolvedOutcome,
    screenName,
    source,
    resetWhenInactive,
    step,
    tabName,
    trackScreenViewed,
  ]);
  const context = useMemo(
    () => ({ tab_name: tabName, source, step, properties }),
    [properties, source, step, tabName],
  );
  return useBoundSocialInteraction(
    trackInteraction,
    screenName,
    context,
    isActive,
  );
};

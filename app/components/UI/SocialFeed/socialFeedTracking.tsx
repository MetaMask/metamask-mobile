import React, { createContext, useContext, useMemo } from 'react';
import {
  SocialEvent,
  useSocialFeedInteractions,
  useSocialInteraction,
  useSocialScreenAnalytics,
} from '../../Views/SocialLeaderboard/analytics';
import type {
  SocialBlockedReason,
  SocialEventSource,
  SocialPositionAnalyticsProperties,
  SocialScreenName,
  SocialTabName,
} from '../../Views/SocialLeaderboard/analytics/socialEvents';
import type { SocialSurfaceLocation } from './SocialFeedSurface';

const { Interaction, Screen, Source, Tab } = SocialEvent;

interface FeedTarget {
  screen: SocialScreenName;
  tab?: SocialTabName;
  source?: SocialEventSource;
  /** The feed query is this screen, so it decides the screen-view outcome. */
  view?: boolean;
}

/** Surfaces whose posts emit Social events. Anything else stays silent. */
const FEED_TRACKING: Partial<Record<SocialSurfaceLocation, FeedTarget>> = {
  social_trending: { screen: Screen.TRENDING, tab: Tab.TRENDING, view: true },
  social_following: { screen: Screen.FOLLOWING, tab: Tab.FOLLOWING },
  social_live: { screen: Screen.LIVE_TRADES, tab: Tab.LIVE_TRADES, view: true },
  my_profile: { screen: Screen.MY_PROFILE },
  trader_profile: { screen: Screen.TRADER_PROFILE },
  token_details: { screen: Screen.TRENDING, source: Source.ASSET_DETAILS },
  perps_home: { screen: Screen.TRENDING, source: Source.PERPS_HOME },
  perps_market_details: {
    screen: Screen.TRENDING,
    source: Source.PERP_ASSET_SCREEN,
  },
};

export const socialFeedTracksLocation = (
  location?: SocialSurfaceLocation,
): boolean => location != null && FEED_TRACKING[location] != null;

interface SocialFeedTracking {
  onCopyTradeInteraction?: (
    position: SocialPositionAnalyticsProperties,
  ) => void;
  onCopyTradeBlocked?: (
    position: SocialPositionAnalyticsProperties,
    reason: SocialBlockedReason,
  ) => void;
  onReactionInteraction?: (
    action: 'added' | 'removed',
    emotion: string,
  ) => void;
  onReactionPickerOpened?: () => void;
  onAuthorTap?: (position: SocialPositionAnalyticsProperties) => void;
  onPositionTap?: (position: SocialPositionAnalyticsProperties) => void;
}

const EMPTY: SocialFeedTracking = {};
const Context = createContext<SocialFeedTracking>(EMPTY);

/**
 * One analytics subscription for a feed. Posts read it; hosts do not.
 * `source` overrides the origin implied by `location`.
 */
export const SocialFeedTrackingProvider: React.FC<{
  location: SocialSurfaceLocation;
  source?: SocialEventSource;
  enabled?: boolean;
  children: React.ReactNode;
}> = ({ location, source, enabled = true, children }) => {
  const mapped = FEED_TRACKING[location];
  const context = { source: source ?? mapped?.source, tab_name: mapped?.tab };
  const active = enabled && Boolean(mapped);
  const interactions = useSocialFeedInteractions(
    mapped?.screen ?? Screen.TRENDING,
    context,
    active,
  );
  const track = useSocialInteraction(
    mapped?.screen ?? Screen.TRENDING,
    context,
    active,
  );
  const value = useMemo<SocialFeedTracking>(
    () =>
      active
        ? {
            ...interactions,
            onAuthorTap: ({ trader_address, trader_username }) =>
              track(Interaction.TAP, {
                ...(trader_address ? { trader_address } : {}),
                ...(trader_username ? { trader_username } : {}),
              }),
          }
        : EMPTY,
    [active, interactions, track],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
};

export const useSocialFeedTracking = (): SocialFeedTracking =>
  useContext(Context);

/** Screen view for a feed that is the screen. Other surfaces no-op. */
export const useSocialFeedScreenView = (
  location: SocialSurfaceLocation,
  source: SocialEventSource | undefined,
  state: [boolean, boolean, boolean],
  isActive = true,
) => {
  const mapped = FEED_TRACKING[location];
  useSocialScreenAnalytics(mapped?.screen ?? Screen.TRENDING, {
    tabName: mapped?.tab,
    source: source ?? mapped?.source,
    state: mapped?.view ? state : undefined,
    isActive: Boolean(mapped?.view) && isActive,
  });
};

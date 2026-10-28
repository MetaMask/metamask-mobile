import React, { useContext, useMemo } from 'react';
import type { SocialEventSource } from '../../Views/SocialLeaderboard/analytics/socialEvents';
import {
  SocialFeedTrackingProvider,
  socialFeedTracksLocation,
} from './socialFeedTracking';

/**
 * Where a social surface (feed or leaderboard) is shown. Feed locations
 * record post interactions from here; the host does not.
 */
export type SocialSurfaceLocation =
  | 'social_trending'
  | 'social_following'
  | 'social_live'
  | 'social_leaderboard'
  | 'my_profile'
  | 'social_post_composer'
  | 'trader_profile'
  | 'token_details'
  | 'perps_home'
  | 'perps_market_details'
  | 'social_feed_screen';

export type SocialFeedLocation = SocialSurfaceLocation;

export interface SocialFeedSurface {
  location?: SocialSurfaceLocation;
  /**
   * Social V1 keeps invented values visible so missing data stays obvious.
   * Every other surface hides them. Defaults to hidden when no provider is
   * mounted, so a new host cannot show them by accident.
   */
  showMockedFields: boolean;
}

const DEFAULT_SURFACE: SocialFeedSurface = { showMockedFields: false };

const SocialFeedSurfaceContext =
  React.createContext<SocialFeedSurface>(DEFAULT_SURFACE);

export interface SocialFeedSurfaceProviderProps {
  /** Replaces the outer surface's location. Omitted keeps the outer one. */
  location?: SocialSurfaceLocation;
  /** Replaces the outer surface's mocked-field flag. Omitted keeps it. */
  showMockedFields?: boolean;
  /**
   * Where the user came from. Overrides the origin `location` already implies
   * (`perps_home`, `perp_asset_screen`). Omitted on a nested provider does not
   * inherit.
   */
  analyticsSource?: SocialEventSource;
  /** Owner-only surfaces pass false so a visitor's view stays silent. */
  analyticsEnabled?: boolean;
  children: React.ReactNode;
}

/**
 * Says which surface is rendering the feed, and whether invented values
 * should show. An inner provider overrides only the fields it sets, so a tab
 * can name its own location while keeping the screen's mocked-field choice.
 */
export const SocialFeedSurfaceProvider: React.FC<
  SocialFeedSurfaceProviderProps
> = ({
  location,
  showMockedFields,
  analyticsSource,
  analyticsEnabled = true,
  children,
}) => {
  const outer = useContext(SocialFeedSurfaceContext);
  const value = useMemo(
    (): SocialFeedSurface => ({
      location: location ?? outer.location,
      showMockedFields: showMockedFields ?? outer.showMockedFields,
    }),
    [location, outer.location, outer.showMockedFields, showMockedFields],
  );
  const body =
    value.location && socialFeedTracksLocation(value.location) ? (
      <SocialFeedTrackingProvider
        location={value.location}
        source={analyticsSource}
        enabled={analyticsEnabled}
      >
        {children}
      </SocialFeedTrackingProvider>
    ) : (
      children
    );

  return (
    <SocialFeedSurfaceContext.Provider value={value}>
      {body}
    </SocialFeedSurfaceContext.Provider>
  );
};

export const useSocialFeedSurface = (): SocialFeedSurface =>
  useContext(SocialFeedSurfaceContext);

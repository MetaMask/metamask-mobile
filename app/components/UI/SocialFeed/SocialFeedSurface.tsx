import React, { useContext, useMemo } from 'react';

/**
 * Where a feed is shown. Attached to feed events once those events exist;
 * nothing reads it for tracking yet.
 */
export type SocialFeedLocation =
  | 'social_trending'
  | 'social_following'
  | 'social_live_trades'
  | 'my_profile'
  | 'social_post_composer'
  | 'trader_profile'
  | 'token_details'
  | 'perps_market_details'
  | 'social_feed_screen';

export interface SocialFeedSurface {
  location?: SocialFeedLocation;
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
  location?: SocialFeedLocation;
  /** Replaces the outer surface's mocked-field flag. Omitted keeps it. */
  showMockedFields?: boolean;
  children: React.ReactNode;
}

/**
 * Says which surface is rendering the feed, and whether invented values
 * should show. An inner provider overrides only the fields it sets, so a tab
 * can name its own location while keeping the screen's mocked-field choice.
 */
export const SocialFeedSurfaceProvider: React.FC<
  SocialFeedSurfaceProviderProps
> = ({ location, showMockedFields, children }) => {
  const outer = useContext(SocialFeedSurfaceContext);
  const value = useMemo(
    (): SocialFeedSurface => ({
      location: location ?? outer.location,
      showMockedFields: showMockedFields ?? outer.showMockedFields,
    }),
    [location, outer.location, outer.showMockedFields, showMockedFields],
  );

  return (
    <SocialFeedSurfaceContext.Provider value={value}>
      {children}
    </SocialFeedSurfaceContext.Provider>
  );
};

export const useSocialFeedSurface = (): SocialFeedSurface =>
  useContext(SocialFeedSurfaceContext);

/**
 * Component-view renderers for Top Traders / Social Leaderboard screens.
 *
 * Provides:
 * - renderTopTradersView – standalone leaderboard page
 * - renderTopTradersViewWithRoutes – leaderboard + extra registered routes (use for navigation assertions)
 * - renderSettingsTopTradersSection – privacy toggle in SecuritySettings
 */

import '../mocks';
import React from 'react';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { renderComponentViewScreen, renderScreenWithRoutes } from '../render';
import Routes from '../../../app/constants/navigation/Routes';
import TopTradersView from '../../../app/components/Views/SocialLeaderboard/TopTradersView/TopTradersView';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import SettingsTopTradersSection from '../../../app/components/Views/Settings/SecuritySettings/Sections/TopTradersSection';
import {
  initialStateSocialLeaderboard,
  type SocialLeaderboardPresetOptions,
} from '../presets/socialLeaderboard';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface RenderSocialLeaderboardOptions {
  presetOptions?: SocialLeaderboardPresetOptions;
  overrides?: DeepPartial<RootState>;
}

// ---------------------------------------------------------------------------
// TopTradersView – leaderboard page
// ---------------------------------------------------------------------------

/**
 * Renders `TopTradersView` inside the CV framework (QueryClient + Navigator).
 * Use when the test only needs to assert visible state without navigating away.
 */
export function renderTopTradersView(
  options: RenderSocialLeaderboardOptions = {},
) {
  const { presetOptions, overrides } = options;
  const builder = initialStateSocialLeaderboard(presetOptions);
  if (overrides) builder.withOverrides(overrides);
  const state = builder.build();

  return renderComponentViewScreen(
    TopTradersView as unknown as React.ComponentType,
    { name: Routes.SOCIAL.V0 },
    { state },
  );
}

/**
 * Renders `TopTradersView` with additional routes registered so tests can
 * assert navigation by checking for route probe elements.
 *
 * @param extraRoutes - Routes that the component may navigate to during the
 * test (e.g. PROFILE, TRADING_SIGNALS_SETUP). Each becomes a probe screen
 * with `testID = route-${name}` unless a custom Component is given.
 */
export function renderTopTradersViewWithRoutes(
  extraRoutes: { name: string; Component?: React.ComponentType<object> }[],
  options: RenderSocialLeaderboardOptions = {},
) {
  const { presetOptions, overrides } = options;
  const builder = initialStateSocialLeaderboard(presetOptions);
  if (overrides) builder.withOverrides(overrides);
  const state = builder.build();

  return renderScreenWithRoutes(
    TopTradersView as unknown as React.ComponentType,
    { name: Routes.SOCIAL.V0 },
    extraRoutes,
    { state },
  );
}

// ---------------------------------------------------------------------------
// Settings TopTradersSection – privacy opt-in/out toggle
// ---------------------------------------------------------------------------

/**
 * Renders the Security & Privacy `TopTradersSection` toggle in isolation.
 *
 * The component reads feature flags and `settings.showAccountOnLeaderboard`
 * from Redux, and calls Engine.controllerMessenger for opt-in/opt-out.
 * No external API mock is required; the default Engine mock is sufficient.
 */
export function renderSettingsTopTradersSection(
  options: RenderSocialLeaderboardOptions = {},
) {
  const { presetOptions, overrides } = options;
  const builder = initialStateSocialLeaderboard(presetOptions);
  if (overrides) builder.withOverrides(overrides);
  const state = builder.build();

  return renderComponentViewScreen(
    SettingsTopTradersSection as unknown as React.ComponentType,
    { name: 'SettingsTopTradersSection' },
    { state },
  );
}

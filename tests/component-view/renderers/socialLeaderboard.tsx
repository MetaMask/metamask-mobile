/**
 * Component-view renderers for Top Traders / Social Leaderboard screens.
 *
 * Provides:
 * - renderTopTradersView – standalone leaderboard page
 * - renderTopTradersViewWithRoutes – leaderboard + extra registered routes (use for navigation assertions)
 * - renderTopTradersViewWithProps – leaderboard with host-owned props (pinned type, V1 chrome)
 * - renderHomeTopTradersSection – homepage "Top traders" carousel inside a measurable homepage viewport
 * - renderSettingsTopTradersSection – privacy toggle in SecuritySettings
 */

import '../mocks';
import React from 'react';
import { View } from 'react-native';
import { SolAccountType, SolScope } from '@metamask/keyring-api';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { renderComponentViewScreen, renderScreenWithRoutes } from '../render';
import Routes from '../../../app/constants/navigation/Routes';
import ReduxService from '../../../app/core/redux/ReduxService';
import type { ReduxStore } from '../../../app/core/redux/types';
import TopTradersView from '../../../app/components/Views/SocialLeaderboard/TopTradersView/TopTradersView';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import SettingsTopTradersSection from '../../../app/components/Views/Settings/SecuritySettings/Sections/TopTradersSection';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import TopTradersSection from '../../../app/components/Views/Homepage/Sections/TopTraders/TopTradersSection';
import {
  HomepageEntryPoints,
  HomepageScrollContext,
  // eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
} from '../../../app/components/Views/Homepage/context/HomepageScrollContext';
import {
  initialStateSocialLeaderboard,
  type SocialLeaderboardPresetOptions,
} from '../presets/socialLeaderboard';
import SocialProfileOnboardingView from '../../../app/components/Views/SocialLeaderboard/ProfileOnboarding';
import SocialV1View from '../../../app/components/Views/SocialLeaderboard/SocialV1View';
import { AccessRestrictedProvider } from '../../../app/components/UI/Compliance';
import { createStateFixture } from '../stateFixture';

type TopTradersViewProps = React.ComponentProps<typeof TopTradersView>;

interface ExtraRoute {
  name: string;
  Component?: React.ComponentType<object>;
}

function SocialV1ViewWithCompliance() {
  return (
    <AccessRestrictedProvider>
      <SocialV1View />
    </AccessRestrictedProvider>
  );
}

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

/**
 * Renders `TopTradersView` with host-owned props (e.g. `pinnedTypeFilter`,
 * `useV1Filters`) plus extra routes. The Social V1 shell and the legacy
 * Follow Trading home mount the same view with different props; this lets a
 * test exercise those arms without rendering the whole shell.
 */
export function renderTopTradersViewWithProps(
  props: Partial<TopTradersViewProps>,
  extraRoutes: ExtraRoute[] = [],
  options: RenderSocialLeaderboardOptions = {},
) {
  const { presetOptions, overrides } = options;
  const builder = initialStateSocialLeaderboard(presetOptions);
  if (overrides) builder.withOverrides(overrides);
  const state = builder.build();

  const TopTradersViewWithProps = () => <TopTradersView {...props} />;

  return renderScreenWithRoutes(
    TopTradersViewWithProps as unknown as React.ComponentType,
    { name: Routes.SOCIAL.V0 },
    extraRoutes,
    { state },
  );
}

// ---------------------------------------------------------------------------
// Homepage TopTradersSection – "Top traders" carousel entry point
// ---------------------------------------------------------------------------

/** Viewport the homepage scroll context reports to its sections under test. */
export const HOME_SECTION_VIEWPORT_HEIGHT = 800;
export const HOME_SECTION_MEASURED_HEIGHT = 320;

/**
 * Homepage sections only request data once they measure as visible inside the
 * homepage scroll viewport. The RN Jest preset stubs `measureInWindow` with a
 * no-op, so without this the section would sit on its idle skeleton forever.
 * Resolves every measurement as a fully visible section at the top of the
 * viewport. Call in `beforeEach`; restore the returned spy in `afterEach`.
 */
export function stubHomepageSectionMeasurement(): jest.SpyInstance {
  return jest
    .spyOn(View.prototype, 'measureInWindow')
    .mockImplementation(
      (
        callback: (x: number, y: number, width: number, height: number) => void,
      ) => {
        callback(0, 0, 390, HOME_SECTION_MEASURED_HEIGHT);
      },
    );
}

const HOMEPAGE_SECTION_ROUTE = 'HomepageTopTradersSection';

/**
 * Renders the homepage `TopTradersSection` as a navigator screen inside a
 * homepage scroll context with a real viewport, so the section's visibility
 * gate opens and the leaderboard query runs. Registers `extraRoutes` for
 * navigation assertions.
 *
 * Also points `ReduxService.store` at the rendered store: the section's
 * "View all" entry goes through `navigateToSocialLeaderboard`, which reads the
 * onboarding gate and the Social V1 assignment straight from the store.
 */
export function renderHomeTopTradersSection(
  extraRoutes: ExtraRoute[] = [],
  options: RenderSocialLeaderboardOptions = {},
) {
  const { presetOptions, overrides } = options;
  const builder = initialStateSocialLeaderboard(presetOptions);
  if (overrides) builder.withOverrides(overrides);
  const state = builder.build();

  const scrollContextValue = {
    subscribeToScroll: () => () => undefined,
    viewportHeight: HOME_SECTION_VIEWPORT_HEIGHT,
    containerScreenY: 0,
    entryPoint: HomepageEntryPoints.HOME_TAB,
    visitId: 1,
    notifySectionViewed: () => undefined,
    getViewedSectionCount: () => 0,
    getVisitMaxDepth: () => -1,
    appSessionId: 'component-view-session',
  };

  const HomeTopTradersSectionScreen = () => (
    <HomepageScrollContext.Provider value={scrollContextValue}>
      <TopTradersSection sectionIndex={0} totalSectionsLoaded={1} />
    </HomepageScrollContext.Provider>
  );

  const result = renderScreenWithRoutes(
    HomeTopTradersSectionScreen as unknown as React.ComponentType,
    { name: HOMEPAGE_SECTION_ROUTE },
    extraRoutes,
    { state },
  );
  ReduxService.store = result.store as unknown as ReduxStore;
  return result;
}

/**
 * Renders profile onboarding with an EVM account that has a native mainnet
 * balance, plus a Solana account. The balance hooks are EVM-only. Onboarding
 * must mount and list only the EVM account.
 */
export function renderSocialProfileOnboarding(
  extraRoutes: { name: string; Component?: React.ComponentType<object> }[] = [],
) {
  const state = createStateFixture()
    .withMinimalAccounts()
    .withMinimalKeyringController()
    .withMinimalMainnetNetwork()
    .withOverrides({
      engine: {
        backgroundState: {
          PreferencesController: {
            privacyMode: false,
          },
          AccountsController: {
            internalAccounts: {
              accounts: {
                'sol-1': {
                  id: 'sol-1',
                  address: 'pXwSggYaFeUryz86UoCs9ugZ4VWoZ7R1U5CVhxYjL61',
                  metadata: {
                    name: 'Solana Account',
                    importTime: 1,
                    keyring: { type: 'Snap Keyring' },
                  },
                  options: {},
                  methods: [],
                  type: SolAccountType.DataAccount,
                  scopes: [SolScope.Mainnet],
                },
              },
            },
          },
          NetworkEnablementController: {
            enabledNetworkMap: {
              eip155: {
                '0x1': true,
              },
            },
          },
          AssetsController: {
            assetsInfo: {
              'eip155:1/slip44:60': { type: 'native', decimals: 18 },
            },
            assetsBalance: {
              'acc-1': {
                'eip155:1/slip44:60': { amount: '1' },
              },
            },
          },
        },
      },
    })
    .build();

  return renderScreenWithRoutes(
    SocialProfileOnboardingView as unknown as React.ComponentType,
    { name: Routes.SOCIAL.PROFILE_ONBOARDING },
    extraRoutes,
    { state },
  );
}

// ---------------------------------------------------------------------------
// Settings TopTradersSection – privacy opt-in/out toggle
// ---------------------------------------------------------------------------

/**
 * Renders Social V1 with extra routes so copy-trade navigation can be
 * asserted. Wraps the access-restricted modal the compliance gate shows.
 */
export function renderSocialV1ViewWithRoutes(
  extraRoutes: { name: string; Component?: React.ComponentType<object> }[],
  options: RenderSocialLeaderboardOptions = {},
) {
  const { presetOptions, overrides } = options;
  const builder = initialStateSocialLeaderboard(presetOptions);
  if (overrides) builder.withOverrides(overrides);
  const state = builder.build();

  return renderScreenWithRoutes(
    SocialV1ViewWithCompliance as unknown as React.ComponentType,
    { name: Routes.SOCIAL.V1 },
    extraRoutes,
    { state },
  );
}

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

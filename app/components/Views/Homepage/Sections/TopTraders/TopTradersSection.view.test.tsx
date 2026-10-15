/**
 * Component-view tests for the homepage "Top traders" carousel.
 *
 * The section is the Social leaderboard's homepage entry point. These tests
 * drive it through the real pipeline – homepage viewport visibility gate →
 * Engine.controllerMessenger → React Query (useTopTraders) → Redux follow
 * state → rendered cards – and assert where each entry point lands, without
 * mocking hooks or selectors. External I/O is intercepted at the messenger
 * (tests/component-view/api-mocking/socialLeaderboard.ts).
 *
 * Run with:
 * yarn jest -c jest.config.view.js app/components/Views/Homepage/Sections/TopTraders/TopTradersSection.view.test.tsx --runInBand --silent --coverage=false
 */

import '../../../../../../tests/component-view/mocks';
import {
  renderHomeTopTradersSection,
  restoreHomeTopTradersSectionStore,
  stubHomepageSectionMeasurement,
} from '../../../../../../tests/component-view/renderers/socialLeaderboard';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { TopTradersSectionSelectorsIDs } from './TopTradersSection.testIds';
import { getTopTraderCardTestId } from './components/TopTraderCard.testIds';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import {
  DEFAULT_LEADERBOARD_SORT,
  SPOT_CHAINS,
} from '../../../shared/top-traders-constants';
import {
  clearLeaderboardApiMock,
  getLeaderboardMessengerSpy,
  mockLeaderboardTraders,
  setupLeaderboardApiMock,
} from '../../../../../../tests/component-view/api-mocking/socialLeaderboard';
import {
  createRouteParamsProbe,
  getRouteParamsProbeTestId,
  getRouteProbeTestId,
} from '../../../../../../tests/component-view/render';
// eslint-disable-next-line import-x/no-restricted-paths -- test-only: asserts the shared homepage section title id
import { WalletViewSelectorsIDs } from '../../../Wallet/WalletView.testIds';
// eslint-disable-next-line import-x/no-restricted-paths -- test-only: drives the A/B assignments this entry point forwards
import { LEADERBOARD_LANDING_FEED_AB_KEY } from '../../../SocialLeaderboard/SocialV0View/abTestConfig';
// eslint-disable-next-line import-x/no-restricted-paths -- test-only: drives the A/B assignments this entry point forwards
import { SOCIAL_V1_AB_KEY } from '../../../SocialLeaderboard/SocialV1View/abTestConfig';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SECTION_ROOT_ID = TopTradersSectionSelectorsIDs.ROOT;
const CAROUSEL_ID = TopTradersSectionSelectorsIDs.CAROUSEL;
const VIEW_MORE_CARD_ID = TopTradersSectionSelectorsIDs.VIEW_MORE_CARD;
const SECTION_TITLE_ID =
  WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE('top-traders');
const [alpha, beta, gamma] = mockLeaderboardTraders;

const cardId = getTopTraderCardTestId;

const abTestOverrides = (flags: Record<string, string>) => ({
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: { remoteFeatureFlags: flags },
    },
  },
});

const findAlphaCard = () => screen.findByTestId(cardId(alpha.profileId));

const readRouteParams = async (routeName: string) => {
  const probe = await screen.findByTestId(getRouteParamsProbeTestId(routeName));
  return JSON.parse(probe.props.children as string) as Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describeForPlatforms('Homepage TopTradersSection', () => {
  let measurementSpy: jest.SpyInstance;

  beforeEach(() => {
    measurementSpy = stubHomepageSectionMeasurement();
    setupLeaderboardApiMock();
  });

  afterEach(() => {
    restoreHomeTopTradersSectionStore();
    clearLeaderboardApiMock();
    measurementSpy.mockRestore();
  });

  // -------------------------------------------------------------------------
  // One visit: ranked cards, unfollow, follow, then open a profile
  // -------------------------------------------------------------------------

  it('ranks the spot traders, unfollows one, follows the other, and opens their profile', async () => {
    renderHomeTopTradersSection(
      [
        {
          name: Routes.SOCIAL.PROFILE,
          Component: createRouteParamsProbe(Routes.SOCIAL.PROFILE),
        },
      ],
      { presetOptions: { followingProfileIds: [alpha.profileId] } },
    );

    // The idle placeholder is on screen before any data lands.
    expect(screen.getByTestId(CAROUSEL_ID)).toBeOnTheScreen();
    expect(screen.queryByTestId(cardId(alpha.profileId))).not.toBeOnTheScreen();

    expect(await findAlphaCard()).toBeOnTheScreen();

    // Homepage mirrors the leaderboard landing query: spot chains, P&L sort.
    expect(getLeaderboardMessengerSpy()).toHaveBeenCalledWith(
      'SocialService:fetchLeaderboard',
      expect.objectContaining({
        chains: SPOT_CHAINS,
        sort: DEFAULT_LEADERBOARD_SORT,
      }),
    );
    const carousel = screen.getByTestId(CAROUSEL_ID);
    const items = carousel.props.data as (
      | { kind: 'trader'; trader: { username: string } }
      | { kind: 'view_more' }
    )[];
    expect(items.map((item) => item.kind)).toEqual([
      'trader',
      'trader',
      'view_more',
    ]);
    const alphaCard = within(screen.getByTestId(cardId(alpha.profileId)));
    expect(alphaCard.getByText(alpha.name)).toBeOnTheScreen();
    expect(alphaCard.getByText('+$963.1K')).toBeOnTheScreen();
    expect(
      alphaCard.getByText(strings('social_leaderboard.following')),
    ).toBeOnTheScreen();
    const betaCard = within(screen.getByTestId(cardId(beta.profileId)));
    expect(betaCard.getByText(beta.name)).toBeOnTheScreen();
    expect(betaCard.getByText('+$474.8K')).toBeOnTheScreen();
    expect(
      betaCard.getByText(strings('social_leaderboard.follow')),
    ).toBeOnTheScreen();
    // The perps-only trader never reaches the homepage (spot chains only).
    expect(screen.queryByText(gamma.name)).not.toBeOnTheScreen();
    expect(screen.getByTestId(VIEW_MORE_CARD_ID)).toBeOnTheScreen();

    await act(async () => {
      fireEvent.press(
        alphaCard.getByText(strings('social_leaderboard.following')),
      );
    });
    expect(getLeaderboardMessengerSpy()).toHaveBeenCalledWith(
      'SocialController:unfollowTrader',
      { targets: [alpha.profileId] },
    );

    await act(async () => {
      fireEvent.press(
        within(screen.getByTestId(cardId(beta.profileId))).getByText(
          strings('social_leaderboard.follow'),
        ),
      );
    });
    expect(getLeaderboardMessengerSpy()).toHaveBeenCalledWith(
      'SocialController:followTrader',
      { targets: [beta.profileId] },
    );

    fireEvent.press(screen.getByTestId(cardId(beta.profileId)));

    expect(await readRouteParams(Routes.SOCIAL.PROFILE)).toEqual({
      traderId: beta.profileId,
      traderName: beta.name,
      traderAddress: beta.addresses[0],
      traderRank: beta.rank,
      source: 'home_carousel',
    });
  });

  // -------------------------------------------------------------------------
  // Empty / disabled / error
  // -------------------------------------------------------------------------

  it('renders nothing once the leaderboard resolves with no traders', async () => {
    clearLeaderboardApiMock();
    setupLeaderboardApiMock({ spotTraders: [] });

    renderHomeTopTradersSection();

    await waitFor(() =>
      expect(getLeaderboardMessengerSpy()).toHaveBeenCalledWith(
        'SocialService:fetchLeaderboard',
        expect.anything(),
      ),
    );
    await waitFor(() =>
      expect(screen.queryByTestId(SECTION_ROOT_ID)).not.toBeOnTheScreen(),
    );
    expect(screen.queryByTestId(CAROUSEL_ID)).not.toBeOnTheScreen();
  });

  it('renders nothing and never fetches when the social leaderboard flag is off', async () => {
    renderHomeTopTradersSection([], {
      presetOptions: { featureEnabled: false },
    });

    // Give the visibility gate time to open (the enabled path fetches within
    // this window); the flag must still win.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(screen.queryByTestId(SECTION_ROOT_ID)).not.toBeOnTheScreen();
    expect(getLeaderboardMessengerSpy()).not.toHaveBeenCalledWith(
      'SocialService:fetchLeaderboard',
      expect.anything(),
    );
  });

  it('shows the section error state when the fetch fails and recovers after Try again', async () => {
    clearLeaderboardApiMock();
    setupLeaderboardApiMock({ leaderboardFailuresBeforeSuccess: 1 });

    renderHomeTopTradersSection();

    expect(
      await screen.findByText(
        strings('homepage.error.unable_to_load', {
          section: strings('homepage.sections.top_traders').toLowerCase(),
        }),
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId(CAROUSEL_ID)).not.toBeOnTheScreen();
    // The header stays interactive so the user can still open the leaderboard.
    expect(screen.getByTestId(SECTION_TITLE_ID)).toBeOnTheScreen();

    fireEvent.press(screen.getByText(strings('homepage.error.retry')));

    expect(await findAlphaCard()).toBeOnTheScreen();
    expect(
      screen.queryByText(strings('homepage.error.retry')),
    ).not.toBeOnTheScreen();
  });

  // -------------------------------------------------------------------------
  // Entry points: header / View more → Follow Trading home (A/B arms)
  // -------------------------------------------------------------------------

  it('opens the legacy leaderboard tab from the header with the homepage source when both experiments are in control', async () => {
    renderHomeTopTradersSection([
      {
        name: Routes.SOCIAL.V0,
        Component: createRouteParamsProbe(Routes.SOCIAL.V0),
      },
      { name: Routes.SOCIAL.V1 },
    ]);
    await findAlphaCard();

    fireEvent.press(screen.getByTestId(SECTION_TITLE_ID));

    expect(await readRouteParams(Routes.SOCIAL.V0)).toEqual({
      source: 'home_carousel',
      landingTab: 'leaderboard',
    });
    expect(
      screen.queryByTestId(getRouteProbeTestId(Routes.SOCIAL.V1)),
    ).not.toBeOnTheScreen();
  });

  it('lands on the Feed tab with the All audience from the View more card under the landing-feed treatment', async () => {
    renderHomeTopTradersSection(
      [
        {
          name: Routes.SOCIAL.V0,
          Component: createRouteParamsProbe(Routes.SOCIAL.V0),
        },
      ],
      {
        overrides: abTestOverrides({
          [LEADERBOARD_LANDING_FEED_AB_KEY]: 'treatment',
        }),
      },
    );
    await findAlphaCard();

    fireEvent.press(screen.getByTestId(VIEW_MORE_CARD_ID));

    expect(await readRouteParams(Routes.SOCIAL.V0)).toEqual({
      source: 'home_carousel',
      landingTab: 'feed',
      landingFeedAudience: 'all',
    });
  });

  it('opens the Social V1 shell without a landing tab when the Social V1 treatment is assigned', async () => {
    renderHomeTopTradersSection(
      [
        { name: Routes.SOCIAL.V0 },
        {
          name: Routes.SOCIAL.V1,
          Component: createRouteParamsProbe(Routes.SOCIAL.V1),
        },
      ],
      {
        overrides: abTestOverrides({
          [SOCIAL_V1_AB_KEY]: 'treatment',
          // Even with a feed landing assigned, V1 owns its own landing.
          [LEADERBOARD_LANDING_FEED_AB_KEY]: 'treatment',
        }),
      },
    );
    await findAlphaCard();

    fireEvent.press(screen.getByTestId(SECTION_TITLE_ID));

    expect(await readRouteParams(Routes.SOCIAL.V1)).toEqual({
      source: 'home_carousel',
    });
    expect(
      screen.queryByTestId(getRouteProbeTestId(Routes.SOCIAL.V0)),
    ).not.toBeOnTheScreen();
  });

  // -------------------------------------------------------------------------
  // Follow is intercepted when notifications are off
  // -------------------------------------------------------------------------

  it('routes a Follow tap to the trading signals setup when both notification channels are off', async () => {
    clearLeaderboardApiMock();
    setupLeaderboardApiMock({
      notificationPrefs: { pushEnabled: false, inAppEnabled: false },
    });
    renderHomeTopTradersSection([
      { name: Routes.SOCIAL.TRADING_SIGNALS_SETUP },
    ]);
    await findAlphaCard();

    await act(async () => {
      fireEvent.press(
        screen.getAllByText(strings('social_leaderboard.follow'))[0],
      );
    });

    expect(
      await screen.findByTestId(
        getRouteProbeTestId(Routes.SOCIAL.TRADING_SIGNALS_SETUP),
      ),
    ).toBeOnTheScreen();
    expect(getLeaderboardMessengerSpy()).not.toHaveBeenCalledWith(
      'SocialController:followTrader',
      expect.anything(),
    );
  });
});

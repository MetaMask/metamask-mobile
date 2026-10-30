/**
 * Component-view tests for Social V1 copy trade.
 *
 * Presses the live-feed Copy trade button through real Redux (eligibility,
 * compliance flag) and Engine.controllerMessenger (feed + OFAC check).
 * No hook or selector mocks.
 *
 * Run with:
 * yarn jest -c jest.config.view.js app/components/Views/SocialLeaderboard/SocialV1View/SocialV1View.view.test.tsx --runInBand --silent --coverage=false
 */
import '../../../../../tests/component-view/mocks';

import React from 'react';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import type NetInfoMock from '../../../../__mocks__/@react-native-community/netinfo';
import Engine from '../../../../core/Engine';
import Routes from '../../../../constants/navigation/Routes';
import { AccessRestrictedModalSelectorsIDs } from '../../../UI/Compliance/AccessRestrictedModal/AccessRestrictedModal.testIds';
import {
  clearLeaderboardApiMock,
  getLeaderboardMessengerSpy,
  setupLeaderboardApiMock,
} from '../../../../../tests/component-view/api-mocking/socialLeaderboard';
import {
  getRouteProbeTestId,
  renderScreenWithRoutes,
} from '../../../../../tests/component-view/render';
import { initialStateSocialLeaderboard } from '../../../../../tests/component-view/presets/socialLeaderboard';
import {
  initialStateQuickBuy,
  quickBuySellableUsdcOverrides,
} from '../../../../../tests/component-view/presets/quickBuy';
import { DEFAULT_QUICK_BUY_TARGET } from '../../../../../tests/component-view/renderers/quickBuy';
import type { DeepPartial } from '../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../reducers';
import { renderSocialV1ViewWithRoutes } from '../../../../../tests/component-view/renderers/socialLeaderboard';
import { AccessRestrictedProvider } from '../../../UI/Compliance';
import { mockPerpFeedItem } from '../../../UI/SocialFeed/mocks/coreFeed.mock';
import { getSocialFeedPositionCardCopyTradeTestId } from '../../../UI/SocialFeed/components/SocialFeedPositionCard.testIds';
import { SocialFeedPostShellSelectorsIDs } from '../../../UI/SocialFeed/components/SocialFeedPostShell.testIds';
import { TopTradersViewSelectorsIDs } from '../TopTradersView/TopTradersView.testIds';
import { QuickBuySheetSelectorsIDs } from '../../../UI/QuickBuy/QuickBuySheet.testIds';
import type { QuickBuyTarget, QuickBuyTradeMode } from '../../../UI/QuickBuy';
import { QuickBuySheetHostProvider } from '../../../UI/QuickBuy/QuickBuySheetHost';
import {
  beginPostTradeShareSession,
  clearPostTradeShareSession,
  PostTradeShareOwner,
  requestPostTradeShareReopen,
} from '../PostTradeShareBottomSheet/postTradeShareSession';
import SocialV1View from './SocialV1View';
import { SocialV1ViewSelectorsIDs } from './SocialV1View.testIds';
import {
  acceptSocialTerms,
  resetSocialTermsAcceptance,
} from '../terms/socialTermsAcceptance';

const OPEN_PERP_POSITION_ID = 'cv-open-perp';
const OPEN_PERP_TIMESTAMP = 1_700_000_000;
const OPEN_PERP_POST_ID = `${OPEN_PERP_POSITION_ID}-${OPEN_PERP_TIMESTAMP}`;

const openPerpFeedItem = mockPerpFeedItem({
  positionId: OPEN_PERP_POSITION_ID,
  tokenSymbol: 'ETH',
  isOpen: true,
  timestamp: OPEN_PERP_TIMESTAMP,
  lastTradeAt: OPEN_PERP_TIMESTAMP,
  currentValueUSD: 60000,
  realizedPnl: 0,
  trades: [
    {
      direction: 'buy',
      intent: 'enter',
      action: 'opened',
      tokenAmount: 5,
      usdCost: 50600,
      timestamp: OPEN_PERP_TIMESTAMP,
      transactionHash: '0xcv-open-perp',
      classification: 'perp',
      perpPositionType: 'long',
      perpLeverage: 8,
    },
  ],
});

const copyTradeButtonTestId =
  getSocialFeedPositionCardCopyTradeTestId(OPEN_PERP_POST_ID);

const perpsModalsRoute = {
  name: Routes.PERPS.MODALS.ROOT,
};

const eligibleOverrides = {
  engine: {
    backgroundState: {
      PerpsController: { isEligible: true },
    },
  },
};

const ineligibleOverrides = {
  engine: {
    backgroundState: {
      PerpsController: { isEligible: false },
    },
  },
};

const complianceEnabledOverrides = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          complianceEnabled: { enabled: true, minimumVersion: '0.0.1' },
        },
      },
    },
  },
};

const installComplianceController = (blocked: boolean) => {
  Object.assign(Engine.context, {
    ComplianceController: {
      checkWalletsCompliance: jest.fn().mockResolvedValue([{ blocked }]),
    },
  });
};

const netInfoMock = NetInfo as unknown as typeof NetInfoMock;

// The tab feeds only fetch online, and the NetInfo mock starts offline.
beforeEach(() => {
  netInfoMock.__setMockNetInfo({ type: 'wifi', isInternetReachable: true });
});

afterEach(() => {
  netInfoMock.__resetMockNetInfo();
});

const findTrendingCopyTradeButton = () =>
  within(
    screen.getByTestId(SocialV1ViewSelectorsIDs.TRENDING_PAGE),
  ).findByTestId(copyTradeButtonTestId);

const pressCopyTrade = async () => {
  fireEvent.press(await findTrendingCopyTradeButton());
};

beforeEach(async () => {
  await acceptSocialTerms();
});

afterEach(async () => {
  await resetSocialTermsAcceptance();
});

describe('SocialV1View copy trade', () => {
  beforeEach(() => {
    setupLeaderboardApiMock({ feedItems: [openPerpFeedItem] });
    installComplianceController(false);
  });

  afterEach(() => {
    clearLeaderboardApiMock();
  });

  it('opens the perps order redirect over the feed when the trader is eligible', async () => {
    renderSocialV1ViewWithRoutes([perpsModalsRoute], {
      overrides: eligibleOverrides,
    });

    await pressCopyTrade();

    expect(
      await screen.findByTestId(getRouteProbeTestId(Routes.PERPS.MODALS.ROOT)),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(SocialV1ViewSelectorsIDs.COPY_TRADE_GEO_BLOCK),
    ).toBeNull();
    expect(
      screen.queryByTestId(AccessRestrictedModalSelectorsIDs.BOTTOM_SHEET),
    ).toBeNull();
  });

  it('shows the geo block and stays on the feed when the trader is ineligible', async () => {
    renderSocialV1ViewWithRoutes([perpsModalsRoute], {
      overrides: ineligibleOverrides,
    });

    await pressCopyTrade();

    expect(
      await screen.findByTestId(SocialV1ViewSelectorsIDs.COPY_TRADE_GEO_BLOCK),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(getRouteProbeTestId(Routes.PERPS.MODALS.ROOT)),
    ).toBeNull();
  });

  it('shows the access-restricted modal and stays on the feed when compliance blocks the wallet', async () => {
    installComplianceController(true);
    renderSocialV1ViewWithRoutes([perpsModalsRoute], {
      overrides: {
        ...eligibleOverrides,
        ...complianceEnabledOverrides,
      },
    });

    await pressCopyTrade();

    expect(
      await screen.findByTestId(AccessRestrictedModalSelectorsIDs.BOTTOM_SHEET),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(getRouteProbeTestId(Routes.PERPS.MODALS.ROOT)),
    ).toBeNull();
    expect(
      screen.queryByTestId(SocialV1ViewSelectorsIDs.COPY_TRADE_GEO_BLOCK),
    ).toBeNull();
    expect(
      Engine.context.ComplianceController.checkWalletsCompliance,
    ).toHaveBeenCalled();
  });

  it('shows the open perp copy-trade card after the feed loads', async () => {
    renderSocialV1ViewWithRoutes([perpsModalsRoute], {
      overrides: eligibleOverrides,
    });

    const trendingPage = within(
      screen.getByTestId(SocialV1ViewSelectorsIDs.TRENDING_PAGE),
    );
    const card = await trendingPage.findByTestId(
      `${SocialFeedPostShellSelectorsIDs.CONTAINER}-${OPEN_PERP_POST_ID}`,
    );
    const cardScope = within(card);

    expect(cardScope.getByTestId(copyTradeButtonTestId)).toBeOnTheScreen();
    expect(cardScope.getByText(/ETH/)).toBeOnTheScreen();
    expect(
      screen.queryByTestId(getRouteProbeTestId(Routes.PERPS.MODALS.ROOT)),
    ).toBeNull();
  });
});

describe('SocialV1View terms gate', () => {
  beforeEach(async () => {
    await resetSocialTermsAcceptance();
    setupLeaderboardApiMock({ feedItems: [openPerpFeedItem] });
    installComplianceController(false);
  });

  afterEach(() => {
    clearLeaderboardApiMock();
  });

  it('opens profile onboarding instead of copy trade when terms are not accepted', async () => {
    renderSocialV1ViewWithRoutes(
      [perpsModalsRoute, { name: Routes.SOCIAL.PROFILE_ONBOARDING }],
      { overrides: eligibleOverrides },
    );

    await pressCopyTrade();

    expect(
      await screen.findByTestId(
        getRouteProbeTestId(Routes.SOCIAL.PROFILE_ONBOARDING),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(getRouteProbeTestId(Routes.PERPS.MODALS.ROOT)),
    ).toBeNull();
  });
});

describe('SocialV1View initial tab', () => {
  const feedPostTestId = `${SocialFeedPostShellSelectorsIDs.CONTAINER}-${OPEN_PERP_POST_ID}`;
  const getCalledActions = () =>
    getLeaderboardMessengerSpy().mock.calls.map(([action]) => action);

  const SocialV1ViewWithAccessRestricted = () => (
    <AccessRestrictedProvider>
      <SocialV1View />
    </AccessRestrictedProvider>
  );

  const renderWithInitialTab = (initialTab: string) =>
    renderScreenWithRoutes(
      SocialV1ViewWithAccessRestricted,
      { name: Routes.SOCIAL.V1 },
      [],
      { state: initialStateSocialLeaderboard().build() },
      { initialTab },
    );

  beforeEach(() => {
    setupLeaderboardApiMock({ feedItems: [openPerpFeedItem] });
  });

  afterEach(() => {
    clearLeaderboardApiMock();
  });

  it('opens on Leaderboard instead of Trending when the initial tab is leaderboard', async () => {
    renderWithInitialTab('leaderboard');

    expect(
      await screen.findByTestId(TopTradersViewSelectorsIDs.TRADER_LIST),
    ).toBeOnTheScreen();
    await waitFor(() =>
      expect(getCalledActions()).toContain('SocialService:fetchFeed'),
    );
    const trendingPage = within(
      screen.getByTestId(SocialV1ViewSelectorsIDs.TRENDING_PAGE),
    );
    expect(trendingPage.queryByTestId(feedPostTestId)).not.toBeOnTheScreen();
  });

  it('opens on Trending when the initial tab is not a Social V1 tab', async () => {
    renderWithInitialTab('feed');

    const trendingPage = within(
      screen.getByTestId(SocialV1ViewSelectorsIDs.TRENDING_PAGE),
    );
    expect(await trendingPage.findByTestId(feedPostTestId)).toBeOnTheScreen();
    expect(
      screen.queryByTestId(TopTradersViewSelectorsIDs.TRADER_LIST),
    ).not.toBeOnTheScreen();
  });

  it('switches to Leaderboard when the mounted view is re-entered with that initial tab', async () => {
    const returnToSocialTestId = 'return-to-social-on-leaderboard';
    const ReturnToSocialOnLeaderboard = () => {
      const navigation = useNavigation();
      return (
        <Pressable
          testID={returnToSocialTestId}
          onPress={() =>
            navigation.navigate(
              Routes.SOCIAL.V1,
              { initialTab: 'leaderboard' },
              { pop: true },
            )
          }
        />
      );
    };
    renderScreenWithRoutes(
      SocialV1ViewWithAccessRestricted,
      { name: Routes.SOCIAL.V1 },
      [
        {
          name: Routes.SOCIAL.MY_PROFILE,
          Component: ReturnToSocialOnLeaderboard,
        },
      ],
      { state: initialStateSocialLeaderboard().build() },
    );
    const trendingPage = within(
      screen.getByTestId(SocialV1ViewSelectorsIDs.TRENDING_PAGE),
    );
    expect(await trendingPage.findByTestId(feedPostTestId)).toBeOnTheScreen();
    expect(
      screen.queryByTestId(TopTradersViewSelectorsIDs.TRADER_LIST),
    ).not.toBeOnTheScreen();

    fireEvent.press(screen.getByTestId(SocialV1ViewSelectorsIDs.AVATAR_BUTTON));
    fireEvent.press(await screen.findByTestId(returnToSocialTestId));

    expect(
      await screen.findByTestId(TopTradersViewSelectorsIDs.TRADER_LIST),
    ).toBeOnTheScreen();
  });
});

describe('SocialV1View post-trade Quick Buy reopen', () => {
  const target: QuickBuyTarget = {
    tokenAddress: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
    tokenSymbol: 'AAVE',
    tokenName: 'Aave',
    chain: 'eip155:1',
  };

  const requestFeedQuickBuyReopen = (
    reopenTarget: QuickBuyTarget = target,
    tradeMode: QuickBuyTradeMode = 'buy',
  ) =>
    act(() => {
      beginPostTradeShareSession({
        owner: PostTradeShareOwner.socialV1Feed,
        status: 'failed',
        target: reopenTarget,
        tradeMode,
        preview: {
          tokenSymbol: reopenTarget.tokenSymbol,
          tokenAddress: reopenTarget.tokenAddress,
          chain: 'ethereum',
          side: tradeMode,
        },
      });
      requestPostTradeShareReopen();
    });

  // Quick Buy needs the bridge state its own CV suite uses on top of the feed preset.
  const quickBuyOverrides = (extraOverrides: DeepPartial<RootState> = {}) =>
    initialStateQuickBuy()
      .withOverrides(eligibleOverrides)
      .withOverrides(extraOverrides)
      .build();

  const renderFeedWithQuickBuyState = (
    extraOverrides?: DeepPartial<RootState>,
  ) =>
    renderSocialV1ViewWithRoutes([perpsModalsRoute], {
      overrides: quickBuyOverrides(extraOverrides),
    });

  const SocialV1ViewInHomeTabsHost = () => (
    <QuickBuySheetHostProvider>
      <AccessRestrictedProvider>
        <SocialV1View />
      </AccessRestrictedProvider>
    </QuickBuySheetHostProvider>
  );

  const queryQuickBuySheet = (
    scope: Pick<typeof screen, 'queryByTestId'> = screen,
  ) =>
    scope.queryByTestId(QuickBuySheetSelectorsIDs.CONTENT_LOADING, {
      includeHiddenElements: true,
    }) ??
    scope.queryByTestId(QuickBuySheetSelectorsIDs.CONTENT_CONTAINER, {
      includeHiddenElements: true,
    });

  beforeEach(() => {
    setupLeaderboardApiMock({ feedItems: [openPerpFeedItem] });
    installComplianceController(false);
  });

  afterEach(() => {
    clearLeaderboardApiMock();
    act(() => clearPostTradeShareSession());
  });

  it('reopens Quick Buy over the feed when a failed post-trade share retries', async () => {
    renderFeedWithQuickBuyState();
    await findTrendingCopyTradeButton();

    requestFeedQuickBuyReopen();

    await waitFor(() => expect(queryQuickBuySheet()).toBeOnTheScreen());
  });

  it('ignores the retry while another screen covers the feed', async () => {
    renderFeedWithQuickBuyState();
    await pressCopyTrade();
    await screen.findByTestId(getRouteProbeTestId(Routes.PERPS.MODALS.ROOT));

    requestFeedQuickBuyReopen();

    expect(queryQuickBuySheet()).toBeNull();
  });

  it('reopens Quick Buy in sell mode when the failed trade was a sell', async () => {
    renderFeedWithQuickBuyState(quickBuySellableUsdcOverrides());
    await findTrendingCopyTradeButton();

    requestFeedQuickBuyReopen(DEFAULT_QUICK_BUY_TARGET, 'sell');

    expect(await screen.findByText('Sell USDC')).toBeOnTheScreen();
  });

  it('renders the sheet in the home tabs host instead of inside the feed', async () => {
    renderScreenWithRoutes(
      SocialV1ViewInHomeTabsHost,
      { name: Routes.SOCIAL.V1 },
      [],
      {
        state: initialStateSocialLeaderboard()
          .withOverrides(quickBuyOverrides())
          .build(),
      },
    );
    await findTrendingCopyTradeButton();

    requestFeedQuickBuyReopen();

    await waitFor(() => expect(queryQuickBuySheet()).toBeOnTheScreen());
    expect(
      queryQuickBuySheet(
        within(screen.getByTestId(SocialV1ViewSelectorsIDs.CONTAINER)),
      ),
    ).toBeNull();
  });
});

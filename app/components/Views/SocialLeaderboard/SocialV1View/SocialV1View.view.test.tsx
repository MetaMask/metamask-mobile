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
import {
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
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
import { renderSocialV1ViewWithRoutes } from '../../../../../tests/component-view/renderers/socialLeaderboard';
import { AccessRestrictedProvider } from '../../../UI/Compliance';
import { mockPerpFeedItem } from '../../../UI/SocialFeed/mocks/coreFeed.mock';
import { getSocialFeedPositionCardCopyTradeTestId } from '../../../UI/SocialFeed/components/SocialFeedPositionCard.testIds';
import { SocialFeedPostShellSelectorsIDs } from '../../../UI/SocialFeed/components/SocialFeedPostShell.testIds';
import { TopTradersViewSelectorsIDs } from '../TopTradersView/TopTradersView.testIds';
import SocialV1View from './SocialV1View';
import { SocialV1ViewSelectorsIDs } from './SocialV1View.testIds';

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

const pressCopyTrade = async () => {
  const button = await screen.findByTestId(copyTradeButtonTestId);
  fireEvent.press(button);
};

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

    const card = await screen.findByTestId(
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
    expect(screen.queryByTestId(feedPostTestId)).not.toBeOnTheScreen();
  });

  it('opens on Trending when the initial tab is not a Social V1 tab', async () => {
    renderWithInitialTab('feed');

    expect(await screen.findByTestId(feedPostTestId)).toBeOnTheScreen();
    expect(
      screen.queryByTestId(TopTradersViewSelectorsIDs.TRADER_LIST),
    ).not.toBeOnTheScreen();
  });
});

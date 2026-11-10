import '../../../../../../tests/component-view/mocks';

import React, { useEffect, type ComponentType } from 'react';
import { Text } from 'react-native';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { Position } from '@metamask/perps-controller';
import type {
  Position as SocialPosition,
  SwapCommentResponse,
} from '@metamask/social-controllers';
import {
  defaultPositionForViews,
  renderPerpsView,
} from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import { getRouteProbeTestId } from '../../../../../../tests/component-view/render';
import {
  clearLeaderboardApiMock,
  setupLeaderboardApiMock,
} from '../../../../../../tests/component-view/api-mocking/socialLeaderboard';
import { PerpsSharePositionSheetSelectorsIDs } from '../../Perps.testIds';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import Routes from '../../../../../constants/navigation/Routes';
import type { RootState } from '../../../../../reducers';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { analytics } from '../../../../../util/analytics/analytics';
import { strings } from '../../../../../../locales/i18n';
import {
  SOCIAL_V1_AB_KEY,
  SocialV1Variant,
} from '../../../../Views/SocialLeaderboard/SocialV1View/abTestConfig';
import {
  SocialPostComposerView,
  SocialPostComposerViewSelectorsIDs,
} from '../../../../Views/SocialLeaderboard/SocialPostComposerView';
import PerpsSharePositionView from './PerpsSharePositionView';
import { PERPS_SHARE_POSITION_INTERACTION_TYPE } from './PerpsSharePositionView.constants';

const LINKED_ADDRESS = '0x0000000000000000000000000000000000000001';
const MARKET_PRICE = '2900';

const socialEthLong: SocialPosition = {
  positionId: 'social-eth-long',
  tokenSymbol: 'ETH',
  tokenName: 'Ethereum',
  tokenAddress: 'ETH',
  chain: 'hyperliquid',
  positionAmount: 2.5,
  isOpen: true,
  boughtUsd: 5000,
  soldUsd: 0,
  realizedPnl: 0,
  costBasis: 500,
  trades: [],
  lastTradeAt: 1_700_000_000,
  currentValueUSD: 5100,
  pnlValueUsd: 100,
  pnlPercent: 20,
  perpPositionType: 'long',
  perpLeverage: 10,
  positionAmountWithLeverage: 2.5,
};

const profileOverrides: DeepPartial<RootState> = {
  engine: {
    backgroundState: {
      KeyringController: { isUnlocked: true },
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          perpsSocialEnabled: {
            enabled: true,
            minimumVersion: '0.0.0',
          },
          [SOCIAL_V1_AB_KEY]: SocialV1Variant.Treatment,
          aiSocialLeaderboardEnabled: {
            enabled: true,
            minimumVersion: '0.0.0',
          },
        },
      },
      ProfileController: {
        profile: {
          profileId: 'profile-1',
          username: 'trader',
          displayName: 'trader',
          bio: '',
          linkedAddresses: [`eip155:1:${LINKED_ADDRESS}`],
          avatarUrl: '',
          tradingPrivacy: 'public',
          connectedToX: false,
          createdAt: '',
          updatedAt: '',
        },
      },
    },
  },
};

const routeParamsByName: Record<string, unknown> = {};

const createParamsProbe = (routeName: string): ComponentType<unknown> => {
  const ParamsProbe = () => {
    const { params } = useRoute();
    useEffect(() => {
      routeParamsByName[routeName] = params;
    }, [params]);
    return <Text testID={getRouteProbeTestId(routeName)}>{routeName}</Text>;
  };
  return ParamsProbe as ComponentType<unknown>;
};

const PERPS_POSITION_HOST = 'PerpsPositionHost';

const ModalStack = createNativeStackNavigator();

const ShareModalStack = () => (
  <ModalStack.Navigator>
    <ModalStack.Screen
      name={Routes.PERPS.MODALS.SHARE_POSITION}
      component={PerpsSharePositionView as unknown as ComponentType<unknown>}
    />
  </ModalStack.Navigator>
);

const RootLauncher = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  useEffect(() => {
    navigation.navigate(Routes.PERPS.ROOT, { screen: PERPS_POSITION_HOST });
  }, [navigation]);
  return null;
};

const createPositionHost = (
  position: Position,
  accountAddress: string,
): ComponentType<unknown> => {
  const PositionHost = () => {
    const navigation = useNavigation<NavigationProp<ParamListBase>>();
    useEffect(() => {
      navigation.navigate(Routes.PERPS.MODALS.ROOT, {
        screen: Routes.PERPS.MODALS.SHARE_POSITION,
        params: {
          position,
          marketPrice: MARKET_PRICE,
          accountAddress,
          socialPosition: socialEthLong,
        },
      });
    }, [navigation]);
    return (
      <Text testID={getRouteProbeTestId(PERPS_POSITION_HOST)}>
        {PERPS_POSITION_HOST}
      </Text>
    );
  };
  return PositionHost as ComponentType<unknown>;
};

const renderSharePositionSheet = ({
  position = defaultPositionForViews,
  accountAddress = LINKED_ADDRESS,
  withRealComposer = false,
}: {
  position?: Position;
  accountAddress?: string;
  withRealComposer?: boolean;
} = {}) =>
  renderPerpsView(RootLauncher, 'ShareLauncher', {
    overrides: profileOverrides,
    extraRoutes: [
      {
        name: PERPS_POSITION_HOST,
        Component: createPositionHost(position, accountAddress),
        mount: 'perps-root',
      },
      {
        name: Routes.PERPS.MODALS.ROOT,
        Component: ShareModalStack as ComponentType<unknown>,
        mount: 'perps-root',
      },
      {
        name: Routes.PERPS.PNL_HERO_CARD,
        Component: createParamsProbe(Routes.PERPS.PNL_HERO_CARD),
        mount: 'perps-root',
      },
      {
        name: Routes.SOCIAL.POST_COMPOSER,
        Component: withRealComposer
          ? (SocialPostComposerView as unknown as ComponentType<unknown>)
          : createParamsProbe(Routes.SOCIAL.POST_COMPOSER),
      },
      {
        name: Routes.SOCIAL.V1,
        Component: createParamsProbe(Routes.SOCIAL.V1),
      },
    ],
  });

describe('PerpsSharePositionView', () => {
  afterEach(() => {
    clearLeaderboardApiMock();
    Object.keys(routeParamsByName).forEach(
      (routeName) => delete routeParamsByName[routeName],
    );
  });

  it('renders both share options and enables Post to MetaMask once the position is indexed', async () => {
    setupLeaderboardApiMock({ openPositions: [socialEthLong] });

    renderSharePositionSheet();

    expect(
      await screen.findByText(strings('perps.share_position.title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.share_position.post_to_metamask')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.share_position.new_badge')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        strings('perps.share_position.post_to_metamask_description'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.share_position.share_externally')),
    ).toBeOnTheScreen();
    await waitFor(() =>
      expect(
        screen.getByTestId(
          PerpsSharePositionSheetSelectorsIDs.POST_TO_METAMASK,
        ),
      ).toBeEnabled(),
    );
  });

  it('opens the composer with the matching Social position and the Trending redirect', async () => {
    setupLeaderboardApiMock({ openPositions: [socialEthLong] });
    renderSharePositionSheet();
    fireEvent.press(
      await screen.findByTestId(
        PerpsSharePositionSheetSelectorsIDs.POST_TO_METAMASK,
      ),
    );

    expect(
      await screen.findByTestId(
        getRouteProbeTestId(Routes.SOCIAL.POST_COMPOSER),
      ),
    ).toBeOnTheScreen();
    expect(routeParamsByName[Routes.SOCIAL.POST_COMPOSER]).toEqual({
      position: socialEthLong,
      entryPoint: 'perps',
      openFeedAfterPost: true,
    });
    await waitFor(() =>
      expect(
        screen.queryByTestId(PerpsSharePositionSheetSelectorsIDs.SHEET),
      ).not.toBeOnTheScreen(),
    );
  });

  it('does not render a disabled Post to MetaMask state', async () => {
    setupLeaderboardApiMock({ openPositions: [socialEthLong] });
    renderSharePositionSheet();

    expect(
      await screen.findByText(strings('perps.share_position.post_to_metamask')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        strings('perps.share_position.post_to_metamask_description'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText("This position isn't ready to post yet"),
    ).toBeNull();
    expect(
      screen.queryByText(
        "Only positions from your profile's wallet can be posted",
      ),
    ).toBeNull();
    expect(
      screen.getByTestId(PerpsSharePositionSheetSelectorsIDs.POST_TO_METAMASK),
    ).toBeEnabled();
    expect(
      screen.getByTestId(PerpsSharePositionSheetSelectorsIDs.SHARE_EXTERNALLY),
    ).toBeEnabled();
  });

  it('posts through the composer and lands on the Social feed', async () => {
    const swapComment: SwapCommentResponse = {
      uid: 'comment-1',
      transactionHash: '0xabc',
      chain: 'hyperliquid',
      tokenAddress: 'ETH',
      commentText: '',
      author: { id: 'profile-1', name: 'trader' },
      timestamp: 1_700_000_100,
      isAppUserComment: true,
      metrics: { reactions: [], userReaction: null },
    };
    const messengerSpy = setupLeaderboardApiMock({
      openPositions: [socialEthLong],
      swapComment,
    });
    renderSharePositionSheet({ withRealComposer: true });
    fireEvent.press(
      await screen.findByTestId(
        PerpsSharePositionSheetSelectorsIDs.POST_TO_METAMASK,
      ),
    );
    fireEvent.changeText(
      await screen.findByTestId(SocialPostComposerViewSelectorsIDs.INPUT),
      'Long ETH into the weekend',
    );
    fireEvent.press(
      await screen.findByTestId(SocialPostComposerViewSelectorsIDs.POST_BUTTON),
    );

    expect(
      await screen.findByTestId(getRouteProbeTestId(Routes.SOCIAL.V1)),
    ).toBeOnTheScreen();
    expect(messengerSpy).toHaveBeenCalledWith(
      'SocialService:createSwapComment',
      expect.objectContaining({ positionUid: socialEthLong.positionId }),
    );
    expect(
      screen.queryByTestId(SocialPostComposerViewSelectorsIDs.POST_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('opens the PnL hero card from Share externally', async () => {
    setupLeaderboardApiMock({ openPositions: [socialEthLong] });
    renderSharePositionSheet();

    fireEvent.press(
      await screen.findByTestId(
        PerpsSharePositionSheetSelectorsIDs.SHARE_EXTERNALLY,
      ),
    );

    expect(
      await screen.findByTestId(
        getRouteProbeTestId(Routes.PERPS.PNL_HERO_CARD),
      ),
    ).toBeOnTheScreen();
    expect(routeParamsByName[Routes.PERPS.PNL_HERO_CARD]).toEqual({
      position: defaultPositionForViews,
      marketPrice: MARKET_PRICE,
    });
    expect(
      screen.queryByTestId(PerpsSharePositionSheetSelectorsIDs.SHEET),
    ).not.toBeOnTheScreen();
  });

  it.each([
    [
      'Post to MetaMask',
      PerpsSharePositionSheetSelectorsIDs.POST_TO_METAMASK,
      Routes.SOCIAL.POST_COMPOSER,
      PERPS_SHARE_POSITION_INTERACTION_TYPE.POST_TO_METAMASK,
    ],
    [
      'Share externally',
      PerpsSharePositionSheetSelectorsIDs.SHARE_EXTERNALLY,
      Routes.PERPS.PNL_HERO_CARD,
      PERPS_SHARE_POSITION_INTERACTION_TYPE.SHARE_EXTERNALLY,
    ],
  ])(
    'acts on only the first tap when %s is tapped twice',
    async (_, rowTestId, destinationRoute, interactionType) => {
      const trackEvent = jest.spyOn(analytics, 'trackEvent');
      try {
        setupLeaderboardApiMock({ openPositions: [socialEthLong] });
        renderSharePositionSheet();
        const row = await screen.findByTestId(rowTestId);

        act(() => {
          fireEvent.press(row);
          fireEvent.press(row);
        });

        expect(
          await screen.findAllByTestId(getRouteProbeTestId(destinationRoute)),
        ).toHaveLength(1);
        expect(
          trackEvent.mock.calls.filter(
            ([event]) => event.properties?.interaction_type === interactionType,
          ),
        ).toHaveLength(1);
      } finally {
        trackEvent.mockRestore();
      }
    },
  );

  it('tracks the sheet display and the selected option', async () => {
    const trackEvent = jest.spyOn(analytics, 'trackEvent');
    try {
      setupLeaderboardApiMock({ openPositions: [socialEthLong] });
      renderSharePositionSheet();
      const expectInteraction = (interactionType: string) =>
        expect(trackEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            name: MetaMetricsEvents.PERPS_UI_INTERACTION.category,
            properties: expect.objectContaining({
              interaction_type: interactionType,
              asset: 'ETH',
              direction: 'long',
            }),
          }),
        );

      await waitFor(() =>
        expectInteraction(
          PERPS_SHARE_POSITION_INTERACTION_TYPE.SHEET_DISPLAYED,
        ),
      );

      fireEvent.press(
        screen.getByTestId(
          PerpsSharePositionSheetSelectorsIDs.SHARE_EXTERNALLY,
        ),
      );

      await waitFor(() =>
        expectInteraction(
          PERPS_SHARE_POSITION_INTERACTION_TYPE.SHARE_EXTERNALLY,
        ),
      );
    } finally {
      trackEvent.mockRestore();
    }
  });
});

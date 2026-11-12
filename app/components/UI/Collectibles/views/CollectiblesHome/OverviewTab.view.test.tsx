import { PACK_PARTNER_ENVIRONMENT } from '../../providers/pack-partner/constants';
import '../../../../../../tests/component-view/mocks';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import { State, type PanGesture } from 'react-native-gesture-handler';
import {
  fireGestureHandler,
  getByGestureTestId,
} from 'react-native-gesture-handler/jest-utils';
import {
  AccessibilityInfo,
  AppState,
  DeviceEventEmitter,
  Dimensions,
} from 'react-native';
import { getTotalMemorySync } from 'react-native-device-info';
import { __setMockNetInfo } from '../../../../../__mocks__/@react-native-community/netinfo';
import { createDeferredPromise } from '@metamask/utils';
import { strings } from '../../../../../../locales/i18n';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import {
  createRouteParamsProbe,
  createComponentViewQueryClient,
  getRouteParamsProbeTestId,
} from '../../../../../../tests/component-view/render';
import { renderCollectiblesView } from '../../../../../../tests/component-view/renderers/collectibles';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import {
  CollectiblesHomeTestIds,
  CollectiblesPurchaseSheetTestIds,
  CollectiblesCarouselTestIds,
  CollectiblesPackSocialTestIds,
} from '../../Collectibles.testIds';
import type { CollectiblesOpening } from '../../types';
import {
  setCollectiblesFixtureClients,
  packPartnerReads,
  createCard,
  createPack,
  serveRecentOpenings,
} from '../testUtils';
import { MockCollectiblesApiClient } from '../../services/clients/MockCollectiblesApiClient';
import { MockCollectiblesSocialApiClient } from '../../services/clients/MockCollectiblesSocialApiClient';
import { formatUsd } from '../../providers/pack-partner/utils/format';

let feedQueries: ReturnType<typeof createComponentViewQueryClient>;
const feedQuery = () =>
  feedQueries.getQueryCache().find({
    queryKey: [
      'PackPartnerDataService:getRecentOpenings',
      PACK_PARTNER_ENVIRONMENT,
      { count: 20 },
    ],
  });
const PACK = createPack({ code: 'pokemon_25', price: 25 });
/** Popular polls the public openings feed for every pack. */
const ALL_PACKS = '';
const controller = {
  generatePack: jest.fn(),
};

/**
 * Public opening fixture.
 *
 * @param mint - Card mint, also used in the opening id.
 * @param overrides - Opening fields.
 * @returns The opening.
 */
const createOpening = (
  mint: string,
  overrides: Partial<CollectiblesOpening> = {},
): CollectiblesOpening => ({
  ...createCard({ mint, name: `Card ${mint}` }),
  id: `opening-${mint}`,
  openedAt: 1_000,
  ...overrides,
});

const renderOverview = () => {
  const rendered = renderCollectiblesView({
    queryClient: feedQueries,
    routes: [
      {
        name: Routes.COLLECTIBLES.PACK,
        Component: createRouteParamsProbe(Routes.COLLECTIBLES.PACK),
      },
      {
        name: Routes.COLLECTIBLES.EXPLORE,
        Component: createRouteParamsProbe(Routes.COLLECTIBLES.EXPLORE),
      },
    ],
  });
  fireEvent(
    screen.getByTestId(CollectiblesHomeTestIds.OVERVIEW),
    'viewableItemsChanged',
    { viewableItems: [{ item: 'hero' }, { item: 'openings' }] },
  );
  return rendered;
};

describeForPlatforms('Collectibles Popular discovery', () => {
  afterEach(() => feedQueries.clear());
  beforeEach(() => {
    feedQueries = createComponentViewQueryClient();
    Object.values(controller).forEach((method) => {
      if (jest.isMockFunction(method)) method.mockReset();
    });
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      value: 'active',
    });
    packPartnerReads.getPacks.mockResolvedValue([PACK]);
    Object.assign(Engine.context, { CollectiblesController: controller });
  });

  it('opens the selected live pack detail without authorizing a purchase', async () => {
    renderOverview();
    fireEvent.press(
      await screen.findByTestId(`collectibles-hero-pack-${PACK.code}`),
    );
    expect(
      await screen.findByTestId(
        getRouteParamsProbeTestId(Routes.COLLECTIBLES.PACK),
      ),
    ).toHaveTextContent(JSON.stringify({ packCode: PACK.code }));
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  it('opens purchase review from the carousel without submitting a purchase', async () => {
    renderOverview();
    fireEvent.press(await screen.findByTestId('collectibles-popular-buy'));
    expect(
      await screen.findByTestId(CollectiblesPurchaseSheetTestIds.SHEET),
    ).toBeOnTheScreen();
    expect(controller.generatePack).not.toHaveBeenCalled();
    fireEvent.press(
      screen.getByTestId(CollectiblesPurchaseSheetTestIds.CLOSE_BUTTON),
    );
    expect(
      screen.queryByTestId(CollectiblesPurchaseSheetTestIds.SHEET),
    ).not.toBeOnTheScreen();
  });

  it('keeps the transparent pack halo inside the scrolling carousel and protects the header', async () => {
    renderOverview();
    await screen.findByTestId('collectibles-popular-buy');
    const material = screen.getByTestId('collectibles-popular-header-material');
    const overview = screen.getByTestId(CollectiblesHomeTestIds.OVERVIEW);
    const carousel = screen.getByTestId(CollectiblesCarouselTestIds.CONTAINER);
    // The visual is inside the scrollable hero cell, not a translated page overlay.
    expect(
      within(carousel).getByTestId(CollectiblesCarouselTestIds.GALAXY, {
        includeHiddenElements: true,
      }),
    ).toBeOnTheScreen();
    expect(carousel).toHaveStyle({ overflow: 'hidden' });
    expect(
      within(carousel).getByTestId(CollectiblesCarouselTestIds.GALAXY, {
        includeHiddenElements: true,
      }).props.style,
    ).not.toEqual(
      expect.objectContaining({ backgroundColor: expect.any(String) }),
    );
    expect(material).toHaveStyle({ opacity: 0 });

    fireEvent.scroll(overview, {
      nativeEvent: { contentOffset: { x: 0, y: 100 } },
    });

    expect(material).toHaveStyle({ opacity: 1 });
    expect(
      screen.getByTestId(CollectiblesHomeTestIds.BACK_BUTTON),
    ).toBeOnTheScreen();
    fireEvent.scroll(overview, {
      nativeEvent: { contentOffset: { x: 0, y: 0 } },
    });
    expect(material).toHaveStyle({ opacity: 0 });
  });

  it('keeps the activity rows reserved through loading and selecting a pack without metadata', async () => {
    const nextPack = createPack({ code: 'pokemon_50', price: 50 });
    const packType = `pack_partner:${PACK.code}`;
    const clients = {
      collectiblesApi: new MockCollectiblesApiClient(),
      socialApi: new MockCollectiblesSocialApiClient(),
    };
    const context = await clients.socialApi.getPackSocialContext({
      packTypes: [packType],
    });
    const insights = await clients.collectiblesApi.getPackInsights({
      packTypes: [packType],
    });
    const socialPending = createDeferredPromise<typeof context>();
    const insightsPending = createDeferredPromise<typeof insights>();
    jest
      .spyOn(clients.socialApi, 'getPackSocialContext')
      .mockReturnValue(socialPending.promise);
    jest
      .spyOn(clients.collectiblesApi, 'getPackInsights')
      .mockReturnValue(insightsPending.promise);
    const reduceMotion = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);
    packPartnerReads.getPacks.mockResolvedValue([PACK, nextPack]);
    setCollectiblesFixtureClients(clients);
    Object.assign(Engine.context, {
      CollectiblesController: {
        ...controller,
      },
    });

    try {
      renderOverview();
      const hero = within(
        await screen.findByTestId(CollectiblesCarouselTestIds.CONTAINER),
      );
      const reservedRows = () => {
        expect(
          hero.getByTestId(CollectiblesPackSocialTestIds.PEOPLE),
        ).toHaveStyle({ minHeight: 24 });
      };
      expect(
        hero.getByTestId(CollectiblesPackSocialTestIds.PEOPLE_LOADING),
      ).toBeOnTheScreen();
      expect(
        hero.queryByTestId(CollectiblesPackSocialTestIds.EPIC_LOADING),
      ).not.toBeOnTheScreen();

      await act(async () => {
        insightsPending.resolve({ [packType]: insights[packType] });
        socialPending.resolve({ [packType]: context[packType] });
      });

      expect(
        await hero.findByText(
          strings('collectibles_discovery.opened_by', {
            name: context[packType].friends[0].displayName,
            count: context[packType].friendOpenings,
          }),
        ),
      ).toBeOnTheScreen();
      reservedRows();

      fireEvent.press(
        hero.getByTestId(CollectiblesCarouselTestIds.PACK(nextPack.code)),
      );

      await waitFor(() =>
        expect(
          hero.getByTestId(CollectiblesCarouselTestIds.BUY),
        ).toHaveTextContent(
          strings('collectibles_discovery.open_for', {
            amount: formatUsd(nextPack.price),
          }),
        ),
      );
      reservedRows();
      expect(
        hero.queryByText(
          strings('collectibles_discovery.friend_pulled_epic', {
            name: context[packType].lastFriendEpic?.actor.displayName,
          }),
        ),
      ).not.toBeOnTheScreen();
      expect(controller.generatePack).not.toHaveBeenCalled();
    } finally {
      // This native API is already a framework mock; mockRestore would erase
      // its promise implementation for the remaining platform scenarios.
      reduceMotion.mockResolvedValue(false);
    }
  });

  it('changes the pack on a horizontal pan without treating its release as a tap', async () => {
    const nextPack = createPack({ code: 'pokemon_50', price: 50 });
    packPartnerReads.getPacks.mockResolvedValue([PACK, nextPack]);
    renderOverview();
    await screen.findByTestId(CollectiblesCarouselTestIds.BUY);

    act(() => {
      fireGestureHandler<PanGesture>(
        getByGestureTestId(CollectiblesCarouselTestIds.PAN),
        [
          { state: State.BEGAN, translationX: 0, translationY: 0 },
          { state: State.ACTIVE, translationX: -12, translationY: 2 },
          {
            state: State.ACTIVE,
            translationX: -Dimensions.get('window').width * 0.62,
            translationY: 35,
          },
          {
            state: State.END,
            translationX: -Dimensions.get('window').width * 0.62,
            translationY: 35,
            velocityX: 0,
          },
        ],
      );
    });

    await waitFor(() =>
      expect(
        screen.getByTestId(CollectiblesCarouselTestIds.BUY),
      ).toHaveTextContent(
        strings('collectibles_discovery.open_for', {
          amount: formatUsd(nextPack.price),
        }),
      ),
    );
    fireEvent.press(
      screen.getByTestId(CollectiblesCarouselTestIds.PACK(nextPack.code)),
    );
    expect(
      screen.queryByTestId(getRouteParamsProbeTestId(Routes.COLLECTIBLES.PACK)),
    ).not.toBeOnTheScreen();
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  it('keeps the pack selected when a vertical gesture fails the horizontal recognizer', async () => {
    packPartnerReads.getPacks.mockResolvedValue([
      PACK,
      createPack({ code: 'pokemon_50', price: 50 }),
    ]);
    renderOverview();
    await screen.findByTestId(CollectiblesCarouselTestIds.BUY);

    act(() => {
      // RNGH's Jest helper inserts an ACTIVE state even for BEGAN → FAILED.
      // Emit the native failure directly so this tests a vertical intent that
      // never activated the horizontal recognizer.
      const { handlerTag } = getByGestureTestId(
        CollectiblesCarouselTestIds.PAN,
      );
      DeviceEventEmitter.emit('onGestureHandlerStateChange', {
        handlerTag,
        state: State.BEGAN,
        oldState: State.UNDETERMINED,
        translationX: 0,
        translationY: 0,
      });
      DeviceEventEmitter.emit('onGestureHandlerStateChange', {
        handlerTag,
        state: State.FAILED,
        oldState: State.BEGAN,
        translationX: 3,
        translationY: 20,
      });
    });

    expect(
      screen.getByTestId(CollectiblesCarouselTestIds.BUY),
    ).toHaveTextContent(
      strings('collectibles_discovery.open_for', {
        amount: formatUsd(PACK.price),
      }),
    );
    fireEvent.press(
      screen.getByTestId(CollectiblesCarouselTestIds.PACK(PACK.code)),
    );
    expect(
      await screen.findByTestId(
        getRouteParamsProbeTestId(Routes.COLLECTIBLES.PACK),
      ),
    ).toBeOnTheScreen();
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  it('keeps the selected pack and responder when delayed activity would reverse the ranking', async () => {
    const nextPack = createPack({ code: 'pokemon_50', price: 50 });
    const firstType = `pack_partner:${PACK.code}`;
    const nextType = `pack_partner:${nextPack.code}`;
    const clients = {
      collectiblesApi: new MockCollectiblesApiClient(),
      socialApi: new MockCollectiblesSocialApiClient(),
    };
    const insights = await clients.collectiblesApi.getPackInsights({
      packTypes: [firstType, nextType],
    });
    const delayed = createDeferredPromise<typeof insights>();
    jest
      .spyOn(clients.collectiblesApi, 'getPackInsights')
      .mockReturnValue(delayed.promise);
    const reduceMotion = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);
    packPartnerReads.getPacks.mockResolvedValue([PACK, nextPack]);
    setCollectiblesFixtureClients(clients);
    Object.assign(Engine.context, {
      CollectiblesController: {
        ...controller,
      },
    });

    try {
      renderOverview();
      const hero = within(
        await screen.findByTestId(CollectiblesCarouselTestIds.CONTAINER),
      );
      const purchaseLabel = strings('collectibles_discovery.open_for', {
        amount: formatUsd(nextPack.price),
      });
      fireEvent.press(
        hero.getByTestId(CollectiblesCarouselTestIds.PACK(nextPack.code)),
      );
      await waitFor(() =>
        expect(
          hero.getByTestId(CollectiblesCarouselTestIds.BUY),
        ).toHaveTextContent(purchaseLabel),
      );
      const responder = getByGestureTestId(CollectiblesCarouselTestIds.PAN)
        .handlers.onUpdate;
      expect(responder).toEqual(expect.any(Function));

      await act(async () => {
        delayed.resolve({
          ...insights,
          [firstType]: { ...insights[firstType], openedLast7d: 1 },
          [nextType]: { ...insights[nextType], openedLast7d: 1000 },
        });
      });

      expect(
        hero.getByTestId(CollectiblesCarouselTestIds.BUY),
      ).toHaveTextContent(purchaseLabel);
      expect(
        getByGestureTestId(CollectiblesCarouselTestIds.PAN).handlers.onUpdate,
      ).toBe(responder);
      fireEvent.press(
        hero.getByTestId(CollectiblesCarouselTestIds.PACK(nextPack.code)),
      );
      expect(
        await screen.findByTestId(
          getRouteParamsProbeTestId(Routes.COLLECTIBLES.PACK),
        ),
      ).toHaveTextContent(JSON.stringify({ packCode: nextPack.code }));
      expect(controller.generatePack).not.toHaveBeenCalled();
    } finally {
      reduceMotion.mockResolvedValue(false);
    }
  });

  it.each([
    { hardware: 'HIGH', memoryGiB: 8 },
    { hardware: 'LOW', memoryGiB: 2 },
  ])(
    'retains every pack, its order and the selected pack on $hardware hardware when the network slows',
    async ({ memoryGiB }) => {
      const memory = jest.mocked(getTotalMemorySync);
      memory.mockReturnValue(memoryGiB * 1024 ** 3);
      const reduceMotion = jest
        .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
        .mockResolvedValue(true);
      const packs = Array.from({ length: 10 }, (_, index) =>
        createPack({
          code: `catalogue_${index}`,
          name: `Catalogue pack ${index}`,
          price: 25 + index,
        }),
      );
      const selected = packs[5];
      const initialOpening = createOpening('BeforeNetworkChange');
      packPartnerReads.getPacks.mockResolvedValue(packs);
      serveRecentOpenings(ALL_PACKS, [initialOpening]);

      try {
        renderOverview();
        const hero = within(
          await screen.findByTestId(CollectiblesCarouselTestIds.CONTAINER),
        );
        await screen.findByTestId(
          `collectibles-discovery-card-${initialOpening.mint}`,
        );
        const packIds = packs.map((pack) =>
          CollectiblesCarouselTestIds.PACK(pack.code),
        );
        const renderedPackIds = () =>
          hero
            .getAllByTestId(/^collectibles-hero-pack-/u)
            .map((packButton) => packButton.props.testID);
        expect(renderedPackIds()).toEqual(packIds);
        fireEvent.press(
          hero.getByTestId(CollectiblesCarouselTestIds.PACK(selected.code)),
        );
        const purchaseLabel = strings('collectibles_discovery.open_for', {
          amount: formatUsd(selected.price),
        });
        await waitFor(() =>
          expect(
            hero.getByTestId(CollectiblesCarouselTestIds.BUY),
          ).toHaveTextContent(purchaseLabel),
        );
        const wheel = hero.getByTestId(CollectiblesCarouselTestIds.WHEEL);
        const responder = getByGestureTestId(CollectiblesCarouselTestIds.PAN)
          .handlers.onUpdate;
        expect(responder).toEqual(expect.any(Function));

        act(() => {
          __setMockNetInfo({
            type: 'cellular',
            isInternetReachable: true,
            details: { cellularGeneration: '3g' },
          });
          // The native NetInfo mock supplies its latest snapshot on render.
          // A native visibility update rerenders without remounting the route.
          fireEvent(
            screen.getByTestId(CollectiblesHomeTestIds.OVERVIEW),
            'viewableItemsChanged',
            { viewableItems: [{ item: 'hero' }] },
          );
        });

        expect(renderedPackIds()).toEqual(packIds);
        expect(
          hero.getByTestId(CollectiblesCarouselTestIds.BUY),
        ).toHaveTextContent(purchaseLabel);
        expect(hero.getByTestId(CollectiblesCarouselTestIds.WHEEL)).toBe(wheel);
        expect(
          getByGestureTestId(CollectiblesCarouselTestIds.PAN).handlers.onUpdate,
        ).toBe(responder);
        fireEvent.press(
          hero.getByTestId(CollectiblesCarouselTestIds.PACK(selected.code)),
        );
        expect(
          await screen.findByTestId(
            getRouteParamsProbeTestId(Routes.COLLECTIBLES.PACK),
          ),
        ).toHaveTextContent(JSON.stringify({ packCode: selected.code }));
        expect(controller.generatePack).not.toHaveBeenCalled();
      } finally {
        memory.mockReturnValue(4 * 1024 ** 3);
        reduceMotion.mockResolvedValue(false);
      }
    },
  );

  it('disables the polling query while public details cover the feed and enables it on return', async () => {
    serveRecentOpenings(ALL_PACKS, [createOpening('PublicCard')]);
    renderOverview();

    fireEvent.press(
      await screen.findByTestId('collectibles-discovery-card-PublicCard'),
    );
    const detail = within(
      await screen.findByTestId('collectibles-public-card'),
    );
    expect(feedQuery()?.isActive()).toBe(false);
    fireEvent.press(detail.getByLabelText(strings('navigation.back')));

    expect(feedQuery()?.isActive()).toBe(true);
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  it('disables the global openings query when leaving Popular for Packs', async () => {
    renderOverview();
    await screen.findByTestId('collectibles-popular-buy');
    expect(packPartnerReads.getRecentOpenings).toHaveBeenCalledWith({
      count: 20,
    });

    fireEvent.press(screen.getByTestId(CollectiblesHomeTestIds.PACKS_TAB));

    expect(feedQuery()?.isActive()).toBe(false);
  });

  it('disables the query when openings leave the viewport and enables it on return', async () => {
    renderOverview();
    await screen.findByTestId('collectibles-popular-buy');
    const overview = screen.getByTestId(CollectiblesHomeTestIds.OVERVIEW);

    fireEvent(overview, 'viewableItemsChanged', {
      viewableItems: [{ item: 'hero' }],
    });
    expect(feedQuery()?.isActive()).toBe(false);
    fireEvent(overview, 'viewableItemsChanged', {
      viewableItems: [{ item: 'openings' }],
    });

    expect(feedQuery()?.isActive()).toBe(true);
  });

  it('shows the public snapshot newest first with opener metadata', async () => {
    serveRecentOpenings(ALL_PACKS, [
      createOpening('Snapshot', { openerAddress: 'RestOpenerWallet9876' }),
      createOpening('Next', { openedAt: 2000 }),
    ]);
    renderOverview();

    await screen.findByTestId('collectibles-discovery-card-Snapshot');

    const row = within(screen.getByTestId('collectibles-recent-openings-row'));
    expect(
      row
        .getAllByTestId(/^collectibles-discovery-card-/u)
        .map((card) => card.props.testID),
    ).toEqual([
      'collectibles-discovery-card-Next',
      'collectibles-discovery-card-Snapshot',
    ]);
    expect(row.getByText(/RestOp…9876/u)).toBeOnTheScreen();
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  it('does not invent packs when the live catalogue is empty', async () => {
    packPartnerReads.getPacks.mockResolvedValue([]);
    renderOverview();
    const overview = within(
      await screen.findByTestId(CollectiblesHomeTestIds.OVERVIEW),
    );
    expect(
      await overview.findAllByText(strings('collectibles.packs.empty')),
    ).toHaveLength(2);
    expect(
      overview.queryByTestId('collectibles-popular-buy'),
    ).not.toBeOnTheScreen();
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  it('opens the supplied Social profile from hero context without opening or buying a pack', async () => {
    const clients = {
      collectiblesApi: new MockCollectiblesApiClient(),
      socialApi: new MockCollectiblesSocialApiClient(),
    };
    const context = await clients.socialApi.getPackSocialContext({
      packTypes: [`pack_partner:${PACK.code}`],
    });
    const profile = context[`pack_partner:${PACK.code}`].friends[0];
    setCollectiblesFixtureClients(clients);
    Object.assign(Engine.context, {
      CollectiblesController: {
        ...controller,
      },
    });
    renderOverview();
    const hero = within(
      await screen.findByTestId('collectibles-popular-carousel'),
    );
    fireEvent.press(
      await hero.findByTestId(
        `collectibles-social-profile-${profile.profileId}`,
      ),
    );

    expect(
      await screen.findByTestId(
        getRouteParamsProbeTestId(Routes.COLLECTIBLES.EXPLORE),
      ),
    ).toHaveTextContent(
      JSON.stringify({ screen: 'profile', profileId: profile.profileId }),
    );
    expect(controller.generatePack).not.toHaveBeenCalled();
  });
});

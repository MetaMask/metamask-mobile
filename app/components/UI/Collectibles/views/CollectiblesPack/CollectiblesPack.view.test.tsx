import { PACK_PARTNER_ENVIRONMENT } from '../../providers/pack-partner/constants';
import '../../../../../../tests/component-view/mocks';
import React from 'react';
import { notifyManager } from '@tanstack/query-core';
import {
  AppState,
  Pressable,
  StyleSheet,
  Text,
  type AppStateStatus,
} from 'react-native';
import { createDeferredPromise } from '@metamask/utils';
import { useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { renderCollectiblesView } from '../../../../../../tests/component-view/renderers/collectibles';
import {
  createComponentViewQueryClient,
  createRouteParamsProbe,
} from '../../../../../../tests/component-view/render';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import { updateBgState } from '../../../../../core/redux/slices/engine';
import {
  CollectiblesPackDetailTestIds,
  CollectiblesPurchaseSheetTestIds,
  CollectiblesCarouselTestIds,
  CollectiblesPackSocialTestIds,
} from '../../Collectibles.testIds';
import {
  setCollectiblesFixtureClients,
  packPartnerReads,
  createCard,
  createPack,
  MOCK_ACCOUNT,
  MOCK_INTERNAL_ACCOUNT,
  serveRecentOpenings,
} from '../testUtils';
import CollectiblesPack from './CollectiblesPack';
import { MockCollectiblesApiClient } from '../../services/clients/MockCollectiblesApiClient';
import { MockCollectiblesSocialApiClient } from '../../services/clients/MockCollectiblesSocialApiClient';

import type {
  CollectiblesInventoryCard,
  CollectiblesOpening,
} from '../../types';

const PACK = createPack();
let feedQueries: ReturnType<typeof createComponentViewQueryClient>;
const feedQuery = (packType = PACK.code) =>
  feedQueries
    .getQueryCache()
    .find({
      queryKey: [
        'PackPartnerDataService:getRecentOpenings',
        PACK_PARTNER_ENVIRONMENT,
        { packType, count: 20 },
      ],
    });
const PUBLIC_CARD: CollectiblesOpening = {
  ...createCard(),
  id: 'public-event',
  mint: 'PublicMint',
  name: 'Original NFT name',
  set: 'Public pull',
  openedAt: Date.parse('2026-10-13T20:00:00Z'),
};
const addAppStateListener = jest
  .mocked(AppState.addEventListener)
  .getMockImplementation();
// Native AppState: every registered listener hears a change until removed.
const appStateListeners = new Set<(state: AppStateStatus) => void>();
const appStateChanged = (state: AppStateStatus) =>
  appStateListeners.forEach((listener) => listener(state));
const CARD = createCard({ packCode: PACK.code });
const controller = {
  generatePack: jest.fn(),
};

const renderPack = (packCode = PACK.code) =>
  renderCollectiblesView({
    queryClient: feedQueries,
    entry: { Component: CollectiblesPack, name: Routes.COLLECTIBLES.PACK },
    params: { packCode },
    ownedCards: [
      CARD,
      createCard({ mint: 'OtherMint', packCode: 'one_piece_25' }),
    ],
    routes: [
      {
        name: Routes.COLLECTIBLES.CARD,
        Component: createRouteParamsProbe(Routes.COLLECTIBLES.CARD),
      },
    ],
  });

const EntryStack = createNativeStackNavigator();
const PackEntryStack = () => (
  <EntryStack.Navigator>
    <EntryStack.Screen
      name={Routes.COLLECTIBLES.PACK}
      component={CollectiblesPack}
      initialParams={{ packCode: PACK.code }}
    />
  </EntryStack.Navigator>
);
const HomeLauncher = () => {
  const navigation = useNavigation<AppNavigationProp>();
  return (
    <Pressable
      onPress={() => navigation.navigate(Routes.COLLECTIBLES.ROOT)}
      testID="launch-collectibles-pack"
    >
      <Text>Wallet home</Text>
    </Pressable>
  );
};

// Real stack navigation keeps the pack mounted while another screen has focus.
const NavigablePack = () => {
  const navigation = useNavigation<AppNavigationProp>();
  return (
    <>
      <CollectiblesPack />
      <Pressable
        testID="leave-pack"
        onPress={() =>
          navigation.navigate(Routes.COLLECTIBLES.CARD, { mint: 'MintA' })
        }
      >
        <Text>Other screen</Text>
      </Pressable>
      <Pressable
        testID="change-pack"
        onPress={() => navigation.setParams({ packCode: 'pokemon_25' })}
      >
        <Text>Other pack</Text>
      </Pressable>
    </>
  );
};
const ReturnToPack = () => {
  const navigation = useNavigation<AppNavigationProp>();
  return (
    <Pressable testID="return-pack" onPress={() => navigation.goBack()}>
      <Text>Back</Text>
    </Pressable>
  );
};

describeForPlatforms('CollectiblesPack', () => {
  afterEach(() => feedQueries.clear());
  // Query notifications come from the background service, outside RN events.
  // Flush their React updates through act just like native user interactions.
  beforeAll(() =>
    notifyManager.setNotifyFunction((callback) => {
      act(callback);
    }),
  );
  afterAll(() => notifyManager.setNotifyFunction((callback) => callback()));
  beforeEach(() => {
    feedQueries = createComponentViewQueryClient();
    Object.values(controller).forEach((method) => {
      if (jest.isMockFunction(method)) method.mockReset();
    });
    appStateListeners.clear();
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((event, callback) => {
        if (event === 'change') appStateListeners.add(callback);
        return { remove: () => appStateListeners.delete(callback) };
      });
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      value: 'active',
    });
    serveRecentOpenings(PACK.code, [PUBLIC_CARD]);
    packPartnerReads.getPacks.mockResolvedValue([PACK]);
    packPartnerReads.getPackInventory.mockResolvedValue({ cards: [] });
    Object.assign(Engine.context, { CollectiblesController: controller });
  });

  it('keeps a hero and action skeleton until the current catalogue is available', async () => {
    const pending = createDeferredPromise<ReturnType<typeof createPack>[]>();
    packPartnerReads.getPacks.mockReturnValue(pending.promise);

    renderCollectiblesView({
      entry: { Component: CollectiblesPack, name: Routes.COLLECTIBLES.PACK },
      params: { packCode: PACK.code },
    });

    expect(
      await screen.findByTestId(CollectiblesPackDetailTestIds.LOADING),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesPackDetailTestIds.BUY),
    ).not.toBeOnTheScreen();
    await act(async () => pending.resolve([PACK]));
    expect(
      await screen.findByTestId(CollectiblesPackDetailTestIds.BUY),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesPackDetailTestIds.LOADING),
    ).not.toBeOnTheScreen();
  });

  it('shows every published rarity and preserves fractional odds before purchase', async () => {
    packPartnerReads.getPacks.mockResolvedValue([
      createPack({
        odds: { common: 0.7525, uncommon: 0.2, rare: 0.04, epic: 0.0075 },
      }),
    ]);
    renderPack();

    await screen.findByTestId(CollectiblesPackDetailTestIds.BUY);
    expect(
      within(screen.getByTestId('collectibles-pack-rarity-metrics')).getByText(
        /75\.25%/u,
      ),
    ).toBeOnTheScreen();
    fireEvent.press(
      screen.getByTestId(CollectiblesPackDetailTestIds.VIEW_ODDS),
    );
    const information = within(
      await screen.findByTestId(CollectiblesPackDetailTestIds.INFORMATION),
    );

    for (const text of [
      'Common',
      'Uncommon',
      'Rare',
      'Epic',
      '75.25%',
      '20%',
      '4%',
      '0.75%',
    ]) {
      expect(information.getByText(text)).toBeOnTheScreen();
    }
    fireEvent.press(
      information.getByText(strings('collectibles.pack_detail.got_it')),
    );
    expect(
      screen.queryByTestId(CollectiblesPackDetailTestIds.INFORMATION),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId('collectibles-pack-detail-hero'),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesPurchaseSheetTestIds.SHEET),
    ).not.toBeOnTheScreen();
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  afterEach(() => {
    // Restore only this suite's native override, leaving shared fixtures alone.
    if (addAppStateListener)
      jest
        .mocked(AppState.addEventListener)
        .mockImplementation(addAppStateListener);
  });

  it('keeps the backdrop inside the scrollable hero and preserves its size when the footer contracts', async () => {
    renderPack();
    const footer = await screen.findByTestId(
      CollectiblesPackDetailTestIds.FOOTER,
    );
    fireEvent(footer, 'layout', {
      nativeEvent: { layout: { x: 0, y: 600, width: 390, height: 180 } },
    });
    const hero = screen.getByTestId('collectibles-pack-detail-hero');
    const heroHeight = StyleSheet.flatten(hero.props.style).minHeight;
    expect(hero).toHaveStyle({ overflow: 'hidden' });
    expect(
      within(hero).getByTestId(CollectiblesCarouselTestIds.GALAXY, {
        includeHiddenElements: true,
      }),
    ).toBeOnTheScreen();

    fireEvent.scroll(screen.getByTestId('collectibles-pack-inventory-list'), {
      nativeEvent: {
        contentOffset: { x: 0, y: 100 },
        layoutMeasurement: { width: 390, height: 780 },
        contentSize: { width: 390, height: 2000 },
      },
    });
    expect(screen.queryByTestId('collectibles-pack-see-more')).toBeNull();
    // Native layout reports the shorter footer after See more leaves. It must
    // update list clearance without changing the artwork's flight destination.
    fireEvent(footer, 'layout', {
      nativeEvent: { layout: { x: 0, y: 660, width: 390, height: 120 } },
    });
    expect(hero).toHaveStyle({ minHeight: heroHeight });
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  it('reserves Social and statistics space until pack enrichments arrive', async () => {
    const packType = `pack_partner:${PACK.code}`;
    const clients = {
      collectiblesApi: new MockCollectiblesApiClient(),
      socialApi: new MockCollectiblesSocialApiClient(),
    };
    const contexts = await clients.socialApi.getPackSocialContext({
      packTypes: [packType],
    });
    const insights = await clients.collectiblesApi.getPackInsights({
      packTypes: [packType],
    });
    const socialPending = createDeferredPromise<typeof contexts>();
    const insightsPending = createDeferredPromise<typeof insights>();
    jest
      .spyOn(clients.socialApi, 'getPackSocialContext')
      .mockReturnValue(socialPending.promise);
    const insightsRequest = jest
      .spyOn(clients.collectiblesApi, 'getPackInsights')
      .mockReturnValue(insightsPending.promise);
    setCollectiblesFixtureClients(clients);
    Object.assign(Engine.context, {
      CollectiblesController: {
        ...controller,
      },
    });
    renderPack();
    const footer = await screen.findByTestId(
      CollectiblesPackDetailTestIds.FOOTER,
    );
    fireEvent(footer, 'layout', {
      nativeEvent: { layout: { x: 0, y: 600, width: 390, height: 180 } },
    });
    const hero = screen.getByTestId('collectibles-pack-detail-hero');
    const heroHeight = StyleSheet.flatten(hero.props.style).minHeight;
    const context = within(footer);
    expect(
      context.getByTestId(CollectiblesPackSocialTestIds.PEOPLE),
    ).toHaveStyle({ minHeight: 24 });
    const statistics = within(screen.getByTestId('collectibles-pack-insights'));
    expect(
      statistics.getByText(strings('collectibles.pack_detail.since_epic')),
    ).toBeOnTheScreen();
    expect(statistics.getAllByText('—')).toHaveLength(5);
    await waitFor(() =>
      expect(insightsRequest).toHaveBeenCalledWith({ packTypes: [packType] }),
    );

    await act(async () => {
      socialPending.resolve(contexts);
      insightsPending.resolve(insights);
    });

    await waitFor(() =>
      expect(
        within(screen.getByTestId('collectibles-pack-insights')).queryAllByText(
          '—',
        ),
      ).toHaveLength(0),
    );
    expect(
      context.getByTestId(CollectiblesPackSocialTestIds.PEOPLE),
    ).toHaveStyle({ minHeight: 24 });
    expect(hero).toHaveStyle({ minHeight: heroHeight });
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  it('reads public pulls with pack filters without mixing wallet holdings', async () => {
    renderPack();

    await screen.findByText('Public pull');

    expect(screen.queryByText(CARD.name)).not.toBeOnTheScreen();
    expect(packPartnerReads.getRecentOpenings).toHaveBeenCalledWith({
      packType: PACK.code,
      count: 20,
    });
    expect(feedQuery()?.isActive()).toBe(true);
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  it.each(['inactive', 'background'] as const)(
    'disables the polling query when the app becomes %s and enables it on foreground',
    async (state) => {
      renderPack();
      await screen.findByText('Public pull');

      act(() => appStateChanged(state));
      expect(feedQuery()?.isActive()).toBe(false);
      act(() => appStateChanged('active'));

      expect(feedQuery()?.isActive()).toBe(true);
    },
  );

  it('disables the polling query while public metadata obscures the feed', async () => {
    renderPack();
    await screen.findByText('Public pull');

    fireEvent.press(
      screen.getByTestId(CollectiblesPackDetailTestIds.OPENING('public-event')),
    );
    const detail = within(
      await screen.findByTestId('collectibles-public-card'),
    );
    expect(feedQuery()?.isActive()).toBe(false);
    expect(
      detail.queryByText(strings('collectibles.reveal.sell_back')),
    ).not.toBeOnTheScreen();
    fireEvent.press(detail.getByLabelText(strings('navigation.back')));

    expect(feedQuery()?.isActive()).toBe(true);
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  it('disables the polling query when navigation blurs a mounted detail and enables it on return', async () => {
    renderCollectiblesView({
      queryClient: feedQueries,
      entry: { Component: NavigablePack, name: Routes.COLLECTIBLES.PACK },
      params: { packCode: PACK.code },
      routes: [{ name: Routes.COLLECTIBLES.CARD, Component: ReturnToPack }],
    });
    await screen.findByText('Public pull');

    fireEvent.press(screen.getByTestId('leave-pack'));
    await screen.findByTestId('return-pack');
    expect(feedQuery()?.isActive()).toBe(false);
    fireEvent.press(screen.getByTestId('return-pack'));

    expect(feedQuery()?.isActive()).toBe(true);
  });

  it('switches the polling filter when another pack is selected', async () => {
    packPartnerReads.getPacks.mockResolvedValue([
      PACK,
      createPack({ code: 'pokemon_25' }),
    ]);
    renderCollectiblesView({
      queryClient: feedQueries,
      entry: { Component: NavigablePack, name: Routes.COLLECTIBLES.PACK },
      params: { packCode: PACK.code },
    });
    await screen.findByText('Public pull');

    fireEvent.press(screen.getByTestId('change-pack'));
    await waitFor(() =>
      expect(packPartnerReads.getRecentOpenings).toHaveBeenLastCalledWith({
        packType: 'pokemon_25',
        count: 20,
      }),
    );

    expect(feedQuery()?.isActive()).toBe(false);
    expect(feedQuery('pokemon_25')?.isActive()).toBe(true);
    expect(screen.queryByText('Public pull')).not.toBeOnTheScreen();
  });

  it('removes the polling observer on unmount', async () => {
    const { unmount } = renderPack();
    await screen.findByText('Public pull');

    unmount();
    act(() => appStateChanged('active'));

    expect(feedQuery()?.getObserversCount()).toBe(0);
    expect(feedQuery()?.isActive()).toBe(false);
  });

  it('preserves the reserved height through loading, retry and an empty feed', async () => {
    const snapshot = createDeferredPromise<CollectiblesOpening[]>();
    packPartnerReads.getRecentOpenings.mockReturnValueOnce(snapshot.promise);
    renderPack();
    await screen.findByTestId('collectibles-openings-loading');
    const row = screen.getByTestId('collectibles-pack-openings-list');
    const reservedHeight = StyleSheet.flatten(row.props.style).minHeight;

    await act(async () => snapshot.reject(new Error('PackPartner down')));
    await screen.findByText(strings('collectibles.pack_detail.openings_error'));
    packPartnerReads.getRecentOpenings.mockResolvedValue([]);
    fireEvent.press(screen.getByText(strings('collectibles.errors.retry')));
    await screen.findByText(strings('collectibles.pack_detail.no_openings'));

    expect(row).toHaveStyle({ minHeight: reservedHeight });
    expect(reservedHeight).toBeGreaterThan(0);
    expect(
      screen.queryByTestId('collectibles-openings-loading'),
    ).not.toBeOnTheScreen();
  });

  it('explains empty inventory without starting a purchase', async () => {
    const inventory = createDeferredPromise<{
      cards: CollectiblesInventoryCard[];
    }>();
    packPartnerReads.getPackInventory.mockReturnValue(inventory.promise);
    renderPack();
    await screen.findByTestId(CollectiblesPackDetailTestIds.BUY);
    const footer = await screen.findByTestId('collectibles-inventory-footer');
    const minHeight = StyleSheet.flatten(footer.props.style).minHeight;
    expect(minHeight).toBeGreaterThan(0);
    await act(async () => inventory.resolve({ cards: [] }));

    expect(
      await screen.findByText(
        strings('collectibles.pack_detail.inventory_empty'),
      ),
    ).toBeOnTheScreen();
    expect(footer).toHaveStyle({ minHeight });
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  it('shows live inventory metadata and loads the next page without duplicate cards', async () => {
    const first: CollectiblesInventoryCard = {
      mint: 'pool-a',
      name: 'Available Pikachu',
      set: 'Pikachu set',
      rarity: 'epic',
      insuredValue: 450,
      grade: 'MINT 9',
      gradingCompany: 'PSA',
    };
    const second: CollectiblesInventoryCard = {
      mint: 'pool-b',
      name: 'Available Charizard',
      set: 'Charizard set',
      rarity: 'rare',
      insuredValue: 100,
    };
    packPartnerReads.getPackInventory
      .mockResolvedValueOnce({ cards: [first], nextCursor: 'next-page' })
      .mockResolvedValueOnce({ cards: [first, second] });
    renderPack();

    const tile = within(
      await screen.findByTestId('collectibles-inventory-pool-a'),
    );
    expect(tile.getByText('Pikachu set')).toBeOnTheScreen();
    expect(tile.queryByText('Available Pikachu')).not.toBeOnTheScreen();
    expect(
      tile.getByLabelText(strings('collectibles.rarity.epic')),
    ).toBeOnTheScreen();
    expect(tile.getByText('PSA 9')).toBeOnTheScreen();
    expect(tile.getByText('$450')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('collectibles-inventory-more'));

    expect(
      await screen.findByTestId('collectibles-inventory-pool-b'),
    ).toBeOnTheScreen();
    expect(screen.getAllByTestId('collectibles-inventory-pool-a')).toHaveLength(
      1,
    );
    expect(packPartnerReads.getPackInventory).toHaveBeenLastCalledWith(
      PACK.code,
      'next-page',
    );
    expect(
      screen.queryByTestId('collectibles-inventory-more'),
    ).not.toBeOnTheScreen();
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  it('allows retrying an inventory failure while keeping purchase available', async () => {
    packPartnerReads.getPackInventory.mockRejectedValue(new Error('Offline'));
    renderPack();
    const footer = await screen.findByTestId('collectibles-inventory-footer');
    const minHeight = StyleSheet.flatten(footer.props.style).minHeight;
    expect(minHeight).toBeGreaterThan(0);

    expect(
      await screen.findByText(
        strings('collectibles.pack_detail.inventory_error'),
        {},
        { timeout: 4000 },
      ),
    ).toBeOnTheScreen();
    expect(footer).toHaveStyle({ minHeight });
    expect(screen.getByTestId(CollectiblesPackDetailTestIds.BUY)).toBeEnabled();
    packPartnerReads.getPackInventory.mockResolvedValue({
      cards: [{ mint: 'recovered', name: 'Recovered card' }],
    });
    fireEvent.press(screen.getByText(strings('collectibles.cards.retry')));

    expect(
      await screen.findByTestId('collectibles-inventory-recovered'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Recovered card')).toBeOnTheScreen();
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  it('refreshes available cards and public openings together on pull-to-refresh', async () => {
    const refreshed = createDeferredPromise<{
      cards: CollectiblesInventoryCard[];
    }>();
    packPartnerReads.getPackInventory
      .mockResolvedValueOnce({
        cards: [{ mint: 'previous-pool-card', name: 'Previous pool card' }],
      })
      .mockReturnValueOnce(refreshed.promise);
    renderPack();
    await screen.findByTestId('collectibles-inventory-previous-pool-card');
    await screen.findByText('Public pull');
    const newest = {
      ...PUBLIC_CARD,
      id: 'refreshed-opening',
      mint: 'RefreshedMint',
      set: 'Refreshed public pull',
      openedAt: PUBLIC_CARD.openedAt + 1000,
    };
    serveRecentOpenings(PACK.code, [newest]);

    fireEvent(
      screen.getByTestId('collectibles-pack-inventory-list'),
      'refresh',
    );

    await waitFor(() =>
      expect(packPartnerReads.getPackInventory).toHaveBeenCalledTimes(2),
    );
    expect(packPartnerReads.getPackInventory).toHaveBeenLastCalledWith(
      PACK.code,
      null,
    );
    await screen.findByText('Refreshed public pull');
    expect(
      screen.getByTestId('collectibles-pack-inventory-list').props.refreshing,
    ).toBe(true);
    await act(async () =>
      refreshed.resolve({
        cards: [{ mint: 'new-pool-card', name: 'New pool card' }],
      }),
    );

    expect(
      await screen.findByTestId('collectibles-inventory-new-pool-card'),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId('collectibles-inventory-previous-pool-card'),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId('collectibles-pack-inventory-list').props.refreshing,
    ).toBe(false);
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  it('allows inspecting and dismissing confirmation without authorizing a purchase', async () => {
    renderPack();
    fireEvent.press(
      await screen.findByTestId(CollectiblesPackDetailTestIds.BUY),
    );
    const confirmation = within(
      await screen.findByTestId(CollectiblesPurchaseSheetTestIds.SHEET),
    );

    expect(
      confirmation.getByTestId('collectibles-purchase-total'),
    ).toHaveTextContent(/\$50$/u);
    expect(
      confirmation.queryByText(strings('collectibles.purchase.odds')),
    ).not.toBeOnTheScreen();
    expect(controller.generatePack).not.toHaveBeenCalled();
    fireEvent.press(
      confirmation.getByTestId(CollectiblesPurchaseSheetTestIds.CLOSE_BUTTON),
    );

    expect(
      screen.queryByTestId(CollectiblesPurchaseSheetTestIds.SHEET),
    ).not.toBeOnTheScreen();
    expect(screen.getByTestId(CollectiblesPackDetailTestIds.BUY)).toBeEnabled();
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  it('closes an unconfirmed purchase when the selected Solana account changes', async () => {
    const { store } = renderPack();
    fireEvent.press(
      await screen.findByTestId(CollectiblesPackDetailTestIds.BUY),
    );
    expect(
      await screen.findByTestId(CollectiblesPurchaseSheetTestIds.SHEET),
    ).toBeOnTheScreen();
    const nextAccount = {
      ...MOCK_INTERNAL_ACCOUNT,
      id: 'second-solana-account',
      address: 'HsP8iZA9YiuZsNCXHQH8vLVFEvzMgDiGXAtnsXCXyfxA',
    };
    const background = store.getState().engine.backgroundState;
    const tree = background.AccountTreeController;
    const wallet = tree.accountTree.wallets['entropy:wallet1'];
    act(() => {
      Object.assign(Engine, {
        state: {
          AccountsController: {
            ...background.AccountsController,
            internalAccounts: {
              ...background.AccountsController.internalAccounts,
              accounts: {
                [MOCK_ACCOUNT.id]: MOCK_INTERNAL_ACCOUNT,
                [nextAccount.id]: nextAccount,
              },
              selectedAccount: nextAccount.id,
            },
          },
          AccountTreeController: {
            ...tree,
            accountTree: {
              wallets: {
                'entropy:wallet1': {
                  ...wallet,
                  groups: {
                    'entropy:wallet1/0': {
                      ...wallet.groups['entropy:wallet1/0'],
                      accounts: [nextAccount.id],
                    },
                  },
                },
              },
            },
          },
        },
      });
      store.dispatch(updateBgState({ key: 'AccountsController' }));
      store.dispatch(updateBgState({ key: 'AccountTreeController' }));
    });

    expect(
      screen.queryByTestId(CollectiblesPurchaseSheetTestIds.SHEET),
    ).not.toBeOnTheScreen();
    expect(controller.generatePack).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId(CollectiblesPackDetailTestIds.BUY));
    expect(
      await screen.findByTestId(
        CollectiblesPurchaseSheetTestIds.CONFIRM_BUTTON,
      ),
    ).toHaveTextContent(strings('collectibles.purchase.buy_one_pack'));
    expect(
      screen.getByTestId(CollectiblesPurchaseSheetTestIds.CONFIRM_BUTTON),
    ).toBeDisabled();
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  it('closes the Collectibles stack back to its origin when pack detail is its entry screen', async () => {
    renderCollectiblesView({
      entry: { Component: HomeLauncher, name: 'WalletHome' },
      routes: [{ name: Routes.COLLECTIBLES.ROOT, Component: PackEntryStack }],
    });
    fireEvent.press(screen.getByTestId('launch-collectibles-pack'));
    await screen.findByText('Public pull');

    fireEvent.press(screen.getByLabelText(strings('navigation.back')));

    expect(
      await screen.findByTestId('launch-collectibles-pack'),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesPackDetailTestIds.CONTAINER),
    ).not.toBeOnTheScreen();
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  it('cannot buy a pack absent from the live catalogue', async () => {
    renderPack('removed-pack');

    expect(
      await screen.findByText(
        strings('collectibles.errors.machine_unavailable'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesPackDetailTestIds.BUY),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesPurchaseSheetTestIds.SHEET),
    ).not.toBeOnTheScreen();
    expect(controller.generatePack).not.toHaveBeenCalled();
  });
});

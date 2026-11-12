import '../../../../../../tests/component-view/mocks';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import { createDeferredPromise } from '@metamask/utils';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { renderCollectiblesView } from '../../../../../../tests/component-view/renderers/collectibles';
import {
  createRouteParamsProbe,
  getRouteParamsProbeTestId,
} from '../../../../../../tests/component-view/render';
import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { MockCollectiblesApiClient } from '../../services/clients/MockCollectiblesApiClient';
import { MockCollectiblesSocialApiClient } from '../../services/clients/MockCollectiblesSocialApiClient';
import {
  setCollectiblesFixtureClients,
  packPartnerReads,
  createPack,
  MOCK_ACCOUNT,
} from '../testUtils';
import {
  CollectiblesPackCardTestIds,
  CollectiblesPurchaseSheetTestIds,
} from '../../Collectibles.testIds';
import CollectiblesExplore from './CollectiblesExplore';

describeForPlatforms('Collectibles optional discovery destinations', () => {
  const services = () => ({
    collectiblesApi: new MockCollectiblesApiClient(),
    socialApi: new MockCollectiblesSocialApiClient(),
  });

  it('renders cursor-backed history without creating a wallet purchase', async () => {
    const clients = services();
    const history = jest.spyOn(clients.collectiblesApi, 'getWalletHistory');
    const generatePack = jest.fn();
    setCollectiblesFixtureClients(clients);
    Object.assign(Engine.context, {
      CollectiblesController: {
        generatePack,
      },
    });

    renderCollectiblesView({
      entry: {
        Component: CollectiblesExplore,
        name: Routes.COLLECTIBLES.EXPLORE,
      },
      params: { screen: 'history' },
    });

    await waitFor(() =>
      expect(history).toHaveBeenCalledWith(
        expect.objectContaining({
          account: { namespace: 'solana', address: MOCK_ACCOUNT.address },
          limit: 20,
        }),
      ),
    );
    expect(
      await screen.findByTestId('collectibles-history-list'),
    ).toBeOnTheScreen();
    expect(generatePack).not.toHaveBeenCalled();
  });

  it('switches leaderboard metrics through the Social API', async () => {
    const clients = services();
    const leaderboard = jest.spyOn(clients.socialApi, 'getLeaderboard');
    setCollectiblesFixtureClients(clients);
    renderCollectiblesView({
      entry: {
        Component: CollectiblesExplore,
        name: Routes.COLLECTIBLES.EXPLORE,
      },
      params: { screen: 'leaderboard' },
    });
    await screen.findByTestId('collectibles-leaderboard-list');

    fireEvent.press(screen.getByTestId('collectibles-leaderboard-sort'));
    fireEvent.press(
      await screen.findByTestId('collectibles-option-collectiblesEpic'),
    );

    await waitFor(() =>
      expect(leaderboard).toHaveBeenCalledWith(
        expect.objectContaining({ sort: 'collectiblesEpic' }),
      ),
    );
  });

  it('requests only sold records for Sales and displays the received amount', async () => {
    const clients = services();
    const request = {
      account: { namespace: 'solana' as const, address: MOCK_ACCOUNT.address },
      status: 'bought_back' as const,
      limit: 20,
    };
    const sales = await clients.collectiblesApi.getWalletHistory(request);
    const sold = sales.items.find(
      (item) => item.buyback?.amountUsd !== null && item.buyback,
    );
    const history = jest.spyOn(clients.collectiblesApi, 'getWalletHistory');
    const sellCard = jest.fn();
    setCollectiblesFixtureClients(clients);
    Object.assign(Engine.context, {
      CollectiblesController: {
        sellCard,
      },
    });

    renderCollectiblesView({
      entry: {
        Component: CollectiblesExplore,
        name: Routes.COLLECTIBLES.EXPLORE,
      },
      params: { screen: 'sales' },
    });

    await waitFor(() =>
      expect(history).toHaveBeenCalledWith(expect.objectContaining(request)),
    );
    expect(sold).toBeDefined();
    expect(
      await screen.findByTestId(`collectibles-sale-receipt-${sold?.packId}`),
    ).toHaveTextContent(`$${Number(sold?.buyback?.amountUsd)}`);
    expect(
      screen.getByTestId(`collectibles-history-date-${sold?.packId}`),
    ).toHaveTextContent(
      `${new Date(sold?.buyback?.occurredAt ?? '').toLocaleString()} · ${strings('collectibles.batch.sold')}`,
    );
    fireEvent.press(screen.getByTestId(`collectibles-history-${sold?.packId}`));
    expect(
      await screen.findByTestId('collectibles-public-sale-receipt'),
    ).toHaveTextContent(/Sold/u);
    expect(
      screen.queryByTestId('collectibles-public-card-buy-pack'),
    ).not.toBeOnTheScreen();
    expect(sellCard).not.toHaveBeenCalled();
  });

  it('renders a shared Core snapshot as a card post without fabricating an indexed pack', async () => {
    const clients = services();
    const published = await clients.socialApi.shareCards({
      draftId: 'core-preview',
      cards: [
        {
          provider: 'pack-partner',
          mint: 'core-card',
          name: 'Core card preview',
          imageUrl: null,
          insuredValueUsd: '13',
        },
      ],
    });
    jest
      .spyOn(clients.socialApi, 'getFeed')
      .mockResolvedValue({ items: [published], nextCursor: null });
    setCollectiblesFixtureClients(clients);
    renderCollectiblesView({
      entry: {
        Component: CollectiblesExplore,
        name: Routes.COLLECTIBLES.EXPLORE,
      },
      params: { screen: 'feed' },
    });
    const post = await screen.findByTestId(
      `collectibles-feed-${published.itemId}`,
    );
    expect(
      within(post).getByText(published.data.cards[0].name),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(`collectibles-feed-${published.itemId}`),
    ).not.toHaveTextContent(
      strings('collectibles_discovery.packs_opened', { count: 1 }),
    );
  });

  it('refreshes a visible feed reaction and comment thread through Social command hooks', async () => {
    const clients = services();
    const published = await clients.socialApi.shareCards({
      draftId: 'interactive-preview',
      cards: [
        {
          provider: 'pack-partner',
          mint: 'interactive-card',
          name: 'Interactive preview',
          imageUrl: null,
          insuredValueUsd: '13',
        },
      ],
    });
    const feed = jest
      .spyOn(clients.socialApi, 'getFeed')
      .mockResolvedValue({ items: [published], nextCursor: null });
    const comments = jest
      .spyOn(clients.socialApi, 'getComments')
      .mockResolvedValue({ items: [], nextCursor: null });
    const react = jest.spyOn(clients.socialApi, 'setReaction');
    const comment = jest.spyOn(clients.socialApi, 'addComment');
    setCollectiblesFixtureClients(clients);
    renderCollectiblesView({
      entry: {
        Component: CollectiblesExplore,
        name: Routes.COLLECTIBLES.EXPLORE,
      },
      params: { screen: 'feed' },
    });
    const row = await screen.findByTestId(
      `collectibles-feed-${published.itemId}`,
    );

    feed.mockResolvedValue({
      items: [
        {
          ...published,
          engagement: {
            ...published.engagement,
            likes: 1,
            likedByViewer: true,
          },
        },
      ],
      nextCursor: null,
    });
    fireEvent.press(
      within(row).getByText(`${strings('collectibles_discovery.like')} · 0`),
    );

    expect(
      await screen.findByText(`${strings('collectibles_discovery.liked')} · 1`),
    ).toBeOnTheScreen();
    expect(react).toHaveBeenCalledTimes(1);
    fireEvent.press(
      within(
        screen.getByTestId(`collectibles-feed-${published.itemId}`),
      ).getByText(`${strings('collectibles_discovery.comments')} · 0`),
    );
    fireEvent.changeText(
      await screen.findByPlaceholderText(
        strings('collectibles_discovery.write_comment'),
      ),
      'Beautiful pull',
    );
    const response = await clients.socialApi.addComment({
      targetType: 'collectibles_cards',
      targetId: published.itemId,
      text: 'Beautiful pull',
    });
    comment.mockClear();
    comments.mockResolvedValue({ items: [response], nextCursor: null });
    fireEvent.press(
      screen.getByText(strings('collectibles_discovery.post_comment')),
    );
    expect(await screen.findByText('Beautiful pull')).toBeOnTheScreen();
    expect(comment).toHaveBeenCalledTimes(1);
    expect(comment).toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: 'collectibles_cards',
        targetId: published.itemId,
        text: 'Beautiful pull',
      }),
    );
  });

  it('locks a comment draft during submission and preserves it after a failed request', async () => {
    const clients = services();
    const published = await clients.socialApi.shareCards({
      draftId: 'comment-preview',
      cards: [
        {
          provider: 'pack-partner',
          mint: 'card',
          name: 'Card',
          imageUrl: null,
          insuredValueUsd: '13',
        },
      ],
    });
    const target = {
      targetType: 'collectibles_cards' as const,
      targetId: published.itemId,
    };
    const response = await clients.socialApi.addComment({
      ...target,
      text: 'Beautiful pull',
    });
    const pending = createDeferredPromise<typeof response>();
    jest
      .spyOn(clients.socialApi, 'getFeed')
      .mockResolvedValue({ items: [published], nextCursor: null });
    const comments = jest
      .spyOn(clients.socialApi, 'getComments')
      .mockResolvedValue({ items: [], nextCursor: null });
    const comment = jest
      .spyOn(clients.socialApi, 'addComment')
      .mockReturnValueOnce(pending.promise);
    setCollectiblesFixtureClients(clients);
    renderCollectiblesView({
      entry: {
        Component: CollectiblesExplore,
        name: Routes.COLLECTIBLES.EXPLORE,
      },
      params: { screen: 'feed' },
    });
    const row = await screen.findByTestId(
      `collectibles-feed-${published.itemId}`,
    );
    fireEvent.press(
      within(row).getByText(
        `${strings('collectibles_discovery.comments')} · 0`,
      ),
    );
    const input = await screen.findByPlaceholderText(
      strings('collectibles_discovery.write_comment'),
    );
    fireEvent.changeText(input, 'Beautiful pull');

    fireEvent.press(
      screen.getByText(strings('collectibles_discovery.post_comment')),
    );
    await waitFor(() => expect(comment).toHaveBeenCalledTimes(1));

    expect(input).toBeDisabled();
    fireEvent.changeText(input, 'Another comment');
    expect(input).toHaveProp('value', 'Beautiful pull');
    await act(async () => pending.reject(new Error('service unavailable')));
    expect(
      await screen.findByText(strings('collectibles_discovery.action_error')),
    ).toBeOnTheScreen();
    expect(input).toHaveProp('value', 'Beautiful pull');
    expect(input).toBeEnabled();
    comments.mockResolvedValue({ items: [response], nextCursor: null });
    fireEvent.press(
      screen.getByText(strings('collectibles_discovery.post_comment')),
    );
    expect(await screen.findByText(response.text)).toBeOnTheScreen();
    expect(input).toHaveProp('value', '');
    expect(comment).toHaveBeenCalledTimes(2);
    expect(comment).toHaveBeenNthCalledWith(2, {
      ...target,
      text: 'Beautiful pull',
    });
  });

  it('shows discovered species in All and the provider pull history in species detail', async () => {
    const clients = services();
    const catalogue = await clients.collectiblesApi.getPokedex({
      accounts: [{ namespace: 'solana', address: MOCK_ACCOUNT.address }],
    });
    const unlocked = catalogue.entries.find((entry) => entry.unlocked);
    const locked = catalogue.entries.find((entry) => !entry.unlocked);
    if (!unlocked || !locked) {
      throw new Error(
        'Pokédex fixture must include discovered and locked species',
      );
    }
    setCollectiblesFixtureClients(clients);
    renderCollectiblesView({
      entry: {
        Component: CollectiblesExplore,
        name: Routes.COLLECTIBLES.EXPLORE,
      },
      params: { screen: 'pokedex' },
    });
    fireEvent.press(
      await screen.findByTestId(`collectibles-pokedex-${unlocked.id}`),
    );
    expect(
      await screen.findByTestId('collectibles-pokedex-detail'),
    ).toHaveTextContent(new RegExp(unlocked.name, 'u'));
    expect(
      screen.getByText(strings('collectibles.progress.pulls')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('collectibles.progress.last_pulled')),
    ).toBeOnTheScreen();
    fireEvent.press(
      screen.getByText(strings('collectibles_discovery.back_pokedex')),
    );
    expect(
      screen.queryByTestId(`collectibles-pokedex-${locked.id}`),
    ).not.toBeOnTheScreen();
    fireEvent.press(
      screen.getByText(
        strings('collectibles_discovery.generation', {
          count: locked.generation,
        }),
      ),
    );
    expect(
      await screen.findByTestId(`collectibles-pokedex-${locked.id}`),
    ).toBeDisabled();
    fireEvent.changeText(
      screen.getByPlaceholderText(
        strings('collectibles_discovery.search_pokemon'),
      ),
      'No matching species',
    );
    fireEvent.press(
      await screen.findByTestId('collectibles-pokedex-clear-filters'),
    );
    expect(
      await screen.findByTestId(`collectibles-pokedex-${unlocked.id}`),
    ).toBeEnabled();
    expect(
      screen.queryByTestId(`collectibles-pokedex-${locked.id}`),
    ).not.toBeOnTheScreen();
  });

  it('routes the empty Pokédex to Pokémon packs without generating a purchase', async () => {
    const clients = services();
    jest.spyOn(clients.collectiblesApi, 'getPokedex').mockResolvedValue({
      entries: [],
      completedCount: 0,
      totalCount: 1025,
    });
    const generatePack = jest.fn();
    setCollectiblesFixtureClients(clients);
    Object.assign(Engine.context, {
      CollectiblesController: {
        generatePack,
      },
    });
    renderCollectiblesView({
      entry: {
        Component: CollectiblesExplore,
        name: Routes.COLLECTIBLES.EXPLORE,
      },
      params: { screen: 'pokedex' },
      routes: [
        {
          name: Routes.COLLECTIBLES.HOME,
          Component: createRouteParamsProbe(Routes.COLLECTIBLES.HOME),
        },
      ],
    });

    fireEvent.press(await screen.findByTestId('collectibles-pokedex-browse'));

    expect(
      await screen.findByTestId(
        getRouteParamsProbeTestId(Routes.COLLECTIBLES.HOME),
      ),
    ).toHaveTextContent(
      JSON.stringify({ initialTab: 'packs', category: 'Pokemon' }),
    );
    expect(generatePack).not.toHaveBeenCalled();
  });

  it('offers real catalog packs in an empty profile and opens their details without buying', async () => {
    const clients = services();
    jest.spyOn(clients.socialApi, 'getProfileCollectibles').mockResolvedValue({
      items: [],
      nextCursor: null,
    });
    jest
      .spyOn(clients.socialApi, 'getProfileFavoritePacks')
      .mockResolvedValue([]);
    const pack = createPack();
    const generatePack = jest.fn();
    setCollectiblesFixtureClients(clients);
    Object.assign(Engine.context, {
      CollectiblesController: {
        generatePack,
      },
    });
    packPartnerReads.getPacks.mockResolvedValue([pack]);
    renderCollectiblesView({
      entry: {
        Component: CollectiblesExplore,
        name: Routes.COLLECTIBLES.EXPLORE,
      },
      params: { screen: 'profile', profileId: 'collector' },
      routes: [
        {
          name: Routes.COLLECTIBLES.PACK,
          Component: createRouteParamsProbe(Routes.COLLECTIBLES.PACK),
        },
      ],
    });

    await screen.findByTestId('collectibles-profile-empty');
    fireEvent.press(
      await screen.findByTestId(CollectiblesPackCardTestIds.CARD(pack.code)),
    );

    expect(
      await screen.findByTestId(
        getRouteParamsProbeTestId(Routes.COLLECTIBLES.PACK),
      ),
    ).toHaveTextContent(JSON.stringify({ packCode: pack.code }));
    expect(generatePack).not.toHaveBeenCalled();
  });

  it('does not render a stale favorite pack when it is no longer available', async () => {
    const clients = services();
    const unavailable = createPack({
      code: 'unavailable-pack',
      name: 'Unavailable favorite',
    });
    jest.spyOn(clients.socialApi, 'getProfileFavoritePacks').mockResolvedValue([
      {
        packType: `pack_partner:${unavailable.code}`,
        packName: unavailable.name,
        openedCount: 3,
      },
    ]);
    setCollectiblesFixtureClients(clients);
    packPartnerReads.getPacks.mockResolvedValue([]);

    renderCollectiblesView({
      entry: {
        Component: CollectiblesExplore,
        name: Routes.COLLECTIBLES.EXPLORE,
      },
      params: { screen: 'profile', profileId: 'collector' },
    });

    expect(
      await screen.findByText(strings('collectibles.packs.empty')),
    ).toBeOnTheScreen();
    expect(screen.queryByText(unavailable.name)).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesPackCardTestIds.CARD(unavailable.code)),
    ).not.toBeOnTheScreen();
  });

  it.each([true, false])(
    'opens favorite pack artwork in detail without buying, with Solana account: %s',
    async (hasSolanaAccount) => {
      const clients = services();
      const pack = createPack();
      jest
        .spyOn(clients.socialApi, 'getProfileFavoritePacks')
        .mockResolvedValue([
          {
            packType: `pack_partner:${pack.code}`,
            packName: pack.name,
            openedCount: 3,
          },
        ]);
      const generatePack = jest.fn();
      setCollectiblesFixtureClients(clients);
      Object.assign(Engine.context, {
        CollectiblesController: { generatePack },
      });
      packPartnerReads.getPacks.mockResolvedValue([pack]);
      renderCollectiblesView({
        entry: {
          Component: CollectiblesExplore,
          name: Routes.COLLECTIBLES.EXPLORE,
        },
        params: { screen: 'profile', profileId: 'collector' },
        hasSolanaAccount,
        routes: [
          {
            name: Routes.COLLECTIBLES.PACK,
            Component: createRouteParamsProbe(Routes.COLLECTIBLES.PACK),
          },
        ],
      });

      fireEvent.press(
        await screen.findByTestId(CollectiblesPackCardTestIds.CARD(pack.code)),
      );

      expect(
        await screen.findByTestId(
          getRouteParamsProbeTestId(Routes.COLLECTIBLES.PACK),
        ),
      ).toHaveTextContent(JSON.stringify({ packCode: pack.code }));
      expect(
        screen.queryByTestId(CollectiblesPurchaseSheetTestIds.SHEET),
      ).not.toBeOnTheScreen();
      expect(generatePack).not.toHaveBeenCalled();
    },
  );

  it('loads full profile openings and favorite aggregates separately from posts', async () => {
    const clients = services();
    const profile = await clients.socialApi.getProfile({
      profileId: 'collector',
    });
    if (!profile) throw new Error('Profile fixture missing');
    jest.spyOn(clients.socialApi, 'getProfile').mockResolvedValue({
      ...profile,
      accounts: [{ namespace: 'solana', address: MOCK_ACCOUNT.address }],
    });
    const opened = jest.spyOn(clients.socialApi, 'getProfileCollectibles');
    const favorites = jest.spyOn(clients.socialApi, 'getProfileFavoritePacks');
    const feed = jest.spyOn(clients.socialApi, 'getFeed');
    const generatePack = jest.fn();
    setCollectiblesFixtureClients(clients);
    Object.assign(Engine.context, {
      CollectiblesController: {
        generatePack,
      },
    });
    renderCollectiblesView({
      entry: {
        Component: CollectiblesExplore,
        name: Routes.COLLECTIBLES.EXPLORE,
      },
      params: { screen: 'profile', profileId: 'collector' },
    });
    await screen.findByTestId('collectibles-profile-cards');
    expect(
      screen.queryByTestId('collectibles-profile-follow'),
    ).not.toBeOnTheScreen();
    await waitFor(() =>
      expect(opened).toHaveBeenCalledWith(
        expect.objectContaining({
          profileId: 'collector',
          limit: 20,
        }),
      ),
    );
    expect(favorites).toHaveBeenCalledWith({ profileId: 'collector' });
    expect(feed).not.toHaveBeenCalled();
    expect(generatePack).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText(strings('collectibles.profile.feed')));
    await waitFor(() =>
      expect(feed).toHaveBeenCalledWith(
        expect.objectContaining({ profileId: 'collector' }),
      ),
    );
  });

  it('follows and unfollows another profile through the real data service', async () => {
    const clients = services();
    const profile = await clients.socialApi.getProfile({ profileId: 'alex' });
    if (!profile) throw new Error('Profile fixture missing');
    const profileRead = jest
      .spyOn(clients.socialApi, 'getProfile')
      .mockResolvedValue(profile);
    const write = jest.spyOn(clients.socialApi, 'setFollow');
    const generatePack = jest.fn();
    setCollectiblesFixtureClients(clients);
    Object.assign(Engine.context, {
      CollectiblesController: {
        generatePack,
      },
    });
    renderCollectiblesView({
      entry: {
        Component: CollectiblesExplore,
        name: Routes.COLLECTIBLES.EXPLORE,
      },
      params: { screen: 'profile', profileId: 'alex' },
    });
    const followers = (count: number) =>
      strings('collectibles.profile.followers', {
        count: count.toLocaleString(),
      });
    expect(
      await screen.findByTestId('collectibles-profile-follow'),
    ).toHaveTextContent(strings('collectibles.profile.follow'));

    profileRead.mockResolvedValue({
      ...profile,
      isFollowing: true,
      followerCount: profile.followerCount + 1,
    });
    fireEvent.press(screen.getByTestId('collectibles-profile-follow'));

    await waitFor(() =>
      expect(
        screen.getByTestId('collectibles-profile-follow'),
      ).toHaveTextContent(strings('collectibles.profile.following')),
    );
    expect(
      screen.getByTestId('collectibles-profile-followers'),
    ).toHaveTextContent(followers((profile?.followerCount ?? 0) + 1));
    expect(write).toHaveBeenCalledWith({
      profileId: 'alex',
      following: true,
    });
    profileRead.mockResolvedValue(profile);
    fireEvent.press(screen.getByTestId('collectibles-profile-follow'));
    await waitFor(() =>
      expect(
        screen.getByTestId('collectibles-profile-follow'),
      ).toHaveTextContent(strings('collectibles.profile.follow')),
    );
    expect(
      screen.getByTestId('collectibles-profile-followers'),
    ).toHaveTextContent(followers(profile?.followerCount ?? 0));
    expect(write).toHaveBeenLastCalledWith({
      profileId: 'alex',
      following: false,
    });
    expect(generatePack).not.toHaveBeenCalled();
  });

  it('shows a service error and retries the Pokédex request', async () => {
    const clients = services();
    const response = await clients.collectiblesApi.getPokedex({ accounts: [] });
    const request = jest
      .spyOn(clients.collectiblesApi, 'getPokedex')
      .mockRejectedValueOnce(new Error('Service unavailable'))
      .mockResolvedValue(response);
    setCollectiblesFixtureClients(clients);
    renderCollectiblesView({
      entry: {
        Component: CollectiblesExplore,
        name: Routes.COLLECTIBLES.EXPLORE,
      },
      params: { screen: 'pokedex' },
    });
    await screen.findByText(strings('collectibles_discovery.load_error'));

    fireEvent.press(screen.getByText(strings('collectibles_discovery.retry')));

    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByPlaceholderText(
        strings('collectibles_discovery.search_pokemon'),
      ),
    ).toBeOnTheScreen();
  });
});

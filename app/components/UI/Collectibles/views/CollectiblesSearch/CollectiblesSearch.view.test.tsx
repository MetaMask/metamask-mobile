import '../../../../../../tests/component-view/mocks';
import React, { useEffect } from 'react';
import { act, screen, waitFor, within } from '@testing-library/react-native';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { createDeferredPromise } from '@metamask/utils';
import { strings } from '../../../../../../locales/i18n';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { renderCollectiblesView } from '../../../../../../tests/component-view/renderers/collectibles';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import { PACK_PARTNER_ENVIRONMENT } from '../../providers/pack-partner/constants';
import { packPartnerQueries } from '../../services/data/packPartnerQueries';
import {
  packPartnerReads,
  createCard,
  createPack,
  MOCK_ACCOUNT,
} from '../testUtils';
import {
  CollectiblesPacksTestIds,
  CollectiblesPackCardTestIds,
} from '../../Collectibles.testIds';
import CollectiblesSearch from './CollectiblesSearch';

let queryClient: QueryClient;

function SearchWithCache() {
  const client = useQueryClient();
  useEffect(() => {
    queryClient = client;
  }, [client]);
  return <CollectiblesSearch />;
}

const inventoryKey = (environment = PACK_PARTNER_ENVIRONMENT) =>
  packPartnerQueries.getPackInventory(environment, 'visited').queryKey;
const card = createCard({ mint: 'public-inventory-card', set: 'First set' });
const inventory = (cards = [card]) => ({
  pages: [{ cards }],
  pageParams: [null],
});

const renderSearch = () =>
  renderCollectiblesView({
    entry: { Component: SearchWithCache, name: Routes.COLLECTIBLES.SEARCH },
    params: { scope: 'cards' },
  });

describeForPlatforms('Collectibles local inventory search', () => {
  beforeEach(() => {
    Object.assign(Engine.context, { CollectiblesController: {} });
  });

  it('shows pack tile skeletons until the searched catalogue arrives', async () => {
    const pack = createPack();
    const pending = createDeferredPromise<(typeof pack)[]>();
    packPartnerReads.getPacks.mockReturnValue(pending.promise);

    renderCollectiblesView({
      entry: {
        Component: CollectiblesSearch,
        name: Routes.COLLECTIBLES.SEARCH,
      },
      params: { scope: 'packs' },
    });

    expect(
      await screen.findByTestId(CollectiblesPacksTestIds.SKELETON),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesPackCardTestIds.CARD(pack.code)),
    ).not.toBeOnTheScreen();
    await act(async () => pending.resolve([pack]));
    expect(
      await screen.findByTestId(CollectiblesPackCardTestIds.CARD(pack.code)),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesPacksTestIds.SKELETON),
    ).not.toBeOnTheScreen();
  });

  it('updates visible cards when a visited inventory changes without new input', async () => {
    renderSearch();
    await waitFor(() => expect(packPartnerReads.getPacks).toHaveBeenCalled());

    act(() => {
      queryClient.setQueryData(inventoryKey(), inventory());
    });
    const tileId = `collectibles-discovery-card-${card.mint}`;
    expect(
      within(await screen.findByTestId(tileId)).getByText('First set'),
    ).toBeOnTheScreen();
    act(() => {
      queryClient.setQueryData(
        inventoryKey(),
        inventory([{ ...card, set: 'Updated set' }]),
      );
    });

    await waitFor(() =>
      expect(
        within(screen.getByTestId(tileId)).getByText('Updated set'),
      ).toBeOnTheScreen(),
    );
    expect(packPartnerReads.getPackInventory).not.toHaveBeenCalled();
    expect(packPartnerReads.getGreatestHits).not.toHaveBeenCalled();
  });

  it('removes cached public cards from search when an inventory is evicted', async () => {
    renderSearch();
    await waitFor(() => expect(packPartnerReads.getPacks).toHaveBeenCalled());
    act(() => {
      queryClient.setQueryData(inventoryKey(), inventory());
    });
    const tileId = `collectibles-discovery-card-${card.mint}`;
    await screen.findByTestId(tileId);

    act(() => queryClient.removeQueries({ queryKey: inventoryKey() }));

    await waitFor(() =>
      expect(screen.queryByTestId(tileId)).not.toBeOnTheScreen(),
    );
    expect(packPartnerReads.getPackInventory).not.toHaveBeenCalled();
    expect(packPartnerReads.getGreatestHits).not.toHaveBeenCalled();
  });

  it('excludes another network and does not infer ownership from another account', async () => {
    renderSearch();
    await waitFor(() =>
      expect(packPartnerReads.getOwnedCards).toHaveBeenCalledWith(
        MOCK_ACCOUNT.address,
      ),
    );
    const otherEnvironment =
      PACK_PARTNER_ENVIRONMENT === 'devnet' ? 'mainnet' : 'devnet';
    const otherNetworkCard = createCard({ mint: 'other-network' });
    const otherWalletCard = createCard({ mint: 'other-wallet' });

    act(() => {
      queryClient.setQueryData(inventoryKey(), inventory());
      queryClient.setQueryData(
        inventoryKey(otherEnvironment),
        inventory([otherNetworkCard]),
      );
      queryClient.setQueryData(
        packPartnerQueries.getOwnedCards(
          PACK_PARTNER_ENVIRONMENT,
          'another-account',
        ).queryKey,
        [card, otherWalletCard],
      );
    });

    const tile = await screen.findByTestId(
      `collectibles-discovery-card-${card.mint}`,
    );
    expect(
      within(tile).queryByText(strings('collectibles_discovery.owned')),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(
        `collectibles-discovery-card-${otherNetworkCard.mint}`,
      ),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(
        `collectibles-discovery-card-${otherWalletCard.mint}`,
      ),
    ).not.toBeOnTheScreen();
    expect(packPartnerReads.getPackInventory).not.toHaveBeenCalled();
    expect(packPartnerReads.getGreatestHits).not.toHaveBeenCalled();
  });
});

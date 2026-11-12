import React from 'react';
import type { RefreshControlProps } from 'react-native';
import { act, fireEvent, screen } from '@testing-library/react-native';
import {
  CollectiblesCardTileTestIds,
  CollectiblesCardsTestIds,
  CollectiblesErrorPanelTestIds,
} from '../../Collectibles.testIds';
import type { CollectiblesCard, CollectiblesErrorState } from '../../types';
import { createCard, renderWithQueryClient } from '../testUtils';
import CardsTab from './CardsTab';

// The isolated DOM renderer is validated by its dedicated browser smoke.
jest.mock('../../components/CollectiblesMotion/ReplitCollectionAmount', () =>
  jest.fn(() => null),
);

const renderCardsTab = ({
  cards = [],
  isLoading = false,
  error,
}: {
  cards?: CollectiblesCard[];
  isLoading?: boolean;
  error?: CollectiblesErrorState;
} = {}) => {
  const refetch = jest.fn().mockResolvedValue(undefined);
  const onCardPress = jest.fn();
  const onOpenPack = jest.fn();
  renderWithQueryClient(
    <CardsTab
      cardsState={{ cards, isLoading, error, refetch }}
      onCardPress={onCardPress}
      onOpenPack={onOpenPack}
    />,
  );
  return { refetch, onCardPress, onOpenPack };
};

describe('CardsTab', () => {
  it('shows a skeleton grid on first load', () => {
    renderCardsTab({ isLoading: true });

    expect(
      screen.getByTestId(CollectiblesCardsTestIds.SKELETON),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(CollectiblesCardsTestIds.FILTERS),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesCardsTestIds.TOTAL_VALUE),
    ).not.toBeOnTheScreen();
  });

  it('retains cached cards and their total during a background refresh', () => {
    renderCardsTab({
      cards: [createCard({ mint: 'cached', insuredValue: 25 })],
      isLoading: true,
    });

    expect(
      screen.queryByTestId(CollectiblesCardsTestIds.SKELETON),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(CollectiblesCardTileTestIds.TILE('cached')),
    ).toBeOnTheScreen();
    expect(screen.getByTestId(CollectiblesCardsTestIds.TOTAL_VALUE)).toHaveProp(
      'accessibilityLabel',
      '$25.00',
    );
  });

  it('renders the cards in a grid and opens a card', () => {
    const { onCardPress } = renderCardsTab({
      cards: [
        createCard({ mint: 'MintA' }),
        createCard({ mint: 'MintB' }),
        createCard({ mint: 'MintC' }),
      ],
    });

    fireEvent.press(
      screen.getByTestId(CollectiblesCardTileTestIds.TILE('MintC')),
    );

    expect(
      screen.getByTestId(CollectiblesCardTileTestIds.TILE('MintA')),
    ).toBeOnTheScreen();
    expect(onCardPress).toHaveBeenCalledWith('MintC');
  });

  it('shows the empty state with a CTA to the packs', () => {
    const { onOpenPack } = renderCardsTab();

    fireEvent.press(screen.getByTestId(CollectiblesCardsTestIds.EMPTY_CTA));

    expect(
      screen.getByTestId(CollectiblesCardsTestIds.EMPTY),
    ).toBeOnTheScreen();
    expect(onOpenPack).toHaveBeenCalledTimes(1);
  });

  it('totals insured values only, including cards without a sell offer', () => {
    renderCardsTab({
      cards: [
        createCard({ mint: 'MintA', insuredValue: 160, listedPriceUsd: 170 }),
        createCard({ mint: 'MintB', insuredValue: 40, listedPriceUsd: 30 }),
        createCard({ mint: 'MintC', insuredValue: undefined }),
      ],
    });

    expect(screen.getByTestId(CollectiblesCardsTestIds.TOTAL_VALUE)).toHaveProp(
      'accessibilityLabel',
      '$200.00',
    );
    expect(
      screen.getByTestId(CollectiblesCardsTestIds.ALL_FILTER),
    ).toHaveTextContent('All');
  });

  it('filters sellable cards without changing the collection total', () => {
    renderCardsTab({
      cards: [
        createCard({
          mint: 'available',
          insuredValue: 160,
          buyback: { status: 'available' },
        }),
        createCard({ mint: 'unknown', insuredValue: 20 }),
        createCard({
          mint: 'selling',
          insuredValue: 20,
          buyback: { status: 'available' },
          sale: { status: 'pending', amount: '17000000', updatedAt: 1 },
        }),
      ],
    });

    fireEvent(screen.getByRole('switch'), 'valueChange', true);

    expect(
      screen.getByTestId(CollectiblesCardTileTestIds.TILE('available')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesCardTileTestIds.TILE('unknown')),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesCardTileTestIds.TILE('selling')),
    ).not.toBeOnTheScreen();
    expect(screen.getByTestId(CollectiblesCardsTestIds.TOTAL_VALUE)).toHaveProp(
      'accessibilityLabel',
      '$200.00',
    );
    expect(screen.getByRole('switch')).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ checked: true }),
    );

    fireEvent.press(screen.getByTestId(CollectiblesCardsTestIds.CLEAR_FILTERS));

    expect(
      screen.getByTestId(CollectiblesCardTileTestIds.TILE('unknown')),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(CollectiblesCardTileTestIds.TILE('selling')),
    ).toBeOnTheScreen();
  });

  it('explains an empty sell filter without inviting the owner to buy more cards', () => {
    renderCardsTab({ cards: [createCard()] });

    fireEvent(screen.getByRole('switch'), 'valueChange', true);

    expect(
      screen.getByTestId(CollectiblesCardsTestIds.NO_SELL_AVAILABLE),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesCardsTestIds.EMPTY_CTA),
    ).not.toBeOnTheScreen();
  });

  it('combines category and buyback filters', () => {
    renderCardsTab({
      cards: [
        createCard({
          mint: 'pokemon',
          category: 'Pokemon',
          buyback: { status: 'available' },
        }),
        createCard({
          mint: 'onepiece',
          category: 'One Piece',
          buyback: { status: 'available' },
        }),
        createCard({ mint: 'not-eligible', category: 'Pokemon' }),
      ],
    });

    fireEvent.press(
      screen.getByTestId(CollectiblesCardsTestIds.COLLECTION_FILTER('Pokemon')),
    );
    fireEvent(screen.getByRole('switch'), 'valueChange', true);

    expect(
      screen.getByTestId(CollectiblesCardTileTestIds.TILE('pokemon')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesCardTileTestIds.TILE('onepiece')),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesCardTileTestIds.TILE('not-eligible')),
    ).not.toBeOnTheScreen();
  });

  it('shows every collection category even without owned cards', () => {
    renderCardsTab();

    expect(
      screen.getAllByRole('tab').map((tab) => tab.props.accessibilityLabel),
    ).toEqual([
      'All',
      'Pokemon',
      'One Piece',
      'Sports',
      'Dragon Ball Z',
      'Watches',
      'Others',
    ]);
  });

  it('keeps an unowned category selected and lets the user clear it', () => {
    renderCardsTab({
      cards: [createCard({ mint: 'pokemon', category: 'Pokemon' })],
    });

    fireEvent.press(
      screen.getByTestId(CollectiblesCardsTestIds.COLLECTION_FILTER('Sports')),
    );

    expect(
      screen.getByTestId(CollectiblesCardsTestIds.COLLECTION_FILTER('Sports')),
    ).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ selected: true }),
    );
    expect(
      screen.queryByTestId(CollectiblesCardTileTestIds.TILE('pokemon')),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(CollectiblesCardsTestIds.NO_SELL_AVAILABLE),
    ).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId(CollectiblesCardsTestIds.CLEAR_FILTERS));

    expect(
      screen.getByTestId(CollectiblesCardTileTestIds.TILE('pokemon')),
    ).toBeOnTheScreen();
  });

  it('keeps cached cards visible under an inline sync error with retry', () => {
    const { refetch } = renderCardsTab({
      cards: [createCard({ mint: 'MintA' })],
      error: { code: 'NETWORK_ERROR' },
    });

    fireEvent.press(screen.getByTestId(CollectiblesCardsTestIds.SYNC_RETRY));

    expect(
      screen.getByTestId(CollectiblesCardsTestIds.SYNC_ERROR),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(CollectiblesCardTileTestIds.TILE('MintA')),
    ).toBeOnTheScreen();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('shows the mapped error without cached cards', () => {
    const { refetch } = renderCardsTab({ error: { code: 'RATE_LIMITED' } });

    fireEvent.press(screen.getByTestId(CollectiblesErrorPanelTestIds.RETRY));

    expect(
      screen.getByText('Too many requests. Wait a moment and try again.'),
    ).toBeOnTheScreen();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('refetches on pull to refresh', async () => {
    const { refetch } = renderCardsTab({
      cards: [createCard({ mint: 'MintA' })],
    });

    const refreshControl: React.ReactElement<RefreshControlProps> =
      screen.getByTestId(CollectiblesCardsTestIds.LIST).props.refreshControl;
    await act(async () => {
      refreshControl.props.onRefresh?.();
    });

    expect(refetch).toHaveBeenCalledTimes(1);
  });
});

import React from 'react';
import type { RefreshControlProps } from 'react-native';
import { act, fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  GachaCardTileTestIds,
  GachaCardsTestIds,
  GachaErrorPanelTestIds,
} from '../../Gacha.testIds';
import type {
  CollectorCryptCard,
  CollectorCryptErrorState,
} from '../../providers/collector-crypt/types';
import { createCard } from '../testUtils';
import CardsTab from './CardsTab';

const renderCardsTab = ({
  cards = [],
  isLoading = false,
  error,
}: {
  cards?: CollectorCryptCard[];
  isLoading?: boolean;
  error?: CollectorCryptErrorState;
} = {}) => {
  const refetch = jest.fn().mockResolvedValue(undefined);
  const onCardPress = jest.fn();
  const onOpenPack = jest.fn();
  renderWithProvider(
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

    expect(screen.getByTestId(GachaCardsTestIds.SKELETON)).toBeOnTheScreen();
  });

  it('renders the cards in a grid and opens a card', () => {
    const { onCardPress } = renderCardsTab({
      cards: [
        createCard({ mint: 'MintA' }),
        createCard({ mint: 'MintB' }),
        createCard({ mint: 'MintC' }),
      ],
    });

    fireEvent.press(screen.getByTestId(GachaCardTileTestIds.TILE('MintC')));

    expect(
      screen.getByTestId(GachaCardTileTestIds.TILE('MintA')),
    ).toBeOnTheScreen();
    expect(onCardPress).toHaveBeenCalledWith('MintC');
  });

  it('shows the empty state with a CTA to the packs', () => {
    const { onOpenPack } = renderCardsTab();

    fireEvent.press(screen.getByTestId(GachaCardsTestIds.EMPTY_CTA));

    expect(screen.getByTestId(GachaCardsTestIds.EMPTY)).toBeOnTheScreen();
    expect(onOpenPack).toHaveBeenCalledTimes(1);
  });

  it('totals the highest available value of each card, including cards without a sell offer', () => {
    renderCardsTab({
      cards: [
        createCard({ mint: 'MintA', insuredValue: 160, listedPriceUsd: 170 }),
        createCard({ mint: 'MintB', insuredValue: 40, listedPriceUsd: 30 }),
        createCard({ mint: 'MintC', insuredValue: undefined }),
      ],
    });

    expect(screen.getByTestId(GachaCardsTestIds.TOTAL_VALUE)).toHaveTextContent(
      '$210',
    );
    expect(screen.getByTestId(GachaCardsTestIds.ALL_FILTER)).toHaveTextContent(
      'Cards (3)',
    );
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

    fireEvent.press(
      screen.getByTestId(GachaCardsTestIds.SELL_AVAILABLE_FILTER),
    );

    expect(
      screen.getByTestId(GachaCardTileTestIds.TILE('available')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(GachaCardTileTestIds.TILE('unknown')),
    ).toBeNull();
    expect(
      screen.queryByTestId(GachaCardTileTestIds.TILE('selling')),
    ).toBeNull();
    expect(screen.getByTestId(GachaCardsTestIds.TOTAL_VALUE)).toHaveTextContent(
      '$200',
    );
    expect(
      screen.getByTestId(GachaCardsTestIds.SELL_AVAILABLE_FILTER),
    ).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ selected: true }),
    );

    fireEvent.press(screen.getByTestId(GachaCardsTestIds.ALL_FILTER));

    expect(
      screen.getByTestId(GachaCardTileTestIds.TILE('unknown')),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(GachaCardTileTestIds.TILE('selling')),
    ).toBeOnTheScreen();
  });

  it('explains an empty sell filter without inviting the owner to buy more cards', () => {
    renderCardsTab({ cards: [createCard()] });

    fireEvent.press(
      screen.getByTestId(GachaCardsTestIds.SELL_AVAILABLE_FILTER),
    );

    expect(
      screen.getByTestId(GachaCardsTestIds.NO_SELL_AVAILABLE),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId(GachaCardsTestIds.EMPTY_CTA)).toBeNull();
  });

  it('keeps cached cards visible under an inline sync error with retry', () => {
    const { refetch } = renderCardsTab({
      cards: [createCard({ mint: 'MintA' })],
      error: { code: 'NETWORK_ERROR' },
    });

    fireEvent.press(screen.getByTestId(GachaCardsTestIds.SYNC_RETRY));

    expect(screen.getByTestId(GachaCardsTestIds.SYNC_ERROR)).toBeOnTheScreen();
    expect(
      screen.getByTestId(GachaCardTileTestIds.TILE('MintA')),
    ).toBeOnTheScreen();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('shows the mapped error without cached cards', () => {
    const { refetch } = renderCardsTab({ error: { code: 'RATE_LIMITED' } });

    fireEvent.press(screen.getByTestId(GachaErrorPanelTestIds.RETRY));

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
      screen.getByTestId(GachaCardsTestIds.LIST).props.refreshControl;
    await act(async () => {
      refreshControl.props.onRefresh?.();
    });

    expect(refetch).toHaveBeenCalledTimes(1);
  });
});

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

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import { collectiblesTestIds } from '#app/components/UI/Collectibles/Collectibles.testIds';
import type { PackPartnerCard } from '#app/components/UI/Collectibles/providers/pack-partner/types/packPartner';
import { buildMockCollectionCards } from '#app/components/UI/Collectibles/mocks/collection';
import { CollectionView } from '#app/components/UI/Collectibles/views/CollectionView';

let mockResult: {
  data?: PackPartnerCard[];
  isPending: boolean;
  isError: boolean;
};

jest.mock('#app/components/UI/Collectibles/hooks/useCollectionCards', () => ({
  useCollectionCards: () => mockResult,
}));

const now = 1_000_000_000_000;
const minuteMs = 60 * 1000;

function loaded(data: PackPartnerCard[]) {
  return { data, isPending: false, isError: false };
}

describe('CollectionView', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now });
    mockResult = loaded(buildMockCollectionCards(now));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the collection value', () => {
    render(<CollectionView />);

    expect(
      screen.getByTestId(collectiblesTestIds.collectionValue),
    ).toHaveTextContent('$687.00');
  });

  it('reads "All prices · Newest" by default', () => {
    render(<CollectionView />);

    expect(
      screen.getByTestId(collectiblesTestIds.collectionFilterSortLine),
    ).toHaveTextContent(
      strings('collectibles.packs.filter_sort', {
        filter: strings('collectibles.packs.all_prices'),
        sort: strings('collectibles.collection.newest'),
      }),
    );
  });

  it('filters the cards by name as the user types', () => {
    render(<CollectionView />);

    fireEvent.changeText(
      screen.getByTestId(collectiblesTestIds.collectionSearch),
      'magna',
    );

    expect(
      screen.getByTestId(collectiblesTestIds.collectionTile('card-5')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(collectiblesTestIds.collectionTile('card-1')),
    ).not.toBeOnTheScreen();
  });

  it('shows the buyback pill while the window is open', () => {
    render(<CollectionView />);

    expect(
      screen.getByText(
        strings('collectibles.collection.buyback_hours', { count: 70 }),
      ),
    ).toBeOnTheScreen();
  });

  it('hides the buyback pill when the window closes', () => {
    mockResult = loaded([
      {
        mint: 'card-1',
        name: 'Lorem ipsum',
        acquiredAt: now - 72 * 60 * minuteMs + minuteMs,
        buyback: { status: 'available' },
      },
    ]);
    render(<CollectionView />);

    act(() => jest.advanceTimersByTime(2 * minuteMs));

    expect(
      screen.queryByTestId(collectiblesTestIds.collectionBuyback('card-1')),
    ).not.toBeOnTheScreen();
  });

  it('shows a skeleton while loading', () => {
    mockResult = { isPending: true, isError: false };
    render(<CollectionView />);

    expect(
      screen.getByTestId(collectiblesTestIds.collectionSkeleton),
    ).toBeOnTheScreen();
  });

  it('opens the Packs tab from the empty state', () => {
    mockResult = loaded([]);
    const jumpTo = jest.fn();
    render(<CollectionView jumpTo={jumpTo} />);

    fireEvent.press(
      screen.getByText(strings('collectibles.collection.browse_packs')),
    );

    expect(jumpTo).toHaveBeenCalledWith('packs');
  });

  it('shows $0.00 without cards', () => {
    mockResult = loaded([]);
    render(<CollectionView />);

    expect(
      screen.getByTestId(collectiblesTestIds.collectionValue),
    ).toHaveTextContent('$0.00');
  });

  it('says no cards were found when the search has no match', () => {
    render(<CollectionView />);

    fireEvent.changeText(
      screen.getByTestId(collectiblesTestIds.collectionSearch),
      'zzz',
    );

    expect(
      screen.getByText(strings('collectibles.collection.no_results')),
    ).toBeOnTheScreen();
  });

  it('shows "-" and an error when the cards fail to load', () => {
    mockResult = { isPending: false, isError: true };
    render(<CollectionView />);

    expect(
      screen.getByTestId(collectiblesTestIds.collectionValue),
    ).toHaveTextContent('-');
    expect(
      screen.getByText(strings('collectibles.collection.error')),
    ).toBeOnTheScreen();
  });
});

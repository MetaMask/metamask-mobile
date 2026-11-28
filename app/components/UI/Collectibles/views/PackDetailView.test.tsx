import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';
import render from '#app/util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import { collectiblesTestIds } from '#app/components/UI/Collectibles/Collectibles.testIds';
import type { PackPartnerCard } from '#app/components/UI/Collectibles/providers/pack-partner/types/packPartner';
import type { PackDetail } from '#app/components/UI/Collectibles/types/packs';
import { PackDetailView } from '#app/components/UI/Collectibles/views/PackDetailView';

const mockPackRefetch = jest.fn();
const mockFetchNextPage = jest.fn();
const mockCardsRefetch = jest.fn();

const card: PackPartnerCard = {
  mint: 'card-1',
  name: 'Lorem ipsum card',
  image: 'https://example.com/card.png',
  insuredValue: 420,
  rarity: 'epic',
  acquiredAt: 0,
  buyback: { status: 'unknown' },
};

const pack: PackDetail = {
  code: 'pack-1',
  name: 'Lorem ipsum',
  category: 'Pokémon',
  tier: 1,
  priceUsd: 25,
  isAvailable: true,
  buybackRatePercent: 85,
  averageCardValueUsd: 27.5,
  topCardValueUsd: 420,
  odds: [
    { rarity: 'epic', oddsPercent: 0.5, minValueUsd: 100 },
    { rarity: 'rare', oddsPercent: 7.5, minValueUsd: 37.5, maxValueUsd: 100 },
  ],
  pulledSinceEpic: [{ rarity: 'uncommon', count: 18 }],
  activity: {
    openerName: 'Lorem',
    otherOpeners: 1240,
    pullerName: 'Ipsum',
    pulledRarity: 'rare',
  },
};

let mockPackResult: {
  data?: PackDetail;
  isPending: boolean;
  refetch: jest.Mock;
};

let mockCardsResult: {
  data?: { pages: { cards: PackPartnerCard[] }[] };
  isPending: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  isError: boolean;
  isFetchNextPageError: boolean;
  hasNextPage: boolean;
  fetchNextPage: jest.Mock;
  refetch: jest.Mock;
};

jest.mock('#app/components/UI/Collectibles/hooks/usePackDetail', () => ({
  usePackDetail: () => mockPackResult,
}));

jest.mock('#app/components/UI/Collectibles/hooks/usePackCards', () => ({
  usePackCards: () => mockCardsResult,
}));

jest.mock('#app/components/UI/Collectibles/hooks/usePackJustOpened', () => ({
  usePackJustOpened: () => ({
    data: [],
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

const openLabel = strings('collectibles.packs.open_price', { price: '$25.00' });

describe('PackDetailView', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPackResult = { data: pack, isPending: false, refetch: mockPackRefetch };
    mockCardsResult = {
      data: { pages: [{ cards: [card] }] },
      isPending: false,
      isFetching: false,
      isFetchingNextPage: false,
      isError: false,
      isFetchNextPageError: false,
      hasNextPage: false,
      fetchNextPage: mockFetchNextPage,
      refetch: mockCardsRefetch,
    };
  });

  it('shows the pack', () => {
    render(<PackDetailView packCode="pack-1" onOpenPack={jest.fn()} />);

    expect(screen.getByText('Lorem ipsum')).toBeOnTheScreen();
  });

  it('shows a skeleton while the pack loads', () => {
    mockPackResult = { ...mockPackResult, data: undefined, isPending: true };
    render(<PackDetailView packCode="pack-1" onOpenPack={jest.fn()} />);

    expect(
      screen.getByTestId(collectiblesTestIds.packDetailSkeleton),
    ).toBeOnTheScreen();
  });

  it('disables Open while the pack loads', () => {
    mockPackResult = { ...mockPackResult, data: undefined, isPending: true };
    render(<PackDetailView packCode="pack-1" onOpenPack={jest.fn()} />);

    expect(
      screen.getByTestId(collectiblesTestIds.packDetailOpen),
    ).toBeDisabled();
  });

  it('shows an error when the pack fails to load', () => {
    mockPackResult = { ...mockPackResult, data: undefined };
    render(<PackDetailView packCode="pack-1" onOpenPack={jest.fn()} />);

    expect(
      screen.getByText(strings('collectibles.pack_detail.error')),
    ).toBeOnTheScreen();
  });

  it('refetches the pack when retry is pressed', () => {
    mockPackResult = { ...mockPackResult, data: undefined };
    render(<PackDetailView packCode="pack-1" onOpenPack={jest.fn()} />);

    fireEvent.press(
      screen.getByText(strings('collectibles.pack_detail.retry')),
    );

    expect(mockPackRefetch).toHaveBeenCalled();
  });

  it('shows the price on the Open button', () => {
    render(<PackDetailView packCode="pack-1" onOpenPack={jest.fn()} />);

    expect(screen.getByText(openLabel)).toBeOnTheScreen();
  });

  it('opens the buy sheet for the pack', () => {
    const onOpenPack = jest.fn();
    render(<PackDetailView packCode="pack-1" onOpenPack={onOpenPack} />);

    fireEvent.press(screen.getByTestId(collectiblesTestIds.packDetailOpen));

    expect(onOpenPack).toHaveBeenCalledWith({
      packCode: 'pack-1',
      name: 'Lorem ipsum',
      priceUsd: 25,
    });
  });

  it('says when the pack is unavailable', () => {
    mockPackResult = {
      ...mockPackResult,
      data: { ...pack, isAvailable: false },
    };
    render(<PackDetailView packCode="pack-1" onOpenPack={jest.fn()} />);

    expect(
      screen.getByText(strings('collectibles.pack_detail.unavailable')),
    ).toBeOnTheScreen();
  });

  it('disables Open when the pack is unavailable', () => {
    mockPackResult = {
      ...mockPackResult,
      data: { ...pack, isAvailable: false },
    };
    render(<PackDetailView packCode="pack-1" onOpenPack={jest.fn()} />);

    expect(
      screen.getByTestId(collectiblesTestIds.packDetailOpen),
    ).toBeDisabled();
  });

  it('shows the cards pulled since the last epic', () => {
    render(<PackDetailView packCode="pack-1" onOpenPack={jest.fn()} />);

    expect(screen.getByText('18')).toBeOnTheScreen();
  });

  it('shows the odds of a rarity', () => {
    render(<PackDetailView packCode="pack-1" onOpenPack={jest.fn()} />);

    expect(screen.getByText('Rare · 7.5%')).toBeOnTheScreen();
  });

  it('shows the value range of a rarity', () => {
    render(<PackDetailView packCode="pack-1" onOpenPack={jest.fn()} />);

    expect(screen.getByText('$37.50 – $100.00')).toBeOnTheScreen();
  });

  it('shows an open-ended value range for the top rarity', () => {
    render(<PackDetailView packCode="pack-1" onOpenPack={jest.fn()} />);

    expect(screen.getByText('$100.00+')).toBeOnTheScreen();
  });

  it('shows the cards in the pack', () => {
    render(<PackDetailView packCode="pack-1" onOpenPack={jest.fn()} />);

    expect(
      screen.getByTestId(collectiblesTestIds.cardListItem(card.mint)),
    ).toBeOnTheScreen();
  });

  it('keeps the loaded cards when the next page fails', () => {
    mockCardsResult = {
      ...mockCardsResult,
      isError: true,
      isFetchNextPageError: true,
    };
    render(<PackDetailView packCode="pack-1" onOpenPack={jest.fn()} />);

    expect(
      screen.getByTestId(collectiblesTestIds.cardListItem(card.mint)),
    ).toBeOnTheScreen();
  });

  it('retries the next page when it fails', () => {
    mockCardsResult = {
      ...mockCardsResult,
      isError: true,
      isFetchNextPageError: true,
    };
    render(<PackDetailView packCode="pack-1" onOpenPack={jest.fn()} />);

    fireEvent.press(
      screen.getByText(strings('collectibles.pack_detail.retry')),
    );

    expect(mockFetchNextPage).toHaveBeenCalled();
  });

  it('refetches the cards when the first page fails', () => {
    mockCardsResult = { ...mockCardsResult, data: undefined, isError: true };
    render(<PackDetailView packCode="pack-1" onOpenPack={jest.fn()} />);

    fireEvent.press(
      screen.getByText(strings('collectibles.pack_detail.retry')),
    );

    expect(mockCardsRefetch).toHaveBeenCalled();
  });

  it('shows See more after a few idle seconds', () => {
    jest.useFakeTimers();
    render(<PackDetailView packCode="pack-1" onOpenPack={jest.fn()} />);

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    expect(
      screen.getByTestId(collectiblesTestIds.packDetailSeeMore),
    ).toBeOnTheScreen();
  });

  it('hides See more when the user scrolls', () => {
    jest.useFakeTimers();
    render(<PackDetailView packCode="pack-1" onOpenPack={jest.fn()} />);
    act(() => {
      jest.advanceTimersByTime(4000);
    });

    fireEvent(
      screen.getByTestId(collectiblesTestIds.packDetailList),
      'scrollBeginDrag',
    );

    expect(
      screen.queryByTestId(collectiblesTestIds.packDetailSeeMore),
    ).not.toBeOnTheScreen();
  });
});

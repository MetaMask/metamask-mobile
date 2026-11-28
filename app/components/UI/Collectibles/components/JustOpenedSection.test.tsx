import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import render from '#app/util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import { collectiblesTestIds } from '#app/components/UI/Collectibles/Collectibles.testIds';
import type { PackPartnerCard } from '#app/components/UI/Collectibles/providers/pack-partner/types/packPartner';
import { JustOpenedSection } from '#app/components/UI/Collectibles/components/JustOpenedSection';

const mockRefetch = jest.fn();

let mockResult: {
  data?: PackPartnerCard[];
  isPending: boolean;
  isError: boolean;
  refetch: jest.Mock;
};

jest.mock('#app/components/UI/Collectibles/hooks/usePackJustOpened', () => ({
  usePackJustOpened: () => mockResult,
}));

const card: PackPartnerCard = {
  mint: 'pull-1',
  name: 'Lorem ipsum',
  image: 'https://example.com/card.png',
  rarity: 'rare',
  acquiredAt: 0,
  buyback: { status: 'unknown' },
};

describe('JustOpenedSection', () => {
  beforeEach(() => {
    mockRefetch.mockClear();
    mockResult = {
      data: [card],
      isPending: false,
      isError: false,
      refetch: mockRefetch,
    };
  });

  it('shows the section title', () => {
    render(<JustOpenedSection packCode="pack-1" />);

    expect(
      screen.getByText(strings('collectibles.pack_detail.just_opened')),
    ).toBeOnTheScreen();
  });

  it('shows the latest pulls', () => {
    render(<JustOpenedSection packCode="pack-1" />);

    expect(
      screen.getByTestId(collectiblesTestIds.cardListItem(card.mint)),
    ).toBeOnTheScreen();
  });

  it('shows skeleton tiles while loading', () => {
    mockResult = { ...mockResult, data: undefined, isPending: true };
    render(<JustOpenedSection packCode="pack-1" />);

    expect(
      screen.getByTestId(collectiblesTestIds.packDetailJustOpenedSkeleton),
    ).toBeOnTheScreen();
  });

  it('shows the empty message when there are no pulls', () => {
    mockResult = { ...mockResult, data: [] };
    render(<JustOpenedSection packCode="pack-1" />);

    expect(
      screen.getByText(strings('collectibles.pack_detail.no_cards')),
    ).toBeOnTheScreen();
  });

  it('shows the error message when pulls fail to load', () => {
    mockResult = { ...mockResult, data: undefined, isError: true };
    render(<JustOpenedSection packCode="pack-1" />);

    expect(
      screen.getByText(strings('collectibles.pack_detail.cards_error')),
    ).toBeOnTheScreen();
  });

  it('refetches when retry is pressed', () => {
    mockResult = { ...mockResult, data: undefined, isError: true };
    render(<JustOpenedSection packCode="pack-1" />);

    fireEvent.press(
      screen.getByText(strings('collectibles.pack_detail.retry')),
    );

    expect(mockRefetch).toHaveBeenCalled();
  });
});

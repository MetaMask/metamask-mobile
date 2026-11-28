import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import render from '#app/util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import { collectiblesTestIds } from '#app/components/UI/Collectibles/Collectibles.testIds';
import type { PackPartnerCard } from '#app/components/UI/Collectibles/providers/pack-partner/types/packPartner';
import { CardListItem } from '#app/components/UI/Collectibles/components/CardListItem';

const card: PackPartnerCard = {
  mint: 'card-1',
  name: 'Lorem ipsum',
  image: 'https://example.com/card.png',
  grade: 'GEM-MT 10',
  gradingCompany: 'PSA',
  insuredValue: 420,
  rarity: 'rare',
  year: '2023',
  set: 'Dolor Sit',
  acquiredAt: 0,
  buyback: { status: 'unknown' },
};

describe('CardListItem', () => {
  it('shows the card name', () => {
    render(<CardListItem card={card} />);

    expect(screen.getByText('Lorem ipsum')).toBeOnTheScreen();
  });

  it('shows the year and set', () => {
    render(<CardListItem card={card} />);

    expect(screen.getByText('2023 Dolor Sit')).toBeOnTheScreen();
  });

  it('shows the value with the grade', () => {
    render(<CardListItem card={card} />);

    expect(screen.getByText('$420 · PSA GEM-MT 10')).toBeOnTheScreen();
  });

  it('shows a dash when the value is missing', () => {
    render(
      <CardListItem
        card={{
          ...card,
          insuredValue: undefined,
          grade: undefined,
          gradingCompany: undefined,
        }}
      />,
    );

    expect(
      screen.getByText(strings('collectibles.pack_detail.no_value')),
    ).toBeOnTheScreen();
  });

  it('shows the artwork fallback when there is no image', () => {
    render(<CardListItem card={{ ...card, image: undefined }} />);

    expect(
      screen.getByTestId(
        collectiblesTestIds.cardListItemArtFallback(card.mint),
      ),
    ).toBeOnTheScreen();
  });

  it('shows the artwork fallback when the image fails to load', () => {
    render(<CardListItem card={card} />);

    fireEvent(
      screen.getByTestId(collectiblesTestIds.cardListItemArt(card.mint)),
      'error',
    );

    expect(
      screen.getByTestId(
        collectiblesTestIds.cardListItemArtFallback(card.mint),
      ),
    ).toBeOnTheScreen();
  });

  it('calls onPress with the card', () => {
    const onPress = jest.fn();
    render(<CardListItem card={card} onPress={onPress} />);

    fireEvent.press(
      screen.getByTestId(collectiblesTestIds.cardListItem(card.mint)),
    );

    expect(onPress).toHaveBeenCalledWith(card);
  });

  it('is disabled without onPress', () => {
    render(<CardListItem card={card} />);

    expect(
      screen.getByTestId(collectiblesTestIds.cardListItem(card.mint)),
    ).toBeDisabled();
  });
});

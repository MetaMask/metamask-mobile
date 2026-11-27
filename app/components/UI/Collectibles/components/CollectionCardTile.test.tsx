import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import render from '#app/util/test/renderWithProvider';
import { collectiblesTestIds } from '#app/components/UI/Collectibles/Collectibles.testIds';
import type { PackPartnerCard } from '#app/components/UI/Collectibles/providers/pack-partner/types/packPartner';
import { CollectionCardTile } from '#app/components/UI/Collectibles/components/CollectionCardTile';

const card: PackPartnerCard = {
  mint: 'card-1',
  name: 'Lorem ipsum',
  insuredValue: 42,
  acquiredAt: 0,
  buyback: { status: 'unavailable' },
};

describe('CollectionCardTile', () => {
  it('shows the artwork fallback when the card has no image', () => {
    render(<CollectionCardTile card={card} />);

    expect(
      screen.getByTestId(
        collectiblesTestIds.collectionTileArtFallback(card.mint),
      ),
    ).toBeOnTheScreen();
  });

  it('shows the artwork fallback when the image fails to load', () => {
    render(
      <CollectionCardTile
        card={{ ...card, image: 'https://example.com/card.png' }}
      />,
    );

    fireEvent(
      screen.getByTestId(collectiblesTestIds.collectionTileArt(card.mint)),
      'error',
    );

    expect(
      screen.getByTestId(
        collectiblesTestIds.collectionTileArtFallback(card.mint),
      ),
    ).toBeOnTheScreen();
  });
});

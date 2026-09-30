import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  GachaCardImageTestIds,
  GachaCardTileTestIds,
} from '../../Gacha.testIds';
import { createCard } from '../../views/testUtils';
import CardTile, { getCardTileSubtitle } from './CardTile';

const CARD = createCard({ mint: 'MintA' });

describe('CardTile', () => {
  it('renders the name and the grade and value subtitle', () => {
    renderWithProvider(<CardTile card={CARD} onPress={jest.fn()} />);

    expect(screen.getByText('Charizard Holo')).toBeOnTheScreen();
    expect(screen.getByText('PSA GEM-MT 10 · $120')).toBeOnTheScreen();
  });

  it('renders the card image', async () => {
    renderWithProvider(
      <CardTile
        card={createCard({ image: 'https://example.com/card.png' })}
        onPress={jest.fn()}
      />,
    );

    await waitFor(() =>
      expect(
        screen.queryByTestId(GachaCardImageTestIds.SKELETON),
      ).not.toBeOnTheScreen(),
    );
    expect(screen.getByTestId(GachaCardImageTestIds.IMAGE)).toBeOnTheScreen();
  });

  it('calls onPress with the mint', () => {
    const onPress = jest.fn();
    renderWithProvider(<CardTile card={CARD} onPress={onPress} />);

    fireEvent.press(screen.getByTestId(GachaCardTileTestIds.TILE('MintA')));

    expect(onPress).toHaveBeenCalledWith('MintA');
  });

  it('uses the provided testID', () => {
    const onPress = jest.fn();
    renderWithProvider(
      <CardTile card={CARD} onPress={onPress} testID="home-tile" />,
    );

    fireEvent.press(screen.getByTestId('home-tile'));

    expect(onPress).toHaveBeenCalledWith('MintA');
  });

  it('shows the buyback offer tag', () => {
    renderWithProvider(
      <CardTile
        card={createCard({
          mint: 'MintA',
          buyback: { status: 'available', amount: '102000000' },
        })}
        onPress={jest.fn()}
      />,
    );

    expect(
      screen.getByTestId(GachaCardTileTestIds.BUYBACK_TAG('MintA')),
    ).toHaveTextContent('Sell 102.00 USDC');
  });

  it('shows the selling tag while a sale is pending', () => {
    renderWithProvider(
      <CardTile
        card={createCard({
          mint: 'MintA',
          buyback: { status: 'available', amount: '102000000' },
          sale: { status: 'pending', amount: '102000000', updatedAt: 1 },
        })}
        onPress={jest.fn()}
      />,
    );

    expect(
      screen.getByTestId(GachaCardTileTestIds.SELLING_TAG('MintA')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(GachaCardTileTestIds.BUYBACK_TAG('MintA')),
    ).not.toBeOnTheScreen();
  });

  it('shows the image fallback when the card has no image', () => {
    renderWithProvider(<CardTile card={createCard()} onPress={jest.fn()} />);

    expect(
      screen.getByTestId(GachaCardImageTestIds.FALLBACK),
    ).toBeOnTheScreen();
  });
});

describe('getCardTileSubtitle', () => {
  it('joins the known parts', () => {
    expect(
      getCardTileSubtitle(
        createCard({ gradingCompany: undefined, insuredValue: 45 }),
      ),
    ).toBe('GEM-MT 10 · $45');
  });

  it('returns an empty string without grade or value', () => {
    expect(
      getCardTileSubtitle(
        createCard({
          grade: undefined,
          gradingCompany: undefined,
          insuredValue: undefined,
        }),
      ),
    ).toBe('');
  });
});

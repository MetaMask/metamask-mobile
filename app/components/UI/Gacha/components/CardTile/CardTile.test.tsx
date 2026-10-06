import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  GachaCardImageTestIds,
  GachaCardTileTestIds,
} from '../../Gacha.testIds';
import { createCard } from '../../views/testUtils';
import CardTile from './CardTile';

const CARD = createCard({ mint: 'MintA' });

describe('CardTile', () => {
  it('renders the name and the insured value in USD below the card', () => {
    renderWithProvider(<CardTile card={CARD} onPress={jest.fn()} />);

    expect(
      screen.getByTestId(GachaCardTileTestIds.NAME('MintA')),
    ).toHaveTextContent('Charizard Holo');
    expect(
      screen.getByTestId(GachaCardTileTestIds.VALUE('MintA')),
    ).toHaveTextContent(/^\$120$/u);
  });

  it('shows the reflection only after the card image loads', async () => {
    renderWithProvider(
      <CardTile
        card={createCard({
          mint: 'MintA',
          image: 'https://example.com/card.png',
        })}
        onPress={jest.fn()}
      />,
    );

    expect(
      screen.queryByTestId(GachaCardTileTestIds.REFLECTION('MintA'), {
        includeHiddenElements: true,
      }),
    ).not.toBeOnTheScreen();
    await waitFor(() =>
      expect(
        screen.getByTestId(GachaCardTileTestIds.REFLECTION('MintA'), {
          includeHiddenElements: true,
        }),
      ).toBeOnTheScreen(),
    );
    expect(screen.getByTestId(GachaCardImageTestIds.IMAGE)).toBeOnTheScreen();
  });

  it('uses the medium photograph in lists when both resolutions are available', () => {
    const mediumImage = 'https://example.com/card-medium.webp';
    renderWithProvider(
      <CardTile
        card={createCard({
          image: 'https://example.com/card-original.jpg',
          mediumImage,
        })}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByTestId(GachaCardImageTestIds.IMAGE)).toHaveProp(
      'source',
      { uri: mediumImage },
    );
  });

  it('calls onPress with the mint', () => {
    const onPress = jest.fn();
    renderWithProvider(<CardTile card={CARD} onPress={onPress} />);

    fireEvent.press(screen.getByTestId(GachaCardTileTestIds.TILE('MintA')));

    expect(onPress).toHaveBeenCalledWith('MintA');
  });

  it('uses the original only if the medium photograph fails', () => {
    const image = 'https://example.com/card-original.jpg';
    renderWithProvider(
      <CardTile
        card={createCard({
          image,
          mediumImage: 'https://example.com/card-medium.webp',
        })}
        onPress={jest.fn()}
      />,
    );

    fireEvent(screen.getByTestId(GachaCardImageTestIds.IMAGE), 'error');

    expect(screen.getByTestId(GachaCardImageTestIds.IMAGE)).toHaveProp(
      'source',
      { uri: image },
    );
  });

  it('uses the provided homepage testID', () => {
    const onPress = jest.fn();
    renderWithProvider(
      <CardTile card={CARD} onPress={onPress} testID="home-tile" />,
    );

    fireEvent.press(screen.getByTestId('home-tile'));

    expect(onPress).toHaveBeenCalledWith('MintA');
  });

  it('keeps the insured value when a buyback offer is available', () => {
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
      screen.getByTestId(GachaCardTileTestIds.VALUE('MintA')),
    ).toHaveTextContent(/^\$120$/u);
    expect(
      screen.queryByText(strings('gacha.card.sell_for', { amount: '102.00' })),
    ).not.toBeOnTheScreen();
  });

  it('shows the higher listing value without substituting the buyback offer', () => {
    renderWithProvider(
      <CardTile
        card={createCard({ mint: 'MintA', listedPriceUsd: 150 })}
        onPress={jest.fn()}
      />,
    );

    expect(
      screen.getByTestId(GachaCardTileTestIds.VALUE('MintA')),
    ).toHaveTextContent(/^\$150$/u);
  });

  it('indicates a pending sale', () => {
    renderWithProvider(
      <CardTile
        card={createCard({
          mint: 'MintA',
          sale: { status: 'pending', amount: '102000000', updatedAt: 1 },
        })}
        onPress={jest.fn()}
      />,
    );

    expect(
      screen.getByTestId(GachaCardTileTestIds.SELLING_TAG('MintA')),
    ).toBeOnTheScreen();
  });

  it('omits an unknown insured value', () => {
    renderWithProvider(
      <CardTile
        card={createCard({ mint: 'MintA', insuredValue: undefined })}
        onPress={jest.fn()}
      />,
    );

    expect(
      screen.queryByTestId(GachaCardTileTestIds.VALUE('MintA')),
    ).not.toBeOnTheScreen();
  });

  it('uses the fallback without reflecting it when the card has no image', () => {
    renderWithProvider(<CardTile card={CARD} onPress={jest.fn()} />);

    expect(
      screen.getByTestId(GachaCardImageTestIds.FALLBACK),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(GachaCardTileTestIds.REFLECTION('MintA'), {
        includeHiddenElements: true,
      }),
    ).not.toBeOnTheScreen();
  });
});

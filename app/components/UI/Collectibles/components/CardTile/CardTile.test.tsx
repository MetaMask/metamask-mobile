import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import { fireEvent, screen, within } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  CollectiblesCardImageTestIds,
  CollectiblesCardTileTestIds,
} from '../../Collectibles.testIds';
import { createCard } from '../../views/testUtils';
import CardTile from './CardTile';

const CARD = createCard({ mint: 'MintA' });

describe('CardTile', () => {
  it.each([false, true])(
    'reserves image space before loading, including compact=%s tiles',
    (compact) => {
      renderWithProvider(
        <CardTile card={CARD} compact={compact} onPress={jest.fn()} />,
      );

      expect(
        screen.getByTestId(CollectiblesCardTileTestIds.ARTWORK('MintA')),
      ).toHaveStyle({
        width: '100%',
        ...(compact ? { height: 160 } : { aspectRatio: 2 / 3 }),
      });
    },
  );

  it('renders the name and the insured value in USD below the card', () => {
    renderWithProvider(<CardTile card={CARD} onPress={jest.fn()} />);

    expect(
      screen.getByTestId(CollectiblesCardTileTestIds.NAME('MintA')),
    ).toHaveTextContent('Base Set');
    expect(
      screen.getByTestId(CollectiblesCardTileTestIds.VALUE('MintA')),
    ).toHaveTextContent(/^\$120$/u);
  });

  it('uses the API name when Set metadata is absent', () => {
    renderWithProvider(
      <CardTile
        card={createCard({ mint: 'MintA', set: undefined })}
        onPress={jest.fn()}
      />,
    );

    expect(
      screen.getByTestId(CollectiblesCardTileTestIds.NAME('MintA')),
    ).toHaveTextContent(CARD.name);
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

    expect(screen.getByTestId(CollectiblesCardImageTestIds.IMAGE)).toHaveProp(
      'source',
      { uri: mediumImage },
    );
  });

  it('calls onPress with the mint', () => {
    const onPress = jest.fn();
    renderWithProvider(<CardTile card={CARD} onPress={onPress} />);

    fireEvent.press(
      screen.getByTestId(CollectiblesCardTileTestIds.TILE('MintA')),
    );

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

    fireEvent(screen.getByTestId(CollectiblesCardImageTestIds.IMAGE), 'error');

    expect(screen.getByTestId(CollectiblesCardImageTestIds.IMAGE)).toHaveProp(
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
      screen.getByTestId(CollectiblesCardTileTestIds.VALUE('MintA')),
    ).toHaveTextContent(/^\$120$/u);
    expect(
      screen.queryByText(
        strings('collectibles.card.sell_for', { amount: '102.00' }),
      ),
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
      screen.getByTestId(CollectiblesCardTileTestIds.VALUE('MintA')),
    ).toHaveTextContent(/^\$150$/u);
  });

  it('indicates a pending sale within the reserved artwork without adding a row', () => {
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
      within(
        screen.getByTestId(CollectiblesCardTileTestIds.ARTWORK('MintA')),
      ).getByTestId(CollectiblesCardTileTestIds.SELLING_TAG('MintA')),
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
      screen.queryByTestId(CollectiblesCardTileTestIds.VALUE('MintA')),
    ).not.toBeOnTheScreen();
  });

  it('uses the fallback without reflecting it when the card has no image', () => {
    renderWithProvider(<CardTile card={CARD} onPress={jest.fn()} />);

    expect(
      screen.getByTestId(CollectiblesCardImageTestIds.FALLBACK),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesCardTileTestIds.REFLECTION('MintA'), {
        includeHiddenElements: true,
      }),
    ).not.toBeOnTheScreen();
  });
});

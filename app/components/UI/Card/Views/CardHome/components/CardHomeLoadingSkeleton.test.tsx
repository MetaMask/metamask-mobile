import React from 'react';
import { render } from '@testing-library/react-native';
import { CardHomeSelectors } from '../CardHome.testIds';
import CardHomeLoadingSkeleton from './CardHomeLoadingSkeleton';

describe('CardHomeLoadingSkeleton', () => {
  it('renders the balance, card art, action tiles and manage-shaped rows', () => {
    const { getByTestId, queryByTestId } = render(<CardHomeLoadingSkeleton />);

    expect(getByTestId(CardHomeSelectors.LOADING_SKELETON)).toBeOnTheScreen();
    expect(getByTestId(CardHomeSelectors.BALANCE_HEADER)).toBeOnTheScreen();
    expect(getByTestId(CardHomeSelectors.BALANCE_SKELETON)).toBeOnTheScreen();
    expect(
      getByTestId(CardHomeSelectors.BALANCE_SUBTITLE_SKELETON),
    ).toBeOnTheScreen();
    expect(getByTestId(CardHomeSelectors.CARD_ART_SKELETON)).toBeOnTheScreen();

    for (const index of [0, 1, 2]) {
      expect(
        getByTestId(`${CardHomeSelectors.ACTION_TILE_SKELETON}-${index}`),
      ).toBeOnTheScreen();
      expect(
        getByTestId(`${CardHomeSelectors.LIST_ROW_SKELETON}-${index}`),
      ).toBeOnTheScreen();
    }

    expect(
      queryByTestId(`${CardHomeSelectors.ACTION_TILE_SKELETON}-3`),
    ).toBeNull();
    expect(
      queryByTestId(`${CardHomeSelectors.LIST_ROW_SKELETON}-3`),
    ).toBeNull();
    expect(queryByTestId(CardHomeSelectors.ADD_FUNDS_BUTTON)).toBeNull();
    expect(queryByTestId('push-provisioning-spinner')).toBeNull();
  });

  it('uses the card art aspect ratio so the skeleton matches the loaded card', () => {
    const { getByTestId } = render(<CardHomeLoadingSkeleton />);
    const cardArt = getByTestId(CardHomeSelectors.CARD_ART_SKELETON);
    const style = cardArt.props.style;
    const styleList = Array.isArray(style) ? style : [style];

    expect(styleList).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ aspectRatio: 851 / 540 }),
      ]),
    );
  });
});

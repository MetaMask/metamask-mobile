import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { createCard } from '../../views/testUtils';
import { DiscoveryCard } from './DiscoveryCard';

describe('DiscoveryCard layout', () => {
  it('reserves optional context while loading and replaces it without adding a row', () => {
    const card = createCard({ mint: 'discovery-card' });
    const captionId = `collectibles-discovery-caption-${card.mint}`;
    const { rerender } = renderWithProvider(
      <DiscoveryCard card={card} reserveCaption onPress={jest.fn()} />,
    );
    const reservedCaption = screen.getByTestId(captionId, {
      includeHiddenElements: true,
    });
    const initialStyle = reservedCaption.props.style;
    expect(reservedCaption).toHaveProp('numberOfLines', 1);
    expect(reservedCaption).toHaveProp('accessibilityElementsHidden', true);

    rerender(
      <DiscoveryCard
        card={card}
        reserveCaption
        caption="Opened just now"
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByTestId(captionId)).toHaveTextContent('Opened just now');
    expect(screen.getByTestId(captionId).props.style).toEqual(initialStyle);
    expect(screen.getByTestId(captionId)).toHaveProp(
      'accessibilityElementsHidden',
      false,
    );
  });

  it('omits the caption line in lists which never show contextual metadata', () => {
    const card = createCard({ mint: 'no-caption' });

    renderWithProvider(<DiscoveryCard card={card} onPress={jest.fn()} />);

    expect(
      screen.queryByTestId(`collectibles-discovery-caption-${card.mint}`, {
        includeHiddenElements: true,
      }),
    ).not.toBeOnTheScreen();
  });
});

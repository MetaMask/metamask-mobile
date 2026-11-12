import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { CollectiblesBuybackOfferTestIds } from '../../Collectibles.testIds';
import BuybackOffer from './BuybackOffer';

describe('BuybackOffer', () => {
  it('shows the checking state', () => {
    renderWithProvider(<BuybackOffer display={{ status: 'checking' }} />);

    expect(
      screen.getByTestId(CollectiblesBuybackOfferTestIds.CHECKING),
    ).toBeOnTheScreen();
  });

  it('shows the offer amount in USDC', () => {
    renderWithProvider(
      <BuybackOffer display={{ status: 'available', amount: '42500000' }} />,
    );

    expect(
      screen.getByTestId(CollectiblesBuybackOfferTestIds.AVAILABLE),
    ).toHaveTextContent('42.50 USDC');
    expect(screen.getByText('Instant buyback offer')).toBeOnTheScreen();
  });

  it('shows that no offer exists', () => {
    renderWithProvider(<BuybackOffer display={{ status: 'unavailable' }} />);

    expect(
      screen.getByTestId(CollectiblesBuybackOfferTestIds.UNAVAILABLE),
    ).toHaveTextContent('No buyback offer for this card.');
  });
});

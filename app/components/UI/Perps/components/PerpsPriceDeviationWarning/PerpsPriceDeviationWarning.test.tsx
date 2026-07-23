import React from 'react';
import { render } from '@testing-library/react-native';
import PerpsPriceDeviationWarning from './PerpsPriceDeviationWarning';
import { strings } from '../../../../../../locales/i18n';

describe('PerpsPriceDeviationWarning', () => {
  it('renders the price deviation message', () => {
    const { getByTestId, getByText } = render(<PerpsPriceDeviationWarning />);

    expect(getByTestId('perps-price-deviation-warning')).toBeTruthy();
    expect(
      getByText(strings('perps.price_deviation_warning.message')),
    ).toBeTruthy();
  });

  it('uses custom testID when provided', () => {
    const { getByTestId } = render(
      <PerpsPriceDeviationWarning testID="custom-price-deviation" />,
    );

    expect(getByTestId('custom-price-deviation')).toBeTruthy();
  });
});

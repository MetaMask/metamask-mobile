import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import PerpsLeverage from './PerpsLeverage';

describe('PerpsLeverage', () => {
  it('renders correctly', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <PerpsLeverage maxLeverage="10" />,
    );

    expect(getByText('10')).toBeDefined();
    expect(getByTestId('perps-leverage')).toBeDefined();
  });
});

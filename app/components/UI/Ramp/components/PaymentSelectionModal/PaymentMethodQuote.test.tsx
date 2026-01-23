import React from 'react';
import { render } from '@testing-library/react-native';
import PaymentMethodQuote from './PaymentMethodQuote';
import { ThemeContext, mockTheme } from '../../../../../util/theme';

const renderWithTheme = (component: React.ReactElement) =>
  render(
    <ThemeContext.Provider value={mockTheme}>
      {component}
    </ThemeContext.Provider>,
  );

describe('PaymentMethodQuote', () => {
  it('renders crypto and fiat amounts', () => {
    const { getByText } = renderWithTheme(
      <PaymentMethodQuote cryptoAmount="0.10596 ETH" fiatAmount="~ $499.97" />,
    );

    expect(getByText('0.10596 ETH')).toBeOnTheScreen();
    expect(getByText('~ $499.97')).toBeOnTheScreen();
  });

  it('matches snapshot', () => {
    const { toJSON } = renderWithTheme(
      <PaymentMethodQuote cryptoAmount="0.10596 ETH" fiatAmount="~ $499.97" />,
    );

    expect(toJSON()).toMatchSnapshot();
  });
});

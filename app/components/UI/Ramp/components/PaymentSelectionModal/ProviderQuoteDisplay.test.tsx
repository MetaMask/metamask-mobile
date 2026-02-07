import React from 'react';
import { render } from '@testing-library/react-native';
import ProviderQuoteDisplay from './ProviderQuoteDisplay';
import { ThemeContext, mockTheme } from '../../../../../util/theme';

jest.mock('../../../../../component-library/components/Skeleton', () => {
  const { View } = jest.requireActual('react-native');
  return {
    Skeleton: ({ width, height }: { width: number; height: number }) => (
      <View testID="skeleton" style={{ width, height }} />
    ),
  };
});

const renderWithTheme = (component: React.ReactElement) =>
  render(
    <ThemeContext.Provider value={mockTheme}>
      {component}
    </ThemeContext.Provider>,
  );

describe('ProviderQuoteDisplay', () => {
  it('matches snapshot when loading', () => {
    const { toJSON } = renderWithTheme(
      <ProviderQuoteDisplay
        cryptoAmount=""
        fiatAmount={null}
        isLoading
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches snapshot with crypto and fiat', () => {
    const { toJSON } = renderWithTheme(
      <ProviderQuoteDisplay
        cryptoAmount="0.05 ETH"
        fiatAmount="$100.00"
        isLoading={false}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches snapshot with crypto only', () => {
    const { toJSON } = renderWithTheme(
      <ProviderQuoteDisplay
        cryptoAmount="1.5 USDC"
        fiatAmount={null}
        isLoading={false}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});

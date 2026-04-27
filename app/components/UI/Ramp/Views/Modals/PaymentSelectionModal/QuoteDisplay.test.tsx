import React from 'react';
import { render } from '@testing-library/react-native';
import QuoteDisplay from './QuoteDisplay';
import { ThemeContext, mockTheme } from '../../../../../../util/theme';

jest.mock(
  '../../../../../../component-library/components-temp/Skeleton',
  () => {
    const { View } = jest.requireActual('react-native');
    return {
      Skeleton: ({ width, height }: { width: number; height: number }) => (
        <View testID="skeleton" style={{ width, height }} />
      ),
    };
  },
);

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const { View } =
    jest.requireActual<typeof import('react-native')>('react-native');
  const actual = jest.requireActual<
    typeof import('@metamask/design-system-react-native')
  >('@metamask/design-system-react-native');
  return {
    ...actual,
    Icon: ({ testID }: { testID?: string }) =>
      ReactActual.createElement(View, { testID: testID ?? 'icon' }),
  };
});

const renderWithTheme = (component: React.ReactElement) =>
  render(
    <ThemeContext.Provider value={mockTheme}>
      {component}
    </ThemeContext.Provider>,
  );

describe('QuoteDisplay', () => {
  it('renders skeleton placeholders when loading', () => {
    const { getAllByTestId } = renderWithTheme(
      <QuoteDisplay cryptoAmount="" fiatAmount={null} isLoading />,
    );
    expect(getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('renders crypto and fiat amounts', () => {
    const { getByText } = renderWithTheme(
      <QuoteDisplay
        cryptoAmount="0.05 ETH"
        fiatAmount="$100.00"
        isLoading={false}
      />,
    );
    expect(getByText('0.05 ETH')).toBeOnTheScreen();
    expect(getByText('$100.00')).toBeOnTheScreen();
  });

  it('renders crypto amount only when fiat is null', () => {
    const { getByText, queryByText } = renderWithTheme(
      <QuoteDisplay
        cryptoAmount="1.5 USDC"
        fiatAmount={null}
        isLoading={false}
      />,
    );
    expect(getByText('1.5 USDC')).toBeOnTheScreen();
    expect(queryByText('$')).not.toBeOnTheScreen();
  });

  it('renders warning icon when showWarningIcon is true', () => {
    const { getByTestId } = renderWithTheme(
      <QuoteDisplay cryptoAmount="" fiatAmount={null} showWarningIcon />,
    );
    expect(getByTestId('icon')).toBeOnTheScreen();
  });

  it('renders unavailable text when quote is unavailable', () => {
    const { getByText } = renderWithTheme(
      <QuoteDisplay cryptoAmount="" fiatAmount={null} quoteUnavailable />,
    );
    expect(getByText('Quote unavailable.')).toBeOnTheScreen();
  });
});

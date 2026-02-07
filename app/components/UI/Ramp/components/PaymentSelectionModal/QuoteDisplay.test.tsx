import React from 'react';
import { render } from '@testing-library/react-native';
import QuoteDisplay from './QuoteDisplay';
import { ThemeContext, mockTheme } from '../../../../../util/theme';

jest.mock('../../../../../component-library/components/Skeleton', () => {
  const { View } = jest.requireActual('react-native');
  return {
    Skeleton: ({ width, height }: { width: number; height: number }) => (
      <View testID="skeleton" style={{ width, height }} />
    ),
  };
});

jest.mock('../../../../../component-library/components/Icons/Icon', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID?: string }) => (
      <View testID={testID ?? 'icon'} />
    ),
  };
});

const renderWithTheme = (component: React.ReactElement) =>
  render(
    <ThemeContext.Provider value={mockTheme}>
      {component}
    </ThemeContext.Provider>,
  );

describe('QuoteDisplay', () => {
  it('matches snapshot when loading', () => {
    const { toJSON } = renderWithTheme(
      <QuoteDisplay cryptoAmount="" fiatAmount={null} isLoading />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches snapshot with crypto and fiat', () => {
    const { toJSON } = renderWithTheme(
      <QuoteDisplay
        cryptoAmount="0.05 ETH"
        fiatAmount="$100.00"
        isLoading={false}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches snapshot with warning icon', () => {
    const { toJSON } = renderWithTheme(
      <QuoteDisplay
        cryptoAmount=""
        fiatAmount={null}
        showWarningIcon
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});

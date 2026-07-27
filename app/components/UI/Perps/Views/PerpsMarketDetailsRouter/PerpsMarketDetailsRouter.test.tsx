import React from 'react';
import { render } from '@testing-library/react-native';
import PerpsMarketDetailsRouter from './PerpsMarketDetailsRouter';
import { usePerpsProModeEnabled } from './usePerpsProModeEnabled';

jest.mock('./usePerpsProModeEnabled');

jest.mock('../PerpsProMarketView', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <View testID="mock-pro-market-view" />,
  };
});

jest.mock('../PerpsMarketDetailsView', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <View testID="mock-lite-market-details-view" />,
  };
});

const mockUsePerpsProModeEnabled = jest.mocked(usePerpsProModeEnabled);

describe('PerpsMarketDetailsRouter', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders PerpsProMarketView when Pro mode is enabled', () => {
    mockUsePerpsProModeEnabled.mockReturnValue(true);

    const { getByTestId, queryByTestId } = render(<PerpsMarketDetailsRouter />);

    expect(getByTestId('mock-pro-market-view')).toBeOnTheScreen();
    expect(
      queryByTestId('mock-lite-market-details-view'),
    ).not.toBeOnTheScreen();
  });

  it('renders PerpsMarketDetailsView when Pro mode is disabled', () => {
    mockUsePerpsProModeEnabled.mockReturnValue(false);

    const { getByTestId, queryByTestId } = render(<PerpsMarketDetailsRouter />);

    expect(getByTestId('mock-lite-market-details-view')).toBeOnTheScreen();
    expect(queryByTestId('mock-pro-market-view')).not.toBeOnTheScreen();
  });
});

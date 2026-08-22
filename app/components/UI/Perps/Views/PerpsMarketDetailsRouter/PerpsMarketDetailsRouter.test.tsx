import React from 'react';
import { render } from '@testing-library/react-native';
import PerpsMarketDetailsRouter from './PerpsMarketDetailsRouter';
import { usePerpsProModeEnabled } from './usePerpsProModeEnabled';

jest.mock('./usePerpsProModeEnabled');

const mockUseRoute = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useRoute: () => mockUseRoute(),
}));

const mockSafeAreaMount = jest.fn();
const mockProProps = jest.fn();
const mockLiteProps = jest.fn();

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  const ActualReact = jest.requireActual('react');
  return {
    ...jest.requireActual('react-native-safe-area-context'),
    SafeAreaView: ({ children, ...props }: { children?: React.ReactNode }) => {
      ActualReact.useEffect(() => mockSafeAreaMount(), []);
      return (
        <View testID="safe-area-container" {...props}>
          {children}
        </View>
      );
    },
  };
});

jest.mock('../PerpsProMarketView', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: object) => {
      mockProProps(props);
      return <View testID="mock-pro-market-view" />;
    },
  };
});

jest.mock('../PerpsMarketDetailsView', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: object) => {
      mockLiteProps(props);
      return <View testID="mock-lite-market-details-view" />;
    },
  };
});

const mockUsePerpsProModeEnabled = jest.mocked(usePerpsProModeEnabled);

describe('PerpsMarketDetailsRouter', () => {
  beforeEach(() => {
    mockUseRoute.mockReturnValue({
      params: { market: { symbol: 'ETH' } },
    });
  });

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

  it('applies every safe-area edge around the rendered layout', () => {
    mockUsePerpsProModeEnabled.mockReturnValue(false);

    const { getByTestId } = render(<PerpsMarketDetailsRouter />);

    expect(getByTestId('safe-area-container')).toHaveProp('edges', [
      'top',
      'bottom',
      'left',
      'right',
    ]);
  });

  it('keeps the safe-area container mounted across a mode switch', () => {
    mockUsePerpsProModeEnabled.mockReturnValue(false);

    const { rerender, getByTestId } = render(<PerpsMarketDetailsRouter />);
    mockUsePerpsProModeEnabled.mockReturnValue(true);
    rerender(<PerpsMarketDetailsRouter />);

    expect(getByTestId('mock-pro-market-view')).toBeOnTheScreen();
    // Remounting it would re-run the native inset layout pass, dropping the
    // header under the status bar until that pass lands.
    expect(mockSafeAreaMount).toHaveBeenCalledTimes(1);
    expect(mockProProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ generationTrigger: 'mode_switch' }),
    );
  });

  it('forwards an explicit header-picker market switch trigger', () => {
    mockUsePerpsProModeEnabled.mockReturnValue(true);
    mockUseRoute.mockReturnValue({
      params: {
        market: { symbol: 'BTC' },
        detailGenerationTrigger: 'market_switch',
      },
    });

    render(<PerpsMarketDetailsRouter />);

    expect(mockProProps).toHaveBeenCalledWith(
      expect.objectContaining({ generationTrigger: 'market_switch' }),
    );
  });

  it('consumes the header-picker trigger before a later mode switch', () => {
    mockUsePerpsProModeEnabled.mockReturnValue(true);
    mockUseRoute.mockReturnValue({
      params: {
        market: { symbol: 'BTC' },
        detailGenerationTrigger: 'market_switch',
      },
    });
    const { rerender } = render(<PerpsMarketDetailsRouter />);

    mockUsePerpsProModeEnabled.mockReturnValue(false);
    rerender(<PerpsMarketDetailsRouter />);

    expect(mockLiteProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ generationTrigger: 'mode_switch' }),
    );
  });
});

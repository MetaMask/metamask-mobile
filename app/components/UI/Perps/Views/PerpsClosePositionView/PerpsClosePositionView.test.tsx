import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import PerpsClosePositionView from './PerpsClosePositionView';
import {
  usePerpsClosePosition,
  usePerpsOrderFees,
  usePerpsClosePositionValidation,
  useMinimumOrderAmount,
} from '../../hooks';
import { usePerpsLivePrices } from '../../hooks/stream';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { usePerpsScreenTracking } from '../../hooks/usePerpsScreenTracking';

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

// Mock hooks
jest.mock('../../hooks', () => ({
  usePerpsClosePosition: jest.fn(),
  usePerpsOrderFees: jest.fn(),
  usePerpsClosePositionValidation: jest.fn(),
  useMinimumOrderAmount: jest.fn(),
}));

jest.mock('../../hooks/stream', () => ({
  usePerpsLivePrices: jest.fn(),
}));

jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: jest.fn(),
}));

jest.mock('../../hooks/usePerpsScreenTracking', () => ({
  usePerpsScreenTracking: jest.fn(),
}));

// Mock UI components - return actual React components
jest.mock('../../../../Base/Keypad', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const MockReact = require('react');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ({ children, ...props }: any) =>
    MockReact.createElement('Keypad', props, children);
});

jest.mock('../../components/PerpsSlider/PerpsSlider', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const MockReact = require('react');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ({ children, ...props }: any) =>
    MockReact.createElement('PerpsSlider', props, children);
});

jest.mock('../../components/PerpsAmountDisplay', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const MockReact = require('react');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ({ children, ...props }: any) =>
    MockReact.createElement('PerpsAmountDisplay', props, children);
});

jest.mock('../../components/PerpsOrderTypeBottomSheet', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const MockReact = require('react');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ({ children, ...props }: any) =>
    MockReact.createElement('PerpsOrderTypeBottomSheet', props, children);
});

jest.mock('../../components/PerpsLimitPriceBottomSheet', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const MockReact = require('react');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ({ children, ...props }: any) =>
    MockReact.createElement('PerpsLimitPriceBottomSheet', props, children);
});

jest.mock('../../components/PerpsBottomSheetTooltip', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const MockReact = require('react');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ({ children, ...props }: any) =>
    MockReact.createElement('PerpsBottomSheetTooltip', props, children);
});

// Mock theme
jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      text: { default: '#000', alternative: '#666' },
      primary: { default: '#037DD6' },
      error: { default: '#FF0000' },
      warning: { default: '#FFD33D' },
      background: { default: '#FFF' },
    },
    themeAppearance: 'light',
  }),
}));

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

// Mock SafeAreaView
jest.mock('react-native-safe-area-context', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SafeAreaView: ({ children }: any) => children,
}));

describe('PerpsClosePositionView', () => {
  const mockNavigation = {
    goBack: jest.fn(),
    navigate: jest.fn(),
  };

  const mockPosition = {
    coin: 'BTC',
    size: '1.5',
    entryPrice: '50000',
    leverage: { value: 10 },
    unrealizedPnl: '500',
  };

  const mockRoute = {
    params: {
      position: mockPosition,
    },
  };

  const mockTrack = jest.fn();
  const mockHandleClosePosition = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
    (useRoute as jest.Mock).mockReturnValue(mockRoute);

    (usePerpsEventTracking as jest.Mock).mockReturnValue({
      track: mockTrack,
    });

    (usePerpsScreenTracking as jest.Mock).mockReturnValue(undefined);

    (usePerpsLivePrices as jest.Mock).mockReturnValue({
      BTC: { price: '51000' },
    });

    (useMinimumOrderAmount as jest.Mock).mockReturnValue({
      minimumOrderAmount: 10,
    });

    (usePerpsOrderFees as jest.Mock).mockReturnValue({
      totalFee: 50,
      metamaskFee: 25,
      protocolFee: 25,
      metamaskFeeRate: 0.0005,
      protocolFeeRate: 0.0005,
    });

    (usePerpsClosePositionValidation as jest.Mock).mockReturnValue({
      errors: [],
      warnings: [],
      isValid: true,
      isValidating: false,
    });

    (usePerpsClosePosition as jest.Mock).mockReturnValue({
      handleClosePosition: mockHandleClosePosition,
      isClosing: false,
    });
  });

  it('should render successfully', () => {
    const { getByText } = render(<PerpsClosePositionView />);
    expect(getByText('perps.close_position.title')).toBeTruthy();
  });

  it('should track screen view event', async () => {
    render(<PerpsClosePositionView />);

    await waitFor(() => {
      expect(mockTrack).toHaveBeenCalled();
    });
  });

  it('should calculate position values correctly', () => {
    render(<PerpsClosePositionView />);

    // Verify validation hook receives correct calculations
    expect(usePerpsClosePositionValidation).toHaveBeenCalledWith(
      expect.objectContaining({
        coin: 'BTC',
        closePercentage: 100,
        orderType: 'market',
        currentPrice: 51000,
        positionValue: 1.5 * 51000,
        minimumOrderAmount: 10,
      }),
    );
  });

  it('should handle short positions', () => {
    const shortPosition = {
      ...mockPosition,
      size: '-1.5',
    };

    (useRoute as jest.Mock).mockReturnValue({
      params: { position: shortPosition },
    });

    render(<PerpsClosePositionView />);

    // Should handle negative size correctly
    expect(usePerpsClosePositionValidation).toHaveBeenCalledWith(
      expect.objectContaining({
        positionSize: 1.5, // Absolute value
      }),
    );
  });

  it('should display validation errors', () => {
    (usePerpsClosePositionValidation as jest.Mock).mockReturnValue({
      errors: ['perps.close_position.negative_receive_amount'],
      warnings: [],
      isValid: false,
      isValidating: false,
    });

    const { getByText } = render(<PerpsClosePositionView />);
    expect(
      getByText('perps.close_position.negative_receive_amount'),
    ).toBeTruthy();
  });

  it('should display validation warnings', () => {
    (usePerpsClosePositionValidation as jest.Mock).mockReturnValue({
      errors: [],
      warnings: ['perps.order.validation.limit_price_far_warning'],
      isValid: true,
      isValidating: false,
    });

    const { getByText } = render(<PerpsClosePositionView />);
    expect(
      getByText('perps.order.validation.limit_price_far_warning'),
    ).toBeTruthy();
  });

  it('should handle position with no leverage', () => {
    const noLeveragePosition = {
      ...mockPosition,
      leverage: undefined,
    };

    (useRoute as jest.Mock).mockReturnValue({
      params: { position: noLeveragePosition },
    });

    render(<PerpsClosePositionView />);

    // Should use default leverage of 1
    expect(usePerpsClosePositionValidation).toHaveBeenCalled();
  });

  it('should use entry price when live price unavailable', () => {
    (usePerpsLivePrices as jest.Mock).mockReturnValue({
      BTC: { price: null },
    });

    render(<PerpsClosePositionView />);

    // Should fall back to entry price
    expect(usePerpsClosePositionValidation).toHaveBeenCalledWith(
      expect.objectContaining({
        currentPrice: 50000,
      }),
    );
  });

  it('should calculate fees correctly', () => {
    render(<PerpsClosePositionView />);

    expect(usePerpsOrderFees).toHaveBeenCalledWith(
      expect.objectContaining({
        orderType: 'market',
        isMaker: false,
      }),
    );
  });

  it('should handle closing state', () => {
    (usePerpsClosePosition as jest.Mock).mockReturnValue({
      handleClosePosition: mockHandleClosePosition,
      isClosing: true,
    });

    render(<PerpsClosePositionView />);
    // Component should render in loading state
    expect(usePerpsClosePosition).toHaveBeenCalled();
  });

  it('should handle validation in progress', () => {
    (usePerpsClosePositionValidation as jest.Mock).mockReturnValue({
      errors: [],
      warnings: [],
      isValid: false,
      isValidating: true,
    });

    render(<PerpsClosePositionView />);
    // Component should handle validation loading state
    expect(usePerpsClosePositionValidation).toHaveBeenCalled();
  });

  it('should handle zero PnL positions', () => {
    const zeroPnLPosition = {
      ...mockPosition,
      unrealizedPnl: '0',
    };

    (useRoute as jest.Mock).mockReturnValue({
      params: { position: zeroPnLPosition },
    });

    render(<PerpsClosePositionView />);

    // Should handle zero PnL correctly
    expect(usePerpsClosePositionValidation).toHaveBeenCalled();
  });

  it('should handle partial close calculations', () => {
    render(<PerpsClosePositionView />);

    // Initial render is 100% close (not partial)
    expect(usePerpsClosePositionValidation).toHaveBeenCalledWith(
      expect.objectContaining({
        isPartialClose: false,
        remainingPositionValue: 0,
      }),
    );
  });

  it('should validate with minimum order amount', () => {
    render(<PerpsClosePositionView />);

    expect(usePerpsClosePositionValidation).toHaveBeenCalledWith(
      expect.objectContaining({
        minimumOrderAmount: 10,
      }),
    );
  });

  it('should provide close amount for validation', () => {
    render(<PerpsClosePositionView />);

    expect(usePerpsClosePositionValidation).toHaveBeenCalledWith(
      expect.objectContaining({
        closeAmount: expect.any(String),
      }),
    );
  });
});

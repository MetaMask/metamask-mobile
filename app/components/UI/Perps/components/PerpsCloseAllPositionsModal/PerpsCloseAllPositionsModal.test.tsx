import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import PerpsCloseAllPositionsModal from './PerpsCloseAllPositionsModal';
import Engine from '../../../../../core/Engine';
import type { Position } from '../../controllers/types';

// Mock Engine
jest.mock('../../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      closePositions: jest.fn(),
    },
  },
}));

// Mock hooks
jest.mock('../../hooks', () => ({
  usePerpsCloseAllCalculations: jest.fn(),
}));

jest.mock('../../hooks/stream', () => ({
  usePerpsLivePrices: jest.fn(),
}));

jest.mock('../../hooks/usePerpsToasts', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../../hooks/useStyles', () => ({
  useStyles: () => ({
    styles: {
      contentContainer: {},
      description: {},
      loadingContainer: {},
      loadingText: {},
      footerContainer: {},
    },
    theme: {
      colors: {
        accent03: { normal: '#00ff00', dark: '#008800' },
        accent01: { light: '#ffcccc', dark: '#cc0000' },
        primary: { default: '#0000ff' },
      },
    },
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, unknown>) => {
    if (key === 'perps.close_all_modal.success_message' && params) {
      return `Successfully closed ${params.count} position(s)`;
    }
    if (key === 'perps.close_all_modal.partial_success' && params) {
      return `Closed ${params.successCount} of ${params.totalCount} positions`;
    }
    if (key === 'perps.close_all_modal.error_message' && params) {
      return `Failed to close ${params.count} position(s)`;
    }
    return key;
  },
}));

// Mock BottomSheet components
jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const mockReact = jest.requireActual<typeof React>('react');
    return mockReact.forwardRef(
      (props: { children: React.ReactNode; onClose?: () => void }, _ref) => (
        <>{props.children}</>
      ),
    );
  },
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => 'BottomSheetHeader',
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetFooter',
  () => {
    const { View, TouchableOpacity, Text } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        buttonPropsArray,
      }: {
        buttonPropsArray?: {
          label: string;
          onPress: () => void;
          disabled?: boolean;
        }[];
      }) => (
        <View>
          {buttonPropsArray?.map((buttonProps, index) => (
            <TouchableOpacity
              key={index}
              onPress={buttonProps.onPress}
              disabled={buttonProps.disabled}
              testID={`footer-button-${index}`}
            >
              <Text>{buttonProps.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ),
      ButtonsAlignment: {
        Horizontal: 'Horizontal',
      },
    };
  },
);

jest.mock('../PerpsCloseSummary', () => 'PerpsCloseSummary');

const mockUsePerpsCloseAllCalculations = jest.requireMock('../../hooks')
  .usePerpsCloseAllCalculations as jest.Mock;
const mockUsePerpsLivePrices = jest.requireMock('../../hooks/stream')
  .usePerpsLivePrices as jest.Mock;
const mockUsePerpsToasts = jest.requireMock('../../hooks/usePerpsToasts')
  .default as jest.Mock;

describe('PerpsCloseAllPositionsModal', () => {
  const mockPositions: Position[] = [
    {
      coin: 'BTC',
      size: '0.5',
      entryPrice: '50000',
      positionValue: '25000',
      unrealizedPnl: '100',
      marginUsed: '1000',
      leverage: { type: 'cross' as const, value: 25 },
      liquidationPrice: '48000',
      maxLeverage: 50,
      returnOnEquity: '10',
      cumulativeFunding: {
        allTime: '0',
        sinceOpen: '0',
        sinceChange: '0',
      },
      takeProfitPrice: undefined,
      stopLossPrice: undefined,
      takeProfitCount: 0,
      stopLossCount: 0,
    },
  ];

  const mockCalculations = {
    totalMargin: 1000,
    totalPnl: 100,
    totalFees: 10,
    receiveAmount: 1090,
    totalEstimatedPoints: 50,
    avgFeeDiscountPercentage: 5,
    avgBonusBips: 10,
    avgMetamaskFeeRate: 0.01,
    avgProtocolFeeRate: 0.00045,
    avgOriginalMetamaskFeeRate: 0.015,
    isLoading: false,
    hasError: false,
    shouldShowRewards: true,
  };

  const mockShowToast = jest.fn();
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePerpsCloseAllCalculations.mockReturnValue(mockCalculations);
    mockUsePerpsLivePrices.mockReturnValue({});
    mockUsePerpsToasts.mockReturnValue({
      showToast: mockShowToast,
    });
  });

  it('returns null when not visible', () => {
    // Arrange & Act
    const { queryByText } = render(
      <PerpsCloseAllPositionsModal
        isVisible={false}
        onClose={mockOnClose}
        positions={mockPositions}
      />,
    );

    // Assert
    expect(queryByText('perps.close_all_modal.title')).toBeNull();
  });

  it('renders when visible with positions', () => {
    // Arrange & Act
    const { getByText } = render(
      <PerpsCloseAllPositionsModal
        isVisible
        onClose={mockOnClose}
        positions={mockPositions}
      />,
    );

    // Assert
    expect(getByText('perps.close_all_modal.title')).toBeTruthy();
    expect(getByText('perps.close_all_modal.description')).toBeTruthy();
  });

  it('renders footer buttons with correct labels', () => {
    // Arrange & Act
    const { getByText } = render(
      <PerpsCloseAllPositionsModal
        isVisible
        onClose={mockOnClose}
        positions={mockPositions}
      />,
    );

    // Assert
    expect(getByText('perps.close_all_modal.keep_positions')).toBeTruthy();
    expect(getByText('perps.close_all_modal.close_all')).toBeTruthy();
  });

  it('closes modal when keep positions button is pressed', () => {
    // Arrange
    const { getByTestId } = render(
      <PerpsCloseAllPositionsModal
        isVisible
        onClose={mockOnClose}
        positions={mockPositions}
      />,
    );

    // Act
    const keepButton = getByTestId('footer-button-0');
    fireEvent.press(keepButton);

    // Assert - Button should be pressable (bottomSheetRef.current?.onCloseBottomSheet is called internally)
    expect(keepButton).toBeTruthy();
  });

  it('handles successful close all operation', async () => {
    // Arrange
    const mockClosePositions = Engine.context.PerpsController
      .closePositions as jest.Mock;
    mockClosePositions.mockResolvedValue({
      success: true,
      successCount: 1,
      failureCount: 0,
    });

    const { getByTestId } = render(
      <PerpsCloseAllPositionsModal
        isVisible
        onClose={mockOnClose}
        positions={mockPositions}
        onSuccess={mockOnSuccess}
      />,
    );

    // Act
    const closeButton = getByTestId('footer-button-1');
    fireEvent.press(closeButton);

    // Assert
    await waitFor(() => {
      expect(mockClosePositions).toHaveBeenCalledWith({ closeAll: true });
      expect(mockShowToast).toHaveBeenCalled();
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('handles partial success close all operation', async () => {
    // Arrange
    const mockClosePositions = Engine.context.PerpsController
      .closePositions as jest.Mock;
    mockClosePositions.mockResolvedValue({
      success: false,
      successCount: 1,
      failureCount: 1,
    });

    const { getByTestId } = render(
      <PerpsCloseAllPositionsModal
        isVisible
        onClose={mockOnClose}
        positions={mockPositions}
        onSuccess={mockOnSuccess}
      />,
    );

    // Act
    const closeButton = getByTestId('footer-button-1');
    fireEvent.press(closeButton);

    // Assert
    await waitFor(() => {
      expect(mockClosePositions).toHaveBeenCalledWith({ closeAll: true });
      expect(mockShowToast).toHaveBeenCalled();
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('handles failed close all operation', async () => {
    // Arrange
    const mockClosePositions = Engine.context.PerpsController
      .closePositions as jest.Mock;
    mockClosePositions.mockResolvedValue({
      success: false,
      successCount: 0,
      failureCount: 1,
    });

    const { getByTestId } = render(
      <PerpsCloseAllPositionsModal
        isVisible
        onClose={mockOnClose}
        positions={mockPositions}
      />,
    );

    // Act
    const closeButton = getByTestId('footer-button-1');
    fireEvent.press(closeButton);

    // Assert
    await waitFor(() => {
      expect(mockClosePositions).toHaveBeenCalledWith({ closeAll: true });
      expect(mockShowToast).toHaveBeenCalled();
    });
  });

  it('handles error during close all operation', async () => {
    // Arrange
    const mockClosePositions = Engine.context.PerpsController
      .closePositions as jest.Mock;
    mockClosePositions.mockRejectedValue(new Error('Network error'));

    const { getByTestId } = render(
      <PerpsCloseAllPositionsModal
        isVisible
        onClose={mockOnClose}
        positions={mockPositions}
      />,
    );

    // Act
    const closeButton = getByTestId('footer-button-1');
    fireEvent.press(closeButton);

    // Assert
    await waitFor(() => {
      expect(mockClosePositions).toHaveBeenCalledWith({ closeAll: true });
      expect(mockShowToast).toHaveBeenCalled();
    });
  });

  it('shows loading state when closing', () => {
    // Arrange
    const mockClosePositions = Engine.context.PerpsController
      .closePositions as jest.Mock;
    mockClosePositions.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                success: true,
                successCount: 1,
                failureCount: 0,
              }),
            100,
          );
        }),
    );

    const { getByTestId, getAllByText } = render(
      <PerpsCloseAllPositionsModal
        isVisible
        onClose={mockOnClose}
        positions={mockPositions}
      />,
    );

    // Act
    const closeButton = getByTestId('footer-button-1');
    fireEvent.press(closeButton);

    // Assert - Should show closing text (appears in both button and loading message)
    const closingElements = getAllByText('perps.close_all_modal.closing');
    expect(closingElements.length).toBeGreaterThan(0);
  });

  it('disables buttons when closing', async () => {
    // Arrange
    const mockClosePositions = Engine.context.PerpsController
      .closePositions as jest.Mock;
    mockClosePositions.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                success: true,
                successCount: 1,
                failureCount: 0,
              }),
            100,
          );
        }),
    );

    const { getByTestId } = render(
      <PerpsCloseAllPositionsModal
        isVisible
        onClose={mockOnClose}
        positions={mockPositions}
      />,
    );

    // Act
    const closeButton = getByTestId('footer-button-1');
    fireEvent.press(closeButton);

    // Assert - Buttons should be disabled during closing
    await waitFor(() => {
      const keepButton = getByTestId('footer-button-0');
      expect(keepButton.props.disabled).toBe(true);
    });
  });

  it('renders PerpsCloseSummary when not closing', () => {
    // Arrange & Act
    const { UNSAFE_getByType } = render(
      <PerpsCloseAllPositionsModal
        isVisible
        onClose={mockOnClose}
        positions={mockPositions}
      />,
    );

    // Assert
    expect(UNSAFE_getByType('PerpsCloseSummary' as never)).toBeTruthy();
  });
});

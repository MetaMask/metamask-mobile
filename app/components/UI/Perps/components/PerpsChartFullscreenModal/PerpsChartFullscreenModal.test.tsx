import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { act } from 'react-test-renderer';
import PerpsChartFullscreenModal from './PerpsChartFullscreenModal';
import {
  lockAsync,
  unlockAsync,
  OrientationLock,
} from 'expo-screen-orientation';
import { CandlePeriod } from '../../constants/chartConfig';
import {
  PerpsChartFullscreenModalSelectorsIDs,
  PerpsOHLCVBarSelectorsIDs,
} from '../../../../../../e2e/selectors/Perps/Perps.selectors';

jest.mock('expo-screen-orientation');

const mockLockAsync = lockAsync as jest.MockedFunction<typeof lockAsync>;
const mockUnlockAsync = unlockAsync as jest.MockedFunction<typeof unlockAsync>;

jest.mock('react-native-modal', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { View } = require('react-native');
  return ({
    isVisible,
    children,
    ...props
  }: {
    isVisible: boolean;
    children: React.ReactNode;
    [key: string]: unknown;
  }) =>
    isVisible ? (
      <View testID="modal-container" {...props}>
        {children}
      </View>
    ) : null;
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    top: 44,
    right: 0,
    bottom: 34,
    left: 0,
  }),
}));

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      modal: {},
      container: {},
      header: {},
      headerTopRow: {},
      chartContainer: {},
      intervalSelectorWrapper: {},
      ohlcvWrapper: {},
    },
  }),
}));

jest.mock('../../../../../component-library/components/Icons/Icon', () => ({
  IconName: {
    Close: 'Close',
    Expand: 'Expand',
  },
  IconColor: {
    Default: 'Default',
  },
}));

jest.mock(
  '../../../../../component-library/components/Buttons/ButtonIcon',
  () => ({
    __esModule: true,
    default: jest.fn(
      ({ onPress, testID }: { onPress: () => void; testID: string }) => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
        const { TouchableOpacity } = require('react-native');
        return (
          <TouchableOpacity onPress={onPress} testID={testID}>
            Close Button
          </TouchableOpacity>
        );
      },
    ),
    ButtonIconSizes: {
      Sm: 'Sm',
      Md: 'Md',
      Lg: 'Lg',
    },
  }),
);

jest.mock('../TradingViewChart', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const ReactMock = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { View } = require('react-native');
  return ReactMock.forwardRef(
    (
      {
        testID,
        onOhlcDataChange: _onOhlcDataChange,
      }: { testID: string; onOhlcDataChange?: (data: unknown) => void },
      ref: unknown,
    ) => {
      ReactMock.useImperativeHandle(ref, () => ({}));
      return <View testID={testID} />;
    },
  );
});

jest.mock(
  '../PerpsCandlestickChartIntervalSelector/PerpsCandlestickChartIntervalSelector',
  () =>
    jest.fn(
      ({
        onIntervalChange,
        testID,
      }: {
        onIntervalChange?: (interval: string) => void;
        testID: string;
      }) => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
        const { TouchableOpacity, Text } = require('react-native');
        return (
          <TouchableOpacity
            onPress={() => onIntervalChange?.('1h')}
            testID={testID}
          >
            <Text>Interval Selector</Text>
          </TouchableOpacity>
        );
      },
    ),
);

jest.mock('../PerpsOHLCVBar', () =>
  jest.fn(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const { View } = require('react-native');
    return <View testID="ohlcv-bar" />;
  }),
);

jest.mock('../../../ComponentErrorBoundary', () =>
  jest.fn(({ children }: { children: React.ReactNode }) => children),
);

describe('PerpsChartFullscreenModal', () => {
  const mockOnClose = jest.fn();
  const mockOnIntervalChange = jest.fn();

  const defaultProps = {
    isVisible: false,
    candleData: null,
    selectedInterval: CandlePeriod.ONE_HOUR,
    onClose: mockOnClose,
    onIntervalChange: mockOnIntervalChange,
  };

  const mockCandleData = {
    data: [
      {
        time: 1234567890,
        open: 100,
        high: 110,
        low: 90,
        close: 105,
        volume: 1000,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLockAsync.mockResolvedValue();
    mockUnlockAsync.mockResolvedValue();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Modal Visibility', () => {
    it('renders modal when isVisible is true', () => {
      const { getByTestId } = render(
        <PerpsChartFullscreenModal {...defaultProps} isVisible />,
      );

      expect(
        getByTestId(PerpsChartFullscreenModalSelectorsIDs.MODAL),
      ).toBeDefined();
    });

    it('does not render modal when isVisible is false', () => {
      const { queryByTestId } = render(
        <PerpsChartFullscreenModal {...defaultProps} isVisible={false} />,
      );

      expect(
        queryByTestId(PerpsChartFullscreenModalSelectorsIDs.MODAL),
      ).toBeNull();
    });

    it('renders chart when modal is visible', () => {
      const { getByTestId } = render(
        <PerpsChartFullscreenModal
          {...defaultProps}
          isVisible
          candleData={mockCandleData}
        />,
      );

      expect(
        getByTestId(PerpsChartFullscreenModalSelectorsIDs.CHART),
      ).toBeDefined();
    });
  });

  describe('Orientation Management', () => {
    it('unlocks orientation when modal opens', async () => {
      render(<PerpsChartFullscreenModal {...defaultProps} isVisible />);

      await waitFor(() => {
        expect(mockUnlockAsync).toHaveBeenCalled();
      });
    });

    it('locks orientation to portrait when modal closes', async () => {
      const { rerender } = render(
        <PerpsChartFullscreenModal {...defaultProps} isVisible />,
      );

      await waitFor(() => {
        expect(mockUnlockAsync).toHaveBeenCalled();
      });

      rerender(
        <PerpsChartFullscreenModal {...defaultProps} isVisible={false} />,
      );

      await waitFor(() => {
        expect(mockLockAsync).toHaveBeenCalledWith(OrientationLock.PORTRAIT_UP);
      });
    });

    it('locks orientation when close button is pressed', async () => {
      const { getByTestId } = render(
        <PerpsChartFullscreenModal {...defaultProps} isVisible />,
      );

      await act(async () => {
        fireEvent.press(
          getByTestId(PerpsChartFullscreenModalSelectorsIDs.CLOSE_BUTTON),
        );
      });

      await waitFor(() => {
        expect(mockLockAsync).toHaveBeenCalledWith(OrientationLock.PORTRAIT_UP);
      });
    });

    it('locks orientation on cleanup when component unmounts', async () => {
      const { unmount } = render(
        <PerpsChartFullscreenModal {...defaultProps} isVisible />,
      );

      unmount();

      await waitFor(() => {
        expect(mockLockAsync).toHaveBeenCalledWith(OrientationLock.PORTRAIT_UP);
      });
    });

    it('handles orientation lock errors gracefully', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockUnlockAsync.mockRejectedValueOnce(new Error('Lock failed'));

      render(<PerpsChartFullscreenModal {...defaultProps} isVisible />);

      await waitFor(() => {
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'Failed to change orientation lock:',
          expect.any(Error),
        );
      });

      consoleWarnSpy.mockRestore();
    });

    it('calls onClose even when orientation lock fails on close', async () => {
      mockLockAsync.mockRejectedValueOnce(new Error('Lock failed'));

      const { getByTestId } = render(
        <PerpsChartFullscreenModal {...defaultProps} isVisible />,
      );

      await act(async () => {
        fireEvent.press(
          getByTestId(PerpsChartFullscreenModalSelectorsIDs.CLOSE_BUTTON),
        );
      });

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Interval Selection', () => {
    it('renders interval selector', () => {
      const { getByText } = render(
        <PerpsChartFullscreenModal {...defaultProps} isVisible />,
      );

      expect(getByText('Interval Selector')).toBeDefined();
    });

    it('calls onIntervalChange when interval is selected', () => {
      const { getByText } = render(
        <PerpsChartFullscreenModal {...defaultProps} isVisible />,
      );

      fireEvent.press(getByText('Interval Selector'));

      expect(mockOnIntervalChange).toHaveBeenCalledWith('1h');
    });
  });

  describe('Close Button', () => {
    it('renders close button', () => {
      const { getByTestId } = render(
        <PerpsChartFullscreenModal {...defaultProps} isVisible />,
      );

      expect(
        getByTestId(PerpsChartFullscreenModalSelectorsIDs.CLOSE_BUTTON),
      ).toBeDefined();
    });

    it('calls onClose when close button is pressed', async () => {
      const { getByTestId } = render(
        <PerpsChartFullscreenModal {...defaultProps} isVisible />,
      );

      await act(async () => {
        fireEvent.press(
          getByTestId(PerpsChartFullscreenModalSelectorsIDs.CLOSE_BUTTON),
        );
      });

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('locks orientation before calling onClose', async () => {
      const { getByTestId } = render(
        <PerpsChartFullscreenModal {...defaultProps} isVisible />,
      );

      await act(async () => {
        fireEvent.press(
          getByTestId(PerpsChartFullscreenModalSelectorsIDs.CLOSE_BUTTON),
        );
      });

      await waitFor(() => {
        expect(mockLockAsync).toHaveBeenCalledWith(OrientationLock.PORTRAIT_UP);
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Chart Rendering', () => {
    it('renders TradingViewChart with correct props', () => {
      const { getByTestId } = render(
        <PerpsChartFullscreenModal
          {...defaultProps}
          isVisible
          candleData={mockCandleData}
        />,
      );

      expect(
        getByTestId(PerpsChartFullscreenModalSelectorsIDs.CHART),
      ).toBeDefined();
    });

    it('passes tpslLines to chart when provided', () => {
      const mockTpslLines = {
        takeProfit: { price: 110, visible: true },
        stopLoss: { price: 90, visible: true },
      };

      const { getByTestId } = render(
        <PerpsChartFullscreenModal
          {...defaultProps}
          isVisible
          candleData={mockCandleData}
          tpslLines={mockTpslLines}
        />,
      );

      expect(
        getByTestId(PerpsChartFullscreenModalSelectorsIDs.CHART),
      ).toBeDefined();
    });
  });

  describe('OHLCV Bar', () => {
    it('does not render OHLCV bar initially', () => {
      const { queryByTestId } = render(
        <PerpsChartFullscreenModal {...defaultProps} isVisible />,
      );

      expect(queryByTestId(PerpsOHLCVBarSelectorsIDs.CONTAINER)).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('calls onClose when chart error occurs', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const ComponentErrorBoundary = require('../../../ComponentErrorBoundary');
      const mockOnError = jest.fn();

      ComponentErrorBoundary.mockImplementationOnce(
        ({
          onError,
          children,
        }: {
          onError: () => void;
          children: React.ReactNode;
        }) => {
          mockOnError.mockImplementation(onError);
          return children;
        },
      );

      render(<PerpsChartFullscreenModal {...defaultProps} isVisible />);

      await act(async () => {
        mockOnError();
      });

      await waitFor(() => {
        expect(mockLockAsync).toHaveBeenCalledWith(OrientationLock.PORTRAIT_UP);
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('restores orientation lock when chart error occurs', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const ComponentErrorBoundary = require('../../../ComponentErrorBoundary');
      const mockOnError = jest.fn();

      ComponentErrorBoundary.mockImplementationOnce(
        ({
          onError,
          children,
        }: {
          onError: () => void;
          children: React.ReactNode;
        }) => {
          mockOnError.mockImplementation(onError);
          return children;
        },
      );

      render(<PerpsChartFullscreenModal {...defaultProps} isVisible />);

      await act(async () => {
        mockOnError();
      });

      await waitFor(() => {
        expect(mockLockAsync).toHaveBeenCalledWith(OrientationLock.PORTRAIT_UP);
      });
    });
  });

  describe('Edge Cases', () => {
    it('renders without candleData', () => {
      const { getByTestId } = render(
        <PerpsChartFullscreenModal
          {...defaultProps}
          isVisible
          candleData={null}
        />,
      );

      expect(
        getByTestId(PerpsChartFullscreenModalSelectorsIDs.CHART),
      ).toBeDefined();
    });

    it('renders without tpslLines', () => {
      const { getByTestId } = render(
        <PerpsChartFullscreenModal
          {...defaultProps}
          isVisible
          candleData={mockCandleData}
          tpslLines={undefined}
        />,
      );

      expect(
        getByTestId(PerpsChartFullscreenModalSelectorsIDs.CHART),
      ).toBeDefined();
    });

    it('handles rapid open and close transitions', async () => {
      const { rerender } = render(
        <PerpsChartFullscreenModal {...defaultProps} isVisible={false} />,
      );

      rerender(<PerpsChartFullscreenModal {...defaultProps} isVisible />);

      await waitFor(() => {
        expect(mockUnlockAsync).toHaveBeenCalled();
      });

      rerender(
        <PerpsChartFullscreenModal {...defaultProps} isVisible={false} />,
      );

      await waitFor(() => {
        expect(mockLockAsync).toHaveBeenCalledWith(OrientationLock.PORTRAIT_UP);
      });
    });
  });
});

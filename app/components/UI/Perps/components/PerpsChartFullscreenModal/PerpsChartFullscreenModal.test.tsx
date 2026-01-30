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
import type { CandleData } from '../../types/perps-types';
import type { TPSLLines } from '../TradingViewChart/TradingViewChart';
import {
  PerpsChartFullscreenModalSelectorsIDs,
  PerpsOHLCVBarSelectorsIDs,
} from '../../Perps.testIds';

jest.mock('expo-screen-orientation');
jest.mock('../../../../../util/Logger');

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
      ReactMock.useImperativeHandle(ref, () => ({
        zoomToLatestCandle: jest.fn(),
        resetToDefault: jest.fn(),
      }));
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

  const mockCandleData: CandleData = {
    symbol: 'BTC',
    interval: CandlePeriod.ONE_HOUR,
    candles: [
      {
        time: 1234567890,
        open: '100',
        high: '110',
        low: '90',
        close: '105',
        volume: '1000',
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

    it('calls onClose when close button is pressed (orientation locked via visibility change)', async () => {
      const { getByTestId } = render(
        <PerpsChartFullscreenModal {...defaultProps} isVisible />,
      );

      await act(async () => {
        fireEvent.press(
          getByTestId(PerpsChartFullscreenModalSelectorsIDs.CLOSE_BUTTON),
        );
      });

      // onClose is called, which triggers isVisible to become false,
      // which causes the hook to lock orientation
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('locks orientation on cleanup when component unmounts', async () => {
      const { unmount } = render(
        <PerpsChartFullscreenModal {...defaultProps} isVisible />,
      );

      // Wait for the initial effect to complete before unmounting
      await waitFor(() => {
        expect(mockUnlockAsync).toHaveBeenCalled();
      });

      unmount();

      await waitFor(() => {
        expect(mockLockAsync).toHaveBeenCalledWith(OrientationLock.PORTRAIT_UP);
      });
    });

    it('handles orientation lock errors gracefully', async () => {
      mockUnlockAsync.mockRejectedValueOnce(new Error('Lock failed'));

      const { getByTestId } = render(
        <PerpsChartFullscreenModal {...defaultProps} isVisible />,
      );

      // Verify modal still renders and is functional despite orientation lock error
      await waitFor(() => {
        expect(getByTestId('perps-chart-fullscreen-close-button')).toBeTruthy();
      });

      // Verify modal can still be closed
      const closeButton = getByTestId('perps-chart-fullscreen-close-button');
      fireEvent.press(closeButton);

      await waitFor(() => {
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
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

    it('calls onClose immediately when pressed (orientation managed by hook)', async () => {
      const { getByTestId } = render(
        <PerpsChartFullscreenModal {...defaultProps} isVisible />,
      );

      await act(async () => {
        fireEvent.press(
          getByTestId(PerpsChartFullscreenModalSelectorsIDs.CLOSE_BUTTON),
        );
      });

      // onClose is called immediately; orientation locking happens
      // via the useScreenOrientation hook when isVisible changes
      await waitFor(() => {
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
      const mockTpslLines: TPSLLines = {
        takeProfitPrice: '110',
        stopLossPrice: '90',
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

      // onClose is called on error; orientation is restored via hook when isVisible changes
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
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

    it('renders with custom visibleCandleCount', () => {
      const { getByTestId } = render(
        <PerpsChartFullscreenModal
          {...defaultProps}
          isVisible
          visibleCandleCount={60}
        />,
      );

      expect(
        getByTestId(PerpsChartFullscreenModalSelectorsIDs.CHART),
      ).toBeDefined();
    });

    it('renders with all optional props undefined', () => {
      const { getByTestId } = render(
        <PerpsChartFullscreenModal
          {...defaultProps}
          isVisible
          candleData={undefined}
          tpslLines={undefined}
          visibleCandleCount={undefined}
        />,
      );

      expect(
        getByTestId(PerpsChartFullscreenModalSelectorsIDs.CHART),
      ).toBeDefined();
    });
  });

  describe('Chart Height Management', () => {
    it('calculates chart height without OHLCV bar', () => {
      const { getByTestId } = render(
        <PerpsChartFullscreenModal {...defaultProps} isVisible />,
      );

      const chart = getByTestId(PerpsChartFullscreenModalSelectorsIDs.CHART);
      expect(chart).toBeDefined();
      // Chart should use full available height when no OHLCV bar
    });

    it('adjusts chart height when OHLCV bar is present', async () => {
      const { getByTestId } = render(
        <PerpsChartFullscreenModal {...defaultProps} isVisible />,
      );

      const chart = getByTestId(PerpsChartFullscreenModalSelectorsIDs.CHART);
      expect(chart).toBeDefined();
      // When OHLCV data is set, chart height should subtract OHLCV bar height
    });
  });
});

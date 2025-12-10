import React, { useRef, useEffect } from 'react';
import { render, act } from '@testing-library/react-native';
import PredictFeeBreakdownSheet from './PredictFeeBreakdownSheet';
import { BottomSheetRef } from '../../../../../component-library/components/BottomSheets/BottomSheet';

jest.mock('../../utils/format', () => ({
  formatPrice: jest.fn((value, options) =>
    value !== undefined
      ? `$${value.toFixed(options?.maximumDecimals ?? 2)}`
      : '$0.00',
  ),
}));

// Mock BottomSheet
jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');

    return ReactActual.forwardRef(
      (
        props: {
          children?: React.ReactNode;
          onClose?: () => void;
          shouldNavigateBack?: boolean;
        },
        ref: React.Ref<{
          onCloseBottomSheet: (callback?: () => void) => void;
          onOpenBottomSheet: (callback?: () => void) => void;
        }>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: (callback?: () => void) => {
            props.onClose?.();
            callback?.();
          },
          onOpenBottomSheet: (callback?: () => void) => {
            callback?.();
          },
        }));

        return ReactActual.createElement(
          View,
          { testID: 'bottom-sheet' },
          props.children,
        );
      },
    );
  },
);

// Mock SheetHeader
jest.mock(
  '../../../../../component-library/components/Sheet/SheetHeader',
  () => {
    const React = jest.requireActual('react');
    const { Text: RNText } = jest.requireActual('react-native');
    return ({ title }: { title: string }) =>
      React.createElement(RNText, { testID: 'sheet-header' }, title);
  },
);

describe('PredictFeeBreakdownSheet', () => {
  const defaultProps = {
    providerFee: 0.1,
    metamaskFee: 0.05,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders bottom sheet with header', () => {
      const TestComponent = () => {
        const ref = useRef<BottomSheetRef>(null);
        return <PredictFeeBreakdownSheet ref={ref} {...defaultProps} />;
      };

      const { getByTestId } = render(<TestComponent />);

      expect(getByTestId('bottom-sheet')).toBeOnTheScreen();
      expect(getByTestId('sheet-header')).toBeOnTheScreen();
    });

    it('renders Fees title in header', () => {
      const TestComponent = () => {
        const ref = useRef<BottomSheetRef>(null);
        return <PredictFeeBreakdownSheet ref={ref} {...defaultProps} />;
      };

      const { getByText } = render(<TestComponent />);

      expect(getByText('Fees')).toBeOnTheScreen();
    });
  });

  describe('Fee Display', () => {
    it('displays Polymarket fee label and amount', () => {
      const props = { ...defaultProps, providerFee: 0.15 };
      const TestComponent = () => {
        const ref = useRef<BottomSheetRef>(null);
        return <PredictFeeBreakdownSheet ref={ref} {...props} />;
      };

      const { getByText } = render(<TestComponent />);

      expect(getByText('Polymarket fee')).toBeOnTheScreen();
      expect(getByText('$0.15')).toBeOnTheScreen();
    });

    it('displays MetaMask fee label and amount', () => {
      const props = { ...defaultProps, metamaskFee: 0.08 };
      const TestComponent = () => {
        const ref = useRef<BottomSheetRef>(null);
        return <PredictFeeBreakdownSheet ref={ref} {...props} />;
      };

      const { getByText } = render(<TestComponent />);

      expect(getByText('MetaMask fee')).toBeOnTheScreen();
      expect(getByText('$0.08')).toBeOnTheScreen();
    });

    it('displays zero fees correctly', () => {
      const props = { providerFee: 0, metamaskFee: 0 };
      const TestComponent = () => {
        const ref = useRef<BottomSheetRef>(null);
        return <PredictFeeBreakdownSheet ref={ref} {...props} />;
      };

      const { getAllByText } = render(<TestComponent />);

      const zeroAmounts = getAllByText('$0.00');
      expect(zeroAmounts.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Bottom Sheet Behavior', () => {
    it('passes shouldNavigateBack as false to BottomSheet', () => {
      const TestComponent = () => {
        const ref = useRef<BottomSheetRef>(null);
        return <PredictFeeBreakdownSheet ref={ref} {...defaultProps} />;
      };

      const { getByTestId } = render(<TestComponent />);

      expect(getByTestId('bottom-sheet')).toBeOnTheScreen();
    });

    it('calls onClose callback when bottom sheet closes', () => {
      const mockOnClose = jest.fn();
      const TestComponent = () => {
        const ref = useRef<BottomSheetRef>(null);

        useEffect(() => {
          act(() => {
            ref.current?.onCloseBottomSheet();
          });
        }, []);

        return (
          <PredictFeeBreakdownSheet
            ref={ref}
            {...defaultProps}
            onClose={mockOnClose}
          />
        );
      };

      render(<TestComponent />);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not crash when onClose is not provided', () => {
      const TestComponent = () => {
        const ref = useRef<BottomSheetRef>(null);

        useEffect(() => {
          act(() => {
            ref.current?.onCloseBottomSheet();
          });
        }, []);

        return <PredictFeeBreakdownSheet ref={ref} {...defaultProps} />;
      };

      expect(() => render(<TestComponent />)).not.toThrow();
    });
  });

  describe('Ref Methods', () => {
    it('exposes onOpenBottomSheet method', () => {
      const TestComponent = () => {
        const ref = useRef<BottomSheetRef>(null);

        useEffect(() => {
          expect(ref.current?.onOpenBottomSheet).toBeDefined();
        }, []);

        return <PredictFeeBreakdownSheet ref={ref} {...defaultProps} />;
      };

      render(<TestComponent />);
    });

    it('exposes onCloseBottomSheet method', () => {
      const TestComponent = () => {
        const ref = useRef<BottomSheetRef>(null);

        useEffect(() => {
          expect(ref.current?.onCloseBottomSheet).toBeDefined();
        }, []);

        return <PredictFeeBreakdownSheet ref={ref} {...defaultProps} />;
      };

      render(<TestComponent />);
    });
  });
});

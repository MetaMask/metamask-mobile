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

jest.mock(
  '../../../../../component-library/components/Sheet/SheetHeader',
  () => {
    const ReactModule = jest.requireActual('react');
    const { Text: RNText } = jest.requireActual('react-native');
    return ({ title }: { title: string }) =>
      ReactModule.createElement(RNText, { testID: 'sheet-header' }, title);
  },
);
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, string>) => {
    if (key === 'predict.fee_summary.price_details') {
      return 'Price details';
    }
    if (key === 'predict.fee_summary.prediction_order') {
      return 'Prediction order';
    }
    if (key === 'predict.fee_summary.prediction_order_description') {
      return `~${params?.count ?? '0.00'} contracts at ${params?.price ?? '$0.00'} each. Final amount may vary based on order book availability (up to ${params?.slippage ?? '0'}%).`;
    }
    if (key === 'predict.fee_summary.metamask_fee') {
      return 'MetaMask fee';
    }
    if (key === 'predict.fee_summary.metamask_fee_description') {
      return 'Service fee for processing this prediction';
    }
    if (key === 'predict.fee_summary.exchange_fee') {
      return 'Exchange fee';
    }
    if (key === 'predict.fee_summary.exchange_fee_description') {
      return 'Fee paid to the exchange or market';
    }
    if (key === 'predict.fee_summary.total') {
      return 'Total';
    }
    if (key === 'predict.fee_summary.close') {
      return 'Close';
    }
    if (key === 'predict.fee_summary.fak_partial_fill_note') {
      return 'Prices shown assume your order is fully filled. Actual amounts may vary if the order is only partially filled.';
    }
    return key;
  }),
}));

describe('PredictFeeBreakdownSheet', () => {
  const defaultProps = {
    providerFee: 0.1,
    metamaskFee: 0.05,
    sharePrice: 0.45,
    contractCount: 22.22,
    betAmount: 10,
    total: 10.15,
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

    it('renders price details title', () => {
      const TestComponent = () => {
        const ref = useRef<BottomSheetRef>(null);
        return <PredictFeeBreakdownSheet ref={ref} {...defaultProps} />;
      };

      const { getByText } = render(<TestComponent />);

      expect(getByText('Price details')).toBeOnTheScreen();
    });
  });

  describe('Contracts display', () => {
    it('displays prediction order title', () => {
      const TestComponent = () => {
        const ref = useRef<BottomSheetRef>(null);
        return <PredictFeeBreakdownSheet ref={ref} {...defaultProps} />;
      };

      const { getByText } = render(<TestComponent />);

      expect(getByText('Prediction order')).toBeOnTheScreen();
    });

    it('displays bet amount on contracts row', () => {
      const TestComponent = () => {
        const ref = useRef<BottomSheetRef>(null);
        return <PredictFeeBreakdownSheet ref={ref} {...defaultProps} />;
      };

      const { getByText } = render(<TestComponent />);

      expect(getByText('$10.00')).toBeOnTheScreen();
    });

    it('displays prediction order description', () => {
      const TestComponent = () => {
        const ref = useRef<BottomSheetRef>(null);
        return <PredictFeeBreakdownSheet ref={ref} {...defaultProps} />;
      };

      const { getByText } = render(<TestComponent />);

      expect(
        getByText(
          '~22.22 contracts at $0.45 each. Final amount may vary based on order book availability (up to 3%).',
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('Fee display', () => {
    it('displays MetaMask fee label and amount', () => {
      const TestComponent = () => {
        const ref = useRef<BottomSheetRef>(null);
        return <PredictFeeBreakdownSheet ref={ref} {...defaultProps} />;
      };

      const { getByText } = render(<TestComponent />);

      expect(getByText('MetaMask fee')).toBeOnTheScreen();
      expect(getByText('$0.05')).toBeOnTheScreen();
    });

    it('displays MetaMask fee description', () => {
      const TestComponent = () => {
        const ref = useRef<BottomSheetRef>(null);
        return <PredictFeeBreakdownSheet ref={ref} {...defaultProps} />;
      };

      const { getByText } = render(<TestComponent />);

      expect(
        getByText('Service fee for processing this prediction'),
      ).toBeOnTheScreen();
    });

    it('displays Exchange fee label and amount', () => {
      const TestComponent = () => {
        const ref = useRef<BottomSheetRef>(null);
        return <PredictFeeBreakdownSheet ref={ref} {...defaultProps} />;
      };

      const { getByText } = render(<TestComponent />);

      expect(getByText('Exchange fee')).toBeOnTheScreen();
      expect(getByText('$0.10')).toBeOnTheScreen();
    });

    it('displays Exchange fee description', () => {
      const TestComponent = () => {
        const ref = useRef<BottomSheetRef>(null);
        return <PredictFeeBreakdownSheet ref={ref} {...defaultProps} />;
      };

      const { getByText } = render(<TestComponent />);

      expect(getByText('Fee paid to the exchange or market')).toBeOnTheScreen();
    });

    it('displays zero fees correctly', () => {
      const props = {
        ...defaultProps,
        providerFee: 0,
        metamaskFee: 0,
      };
      const TestComponent = () => {
        const ref = useRef<BottomSheetRef>(null);
        return <PredictFeeBreakdownSheet ref={ref} {...props} />;
      };

      const { getAllByText } = render(<TestComponent />);

      const zeroAmounts = getAllByText('$0.00');
      expect(zeroAmounts.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Total display', () => {
    it('displays total amount', () => {
      const TestComponent = () => {
        const ref = useRef<BottomSheetRef>(null);
        return <PredictFeeBreakdownSheet ref={ref} {...defaultProps} />;
      };

      const { getByText } = render(<TestComponent />);

      expect(getByText('Total')).toBeOnTheScreen();
      expect(getByText('$10.15')).toBeOnTheScreen();
    });
  });
  describe('Bottom sheet behavior', () => {
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

  describe('Ref methods', () => {
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

  describe('FAK partial fill note', () => {
    it('displays partial fill note when fakOrdersEnabled is true', () => {
      const TestComponent = () => {
        const ref = useRef<BottomSheetRef>(null);
        return (
          <PredictFeeBreakdownSheet
            ref={ref}
            {...defaultProps}
            fakOrdersEnabled
          />
        );
      };

      const { getByTestId } = render(<TestComponent />);

      expect(getByTestId('predict-fak-partial-fill-note')).toBeOnTheScreen();
    });

    it('does not display partial fill note when fakOrdersEnabled is false', () => {
      const TestComponent = () => {
        const ref = useRef<BottomSheetRef>(null);
        return (
          <PredictFeeBreakdownSheet
            ref={ref}
            {...defaultProps}
            fakOrdersEnabled={false}
          />
        );
      };

      const { queryByTestId } = render(<TestComponent />);

      expect(
        queryByTestId('predict-fak-partial-fill-note'),
      ).not.toBeOnTheScreen();
    });

    it('does not display partial fill note by default', () => {
      const TestComponent = () => {
        const ref = useRef<BottomSheetRef>(null);
        return <PredictFeeBreakdownSheet ref={ref} {...defaultProps} />;
      };

      const { queryByTestId } = render(<TestComponent />);

      expect(
        queryByTestId('predict-fak-partial-fill-note'),
      ).not.toBeOnTheScreen();
    });
  });
});

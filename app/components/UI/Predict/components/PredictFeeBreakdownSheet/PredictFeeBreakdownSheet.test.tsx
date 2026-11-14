import React, { useRef, useEffect } from 'react';
import {
  render,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react-native';
import PredictFeeBreakdownSheet from './PredictFeeBreakdownSheet';
import { type BottomSheetRef } from '@metamask/design-system-react-native';

jest.mock('../../utils/format', () => ({
  formatPrice: jest.fn((value, options) =>
    value !== undefined
      ? `$${value.toFixed(options?.maximumDecimals ?? 2)}`
      : '$0.00',
  ),
}));

jest.mock('../../../shared/MembershipVipBadge/MembershipVipBadge', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return ({ hasProEntitlement }: { hasProEntitlement?: boolean }) =>
    hasProEntitlement
      ? ReactActual.createElement(
          Text,
          { testID: 'rewards-member-badge' },
          'Member',
        )
      : null;
});

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
    if (key === 'predict.fee_summary.deposit_fee') {
      return 'Deposit fee';
    }
    if (key === 'predict.fee_summary.deposit_fee_description') {
      return 'Fee paid for token deposit';
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

      expect(getByTestId('predict-fee-breakdown-sheet')).toBeOnTheScreen();
      expect(getByTestId('predict-fee-breakdown-header')).toBeOnTheScreen();
      expect(getByTestId('predict-fee-breakdown-header-bar')).toHaveStyle({
        minHeight: 64,
      });
    });

    it('renders price details title', () => {
      const TestComponent = () => {
        const ref = useRef<BottomSheetRef>(null);
        return <PredictFeeBreakdownSheet ref={ref} {...defaultProps} />;
      };

      const { getByText } = render(<TestComponent />);

      expect(getByText('Price details')).toBeOnTheScreen();
    });

    it('renders the sheet in a full-window modal so a parent sheet cannot clip it', () => {
      const { getByTestId } = render(
        <PredictFeeBreakdownSheet {...defaultProps} />,
      );

      const modal = getByTestId('predict-fee-breakdown-modal');

      expect(modal.props.transparent).toBe(true);
      expect(modal.props.presentationStyle).toBe('overFullScreen');
      expect(
        within(modal).getByTestId('predict-fee-breakdown-sheet'),
      ).toBeOnTheScreen();
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

    it('displays the providerFee it was given', () => {
      const TestComponent = () => {
        const ref = useRef<BottomSheetRef>(null);
        return (
          <PredictFeeBreakdownSheet
            ref={ref}
            {...defaultProps}
            providerFee={0.03466}
          />
        );
      };

      const { getByText } = render(<TestComponent />);

      expect(getByText('$0.03')).toBeOnTheScreen();
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

    it('does not render standalone 0 text when depositFee is 0', () => {
      const props = {
        ...defaultProps,
        depositFee: 0,
      };
      const TestComponent = () => {
        const ref = useRef<BottomSheetRef>(null);
        return <PredictFeeBreakdownSheet ref={ref} {...props} />;
      };

      const { queryByText, queryAllByText } = render(<TestComponent />);

      expect(queryByText(/^0$/)).not.toBeOnTheScreen();
      expect(queryAllByText('Deposit fee')).toHaveLength(0);
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

    it('displays original and waived totals for membership fees', () => {
      const TestComponent = () => {
        const ref = useRef<BottomSheetRef>(null);
        return (
          <PredictFeeBreakdownSheet
            ref={ref}
            {...defaultProps}
            originalTotal={10.2}
            feePolicy={{ builderCode: 'predict-pro-builder' }}
          />
        );
      };

      const { getByText, getByTestId } = render(<TestComponent />);

      expect(getByText('$10.20')).toBeOnTheScreen();
      expect(getByText('$10.15')).toBeOnTheScreen();
      expect(getByTestId('rewards-member-badge')).toBeOnTheScreen();
    });
  });
  describe('Bottom sheet behavior', () => {
    it('calls onClose callback when bottom sheet closes', async () => {
      const mockOnClose = jest.fn();
      const TestComponent = () => {
        const ref = useRef<BottomSheetRef>(null);

        useEffect(() => {
          ref.current?.onCloseBottomSheet();
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

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it('calls onClose when the header close button is pressed', async () => {
      const mockOnClose = jest.fn();
      const TestComponent = () => {
        const ref = useRef<BottomSheetRef>(null);

        return (
          <PredictFeeBreakdownSheet
            ref={ref}
            {...defaultProps}
            onClose={mockOnClose}
          />
        );
      };

      const { getByTestId } = render(<TestComponent />);

      fireEvent.press(getByTestId('predict-fee-breakdown-close'));

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it('does not crash when onClose is not provided', () => {
      const TestComponent = () => {
        const ref = useRef<BottomSheetRef>(null);

        useEffect(() => {
          ref.current?.onCloseBottomSheet();
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

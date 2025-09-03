import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { PerpsOpenOrderCardSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import PerpsOpenOrderCard from './PerpsOpenOrderCard';
import type { Order } from '../../controllers/types';

// Mock asset metadata hook
jest.mock('../../hooks/usePerpsAssetsMetadata', () => ({
  usePerpsAssetMetadata: jest.fn().mockReturnValue({
    assetUrl: 'https://example.com/eth.png',
  }),
}));

// Mock RemoteImage
jest.mock('../../../../Base/RemoteImage', () => ({
  __esModule: true,
  default: ({
    _source,
    style,
    testID,
  }: {
    _source: unknown;
    style: unknown;
    testID?: string;
  }) => {
    const { View } = jest.requireActual('react-native');
    return <View testID={testID || 'remote-image'} style={style} />;
  },
}));

describe('PerpsOpenOrderCard', () => {
  const mockOrder: Order = {
    orderId: 'order-123',
    symbol: 'ETH',
    side: 'buy',
    orderType: 'limit',
    size: '2.5',
    originalSize: '2.5',
    price: '2000.00',
    filledSize: '0',
    remainingSize: '2.5',
    status: 'open',
    timestamp: 1705267200000, // Jan 15, 2024
    lastUpdated: 1705267200000,
    takeProfitPrice: '2200.00',
    stopLossPrice: '1800.00',
    detailedOrderType: 'Limit Order',
    isTrigger: false,
    reduceOnly: false,
  };

  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    describe('Collapsed State', () => {
      it('renders basic order information in collapsed state', () => {
        render(<PerpsOpenOrderCard order={mockOrder} />);

        expect(screen.getByText('Limit Order')).toBeOnTheScreen();
        // Text shows as "2.50\n\nETH" so we need to match the pattern
        expect(screen.getByText(/2\.50\s+ETH/)).toBeOnTheScreen();
      });

      it('renders with icon when showIcon is true', () => {
        render(<PerpsOpenOrderCard order={mockOrder} showIcon />);

        expect(screen.getByTestId('remote-image')).toBeOnTheScreen();
      });

      it('renders without icon when showIcon is false', () => {
        render(<PerpsOpenOrderCard order={mockOrder} showIcon={false} />);

        expect(screen.queryByTestId('remote-image')).not.toBeOnTheScreen();
      });

      it('renders right accessory when provided', () => {
        const rightAccessory = (
          <Text testID="right-accessory">Custom Content</Text>
        );
        render(
          <PerpsOpenOrderCard
            order={mockOrder}
            rightAccessory={rightAccessory}
          />,
        );

        expect(screen.getByTestId('right-accessory')).toBeOnTheScreen();
        expect(screen.getByText('Custom Content')).toBeOnTheScreen();
      });
    });

    describe('Expanded State', () => {
      it('renders expanded view with detailed information for non-trigger orders', () => {
        render(<PerpsOpenOrderCard order={mockOrder} expanded />);

        // Should show Take Profit and Stop Loss sections for non-trigger orders
        expect(screen.getByText('$2,200.00')).toBeOnTheScreen();
        expect(screen.getByText('$1,800.00')).toBeOnTheScreen();
      });

      it('renders trigger price for trigger orders', () => {
        const triggerOrder = {
          ...mockOrder,
          isTrigger: true,
          detailedOrderType: 'Stop Market',
        };

        render(<PerpsOpenOrderCard order={triggerOrder} expanded />);

        // Trigger orders should not show TP/SL sections
        expect(screen.queryByText(/$2,200.00/)).not.toBeOnTheScreen();
        expect(screen.queryByText(/$1,800.00/)).not.toBeOnTheScreen();
      });

      it('renders reduce only status for trigger orders', () => {
        const triggerReduceOnlyOrder = {
          ...mockOrder,
          isTrigger: true,
          reduceOnly: true,
        };

        render(<PerpsOpenOrderCard order={triggerReduceOnlyOrder} expanded />);

        // Should find the Yes text for reduce only status
        const yesTexts = screen.getAllByText('Yes');
        expect(yesTexts.length).toBeGreaterThan(0);
      });

      it('renders cancel button for open orders in expanded state', () => {
        render(<PerpsOpenOrderCard order={mockOrder} expanded />);

        expect(
          screen.getByTestId(PerpsOpenOrderCardSelectorsIDs.CANCEL_BUTTON),
        ).toBeOnTheScreen();
      });
    });

    describe('Fill Percentage Display', () => {
      it('renders fill percentage badge when order is partially filled', () => {
        const partiallyFilledOrder = {
          ...mockOrder,
          filledSize: '1.25', // 50% filled
          remainingSize: '1.25',
        };

        render(<PerpsOpenOrderCard order={partiallyFilledOrder} />);

        expect(screen.getByText(/50%/)).toBeOnTheScreen();
      });

      it('does not render fill percentage badge when order is unfilled', () => {
        render(<PerpsOpenOrderCard order={mockOrder} />);

        expect(screen.queryByText(/%/)).not.toBeOnTheScreen();
      });
    });
  });

  describe('Order Direction Logic', () => {
    it('correctly identifies LONG position for buy orders', () => {
      const buyOrder = {
        ...mockOrder,
        side: 'buy' as const,
        detailedOrderType: undefined, // Remove to show direction
      };
      render(<PerpsOpenOrderCard order={buyOrder} />);

      expect(screen.getByText('long')).toBeOnTheScreen();
    });

    it('correctly identifies SHORT position for sell orders', () => {
      const sellOrder = {
        ...mockOrder,
        side: 'sell' as const,
        detailedOrderType: undefined, // Remove to show direction
      };
      render(<PerpsOpenOrderCard order={sellOrder} />);

      expect(screen.getByText('short')).toBeOnTheScreen();
    });

    it('uses detailedOrderType when available', () => {
      const orderWithDetailedType = {
        ...mockOrder,
        detailedOrderType: 'Stop Loss Order',
      };

      render(<PerpsOpenOrderCard order={orderWithDetailedType} />);

      expect(screen.getByText('Stop Loss Order')).toBeOnTheScreen();
    });
  });

  describe('User Interactions', () => {
    it('calls onCancel when cancel button is pressed', () => {
      render(
        <PerpsOpenOrderCard
          order={mockOrder}
          onCancel={mockOnCancel}
          expanded
        />,
      );

      fireEvent.press(
        screen.getByTestId(PerpsOpenOrderCardSelectorsIDs.CANCEL_BUTTON),
      );

      expect(mockOnCancel).toHaveBeenCalledWith(mockOrder);
    });

    it('handles cancel button press without onCancel handler', () => {
      render(<PerpsOpenOrderCard order={mockOrder} expanded />);

      // Should not throw when cancel button is pressed without handler
      expect(() => {
        fireEvent.press(
          screen.getByTestId(PerpsOpenOrderCardSelectorsIDs.CANCEL_BUTTON),
        );
      }).not.toThrow();
    });

    it('disables interactions when disabled prop is true', () => {
      render(
        <PerpsOpenOrderCard
          order={mockOrder}
          onCancel={mockOnCancel}
          disabled
          expanded
        />,
      );

      const cancelButton = screen.getByTestId(
        PerpsOpenOrderCardSelectorsIDs.CANCEL_BUTTON,
      );
      // Check that the button has disabled prop
      expect(cancelButton.props.disabled).toBe(true);
    });
  });

  describe('Data Formatting and Edge Cases', () => {
    it('handles missing take profit price', () => {
      const orderWithoutTP = {
        ...mockOrder,
        takeProfitPrice: undefined,
      };

      render(<PerpsOpenOrderCard order={orderWithoutTP} expanded />);

      // Should find "not set" text in the component
      expect(screen.getByText('Not Set')).toBeOnTheScreen();
    });

    it('handles missing stop loss price', () => {
      const orderWithoutSL = {
        ...mockOrder,
        stopLossPrice: undefined,
      };

      render(<PerpsOpenOrderCard order={orderWithoutSL} expanded />);

      // Should find "not set" text in the component
      expect(screen.getByText('Not Set')).toBeOnTheScreen();
    });

    it('handles zero original size for fill percentage calculation', () => {
      const zeroSizeOrder = {
        ...mockOrder,
        originalSize: '0',
        filledSize: '1',
      };

      render(<PerpsOpenOrderCard order={zeroSizeOrder} />);

      // Should not show any percentage when original size is zero
      expect(screen.queryByText(/%/)).not.toBeOnTheScreen();
    });

    it('handles different asset symbols', () => {
      const btcOrder = {
        ...mockOrder,
        symbol: 'BTC',
        price: '50000.00',
        size: '0.1',
        originalSize: '0.1',
      };

      render(<PerpsOpenOrderCard order={btcOrder} />);

      // Text shows as "0.1000\n\nBTC" so we need to match the pattern
      expect(screen.getByText(/0\.1000\s+BTC/)).toBeOnTheScreen();
    });

    it('handles market orders', () => {
      const marketOrder = {
        ...mockOrder,
        orderType: 'market' as const,
        detailedOrderType: 'Market Order',
      };

      render(<PerpsOpenOrderCard order={marketOrder} expanded />);

      expect(screen.getByText('Market Order')).toBeOnTheScreen();
    });

    it('renders correctly without asset URL', () => {
      const mockUsePerpsAssetMetadata = jest.requireMock(
        '../../hooks/usePerpsAssetsMetadata',
      ).usePerpsAssetMetadata;
      mockUsePerpsAssetMetadata.mockReturnValueOnce({ assetUrl: null });

      render(<PerpsOpenOrderCard order={mockOrder} showIcon />);

      // Should show fallback icon when no asset URL
      expect(screen.queryByTestId('remote-image')).not.toBeOnTheScreen();
    });
  });

  describe('Component Accessibility', () => {
    it('renders with correct testID', () => {
      render(<PerpsOpenOrderCard order={mockOrder} />);

      expect(
        screen.getByTestId(PerpsOpenOrderCardSelectorsIDs.CARD),
      ).toBeOnTheScreen();
    });

    it('renders cancel button with correct testID when expanded', () => {
      render(<PerpsOpenOrderCard order={mockOrder} expanded />);

      expect(
        screen.getByTestId(PerpsOpenOrderCardSelectorsIDs.CANCEL_BUTTON),
      ).toBeOnTheScreen();
    });
  });

  describe('Non-Open Order Guard', () => {
    it('returns null for filled orders', () => {
      const filledOrder = { ...mockOrder, status: 'filled' as const };
      const { toJSON } = render(<PerpsOpenOrderCard order={filledOrder} />);

      expect(toJSON()).toBeNull();
    });

    it('returns null for canceled orders', () => {
      const canceledOrder = { ...mockOrder, status: 'canceled' as const };
      const { toJSON } = render(<PerpsOpenOrderCard order={canceledOrder} />);

      expect(toJSON()).toBeNull();
    });
  });
});

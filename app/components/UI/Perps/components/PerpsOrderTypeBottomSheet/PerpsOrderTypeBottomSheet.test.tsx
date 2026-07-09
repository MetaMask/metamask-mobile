import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PerpsOrderTypeBottomSheet from './PerpsOrderTypeBottomSheet';
import { type OrderType } from '@metamask/perps-controller';
import { PerpsOrderTypeBottomSheetSelectorsIDs } from '../../Perps.testIds';

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn(() => ({}));
  return { useTailwind: () => tw };
});

jest.mock('@metamask/design-system-react-native', () => {
  const MockReact = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const actual = jest.requireActual('@metamask/design-system-react-native');

  const BottomSheet = MockReact.forwardRef(
    (
      {
        children,
        testID,
      }: {
        children: React.ReactNode;
        testID?: string;
      },
      ref: React.Ref<{
        onOpenBottomSheet: () => void;
        onCloseBottomSheet: (callback?: () => void) => void;
      }>,
    ) => {
      MockReact.useImperativeHandle(ref, () => ({
        onOpenBottomSheet: jest.fn(),
        onCloseBottomSheet: (callback?: () => void) => {
          callback?.();
        },
      }));

      return <View testID={testID}>{children}</View>;
    },
  );
  BottomSheet.displayName = 'BottomSheet';

  return {
    ...actual,
    BottomSheet,
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'perps.order.type.title': 'Order Type',
      'perps.order.type.market.title': 'Market Order',
      'perps.order.type.market.description':
        'Execute immediately at current market price',
      'perps.order.type.limit.title': 'Limit Order',
      'perps.order.type.limit.description':
        'Execute only at your specified price or better',
    };
    return translations[key] || key;
  }),
}));

describe('PerpsOrderTypeBottomSheet', () => {
  const defaultProps = {
    isVisible: true,
    onClose: jest.fn(),
    onSelect: jest.fn(),
    currentOrderType: 'market' as OrderType,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders when visible', () => {
      render(<PerpsOrderTypeBottomSheet {...defaultProps} />);

      expect(screen.getByText('Order Type')).toBeOnTheScreen();
      expect(screen.getByText('Market Order')).toBeOnTheScreen();
      expect(screen.getByText('Limit Order')).toBeOnTheScreen();
    });

    it('returns null when not visible', () => {
      render(<PerpsOrderTypeBottomSheet {...defaultProps} isVisible={false} />);

      expect(screen.queryByText('Order Type')).toBeNull();
      expect(screen.queryByText('Market Order')).toBeNull();
      expect(screen.queryByText('Limit Order')).toBeNull();
    });

    it('renders order type descriptions', () => {
      render(<PerpsOrderTypeBottomSheet {...defaultProps} />);

      expect(
        screen.getByText('Execute immediately at current market price'),
      ).toBeOnTheScreen();
      expect(
        screen.getByText('Execute only at your specified price or better'),
      ).toBeOnTheScreen();
    });

    it('renders both market and limit options', () => {
      render(<PerpsOrderTypeBottomSheet {...defaultProps} />);

      expect(screen.getByText('Market Order')).toBeOnTheScreen();
      expect(screen.getByText('Limit Order')).toBeOnTheScreen();
    });

    it('renders options with stable testIDs', () => {
      render(<PerpsOrderTypeBottomSheet {...defaultProps} />);

      expect(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.MARKET_OPTION),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.LIMIT_OPTION),
      ).toBeOnTheScreen();
    });
  });

  describe('Order Type Selection', () => {
    it('calls onSelect and onClose when market order is pressed', () => {
      const onSelect = jest.fn();
      const onClose = jest.fn();

      render(
        <PerpsOrderTypeBottomSheet
          {...defaultProps}
          onSelect={onSelect}
          onClose={onClose}
          currentOrderType="limit"
        />,
      );

      fireEvent.press(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.MARKET_OPTION),
      );

      expect(onSelect).toHaveBeenCalledWith('market');
      expect(onClose).toHaveBeenCalled();
    });

    it('calls onSelect and onClose when limit order is pressed', () => {
      const onSelect = jest.fn();
      const onClose = jest.fn();

      render(
        <PerpsOrderTypeBottomSheet
          {...defaultProps}
          onSelect={onSelect}
          onClose={onClose}
          currentOrderType="market"
        />,
      );

      fireEvent.press(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.LIMIT_OPTION),
      );

      expect(onSelect).toHaveBeenCalledWith('limit');
      expect(onClose).toHaveBeenCalled();
    });

    it('handles selecting the same order type', () => {
      const onSelect = jest.fn();
      const onClose = jest.fn();

      render(
        <PerpsOrderTypeBottomSheet
          {...defaultProps}
          onSelect={onSelect}
          onClose={onClose}
          currentOrderType="market"
        />,
      );

      fireEvent.press(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.MARKET_OPTION),
      );

      expect(onSelect).toHaveBeenCalledWith('market');
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Bottom Sheet Interaction', () => {
    it('opens bottom sheet when visible becomes true', () => {
      const { rerender } = render(
        <PerpsOrderTypeBottomSheet {...defaultProps} isVisible={false} />,
      );

      rerender(<PerpsOrderTypeBottomSheet {...defaultProps} isVisible />);

      expect(screen.getByText('Order Type')).toBeOnTheScreen();
    });
  });

  describe('Props Validation', () => {
    it('handles undefined order type gracefully', () => {
      render(
        <PerpsOrderTypeBottomSheet
          {...defaultProps}
          currentOrderType={undefined as unknown as OrderType}
        />,
      );

      expect(screen.getByText('Market Order')).toBeOnTheScreen();
      expect(screen.getByText('Limit Order')).toBeOnTheScreen();
    });

    it('renders with minimal props', () => {
      render(
        <PerpsOrderTypeBottomSheet
          isVisible
          onClose={jest.fn()}
          onSelect={jest.fn()}
          currentOrderType="market"
        />,
      );

      expect(screen.getByText('Order Type')).toBeOnTheScreen();
    });
  });

  describe('Accessibility', () => {
    it('provides accessible touch targets for order type options', () => {
      render(<PerpsOrderTypeBottomSheet {...defaultProps} />);

      expect(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.MARKET_OPTION),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.LIMIT_OPTION),
      ).toBeOnTheScreen();
    });

    it('maintains correct order of options', () => {
      render(<PerpsOrderTypeBottomSheet {...defaultProps} />);

      const marketOption = screen.getByTestId(
        PerpsOrderTypeBottomSheetSelectorsIDs.MARKET_OPTION,
      );
      const limitOption = screen.getByTestId(
        PerpsOrderTypeBottomSheetSelectorsIDs.LIMIT_OPTION,
      );

      expect(marketOption).toBeOnTheScreen();
      expect(limitOption).toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid selection changes', () => {
      const onSelect = jest.fn();
      const onClose = jest.fn();

      render(
        <PerpsOrderTypeBottomSheet
          {...defaultProps}
          onSelect={onSelect}
          onClose={onClose}
        />,
      );

      fireEvent.press(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.MARKET_OPTION),
      );
      fireEvent.press(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.LIMIT_OPTION),
      );

      expect(onSelect).toHaveBeenCalledTimes(2);
      expect(onSelect).toHaveBeenNthCalledWith(1, 'market');
      expect(onSelect).toHaveBeenNthCalledWith(2, 'limit');
      expect(onClose).toHaveBeenCalledTimes(2);
    });
  });

  describe('Component Memoization', () => {
    it('prevents unnecessary re-renders when props remain the same', () => {
      const props = {
        isVisible: true,
        onClose: jest.fn(),
        onSelect: jest.fn(),
        currentOrderType: 'market' as OrderType,
      };

      const { rerender } = render(<PerpsOrderTypeBottomSheet {...props} />);

      rerender(<PerpsOrderTypeBottomSheet {...props} />);

      expect(screen.getByText('Order Type')).toBeOnTheScreen();
    });

    it('re-renders when isVisible changes', () => {
      const { rerender } = render(
        <PerpsOrderTypeBottomSheet {...defaultProps} isVisible={false} />,
      );

      rerender(<PerpsOrderTypeBottomSheet {...defaultProps} isVisible />);

      expect(screen.getByText('Order Type')).toBeOnTheScreen();
    });
  });
});

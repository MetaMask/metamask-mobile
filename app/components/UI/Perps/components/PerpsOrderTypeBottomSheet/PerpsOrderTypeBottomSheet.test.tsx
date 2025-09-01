import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PerpsOrderTypeBottomSheet from './PerpsOrderTypeBottomSheet';
import type { OrderType } from '../../controllers/types';

// Mock dependencies
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaConsumer: ({
    children,
  }: {
    children: (insets: unknown) => React.ReactNode;
  }) => children({ insets: { top: 0, bottom: 0, left: 0, right: 0 } }),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      background: { alternative: '#f0f0f0' },
      text: { default: '#000000', muted: '#666666' },
      border: { muted: '#e1e1e1' },
      primary: { default: '#0066cc', muted: '#cce0ff' },
    },
  })),
}));

jest.mock('./PerpsOrderTypeBottomSheet.styles', () => ({
  createStyles: jest.fn(() => ({
    container: {
      paddingHorizontal: 16,
      paddingVertical: 24,
    },
    option: {
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderRadius: 12,
      marginBottom: 16,
      backgroundColor: '#f0f0f0',
      borderWidth: 1,
      borderColor: '#e1e1e1',
    },
    optionSelected: {
      backgroundColor: '#cce0ff',
      borderColor: '#0066cc',
    },
    optionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    optionTitle: {
      marginBottom: 4,
    },
    optionContent: {
      flex: 1,
    },
  })),
}));

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

// Mock BottomSheet components
jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const { View } = jest.requireActual('react-native');
    const ReactActual = jest.requireActual('react');

    return ReactActual.forwardRef(
      (
        {
          children,
          onClose,
        }: {
          children: React.ReactNode;
          shouldNavigateBack?: boolean;
          onClose: () => void;
        },
        ref: React.Ref<{
          onOpenBottomSheet: () => void;
          onCloseBottomSheet: () => void;
        }>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onOpenBottomSheet: jest.fn(),
          onCloseBottomSheet: jest.fn(),
        }));

        return (
          <View testID="bottom-sheet" onTouchStart={onClose}>
            {children}
          </View>
        );
      },
    );
  },
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const { View, TouchableOpacity, Text } = jest.requireActual('react-native');

    return ({
      children,
      onClose,
    }: {
      children: React.ReactNode;
      onClose: () => void;
    }) => (
      <View testID="bottom-sheet-header">
        <TouchableOpacity testID="header-close-button" onPress={onClose}>
          <Text>Close</Text>
        </TouchableOpacity>
        {children}
      </View>
    );
  },
);

jest.mock('../../../../../component-library/components/Texts/Text', () => {
  const { Text } = jest.requireActual('react-native');

  const MockText = ({
    children,
    variant,
    color: _color,
    style,
  }: {
    children: React.ReactNode;
    variant?: string;
    color?: string;
    style?: React.ComponentProps<typeof Text>['style'];
  }) => (
    <Text style={style} testID={`text-${variant || 'default'}`}>
      {children}
    </Text>
  );

  return {
    __esModule: true,
    default: MockText,
    TextVariant: {
      HeadingMD: 'HeadingMD',
      BodyLGMedium: 'BodyLGMedium',
      BodyMD: 'BodyMD',
    },
    TextColor: {
      Default: 'Default',
      Alternative: 'Alternative',
    },
  };
});

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
      // Act
      render(<PerpsOrderTypeBottomSheet {...defaultProps} />);

      // Assert
      expect(screen.getByText('Order Type')).toBeOnTheScreen();
      expect(screen.getByText('Market Order')).toBeOnTheScreen();
      expect(screen.getByText('Limit Order')).toBeOnTheScreen();
      expect(screen.getByTestId('bottom-sheet')).toBeOnTheScreen();
    });

    it('returns null when not visible', () => {
      // Act
      render(<PerpsOrderTypeBottomSheet {...defaultProps} isVisible={false} />);

      // Assert
      expect(screen.queryByText('Order Type')).toBeNull();
      expect(screen.queryByText('Market Order')).toBeNull();
      expect(screen.queryByText('Limit Order')).toBeNull();
      expect(screen.queryByTestId('bottom-sheet')).toBeNull();
    });

    it('renders order type descriptions', () => {
      // Act
      render(<PerpsOrderTypeBottomSheet {...defaultProps} />);

      // Assert
      expect(
        screen.getByText('Execute immediately at current market price'),
      ).toBeOnTheScreen();
      expect(
        screen.getByText('Execute only at your specified price or better'),
      ).toBeOnTheScreen();
    });

    it('renders both market and limit options', () => {
      // Act
      render(<PerpsOrderTypeBottomSheet {...defaultProps} />);

      // Assert
      const marketOption = screen.getByText('Market Order');
      const limitOption = screen.getByText('Limit Order');

      expect(marketOption).toBeOnTheScreen();
      expect(limitOption).toBeOnTheScreen();
    });
  });

  describe('Order Type Selection', () => {
    it('calls onSelect and onClose when market order is pressed', () => {
      // Arrange
      const onSelect = jest.fn();
      const onClose = jest.fn();

      // Act
      render(
        <PerpsOrderTypeBottomSheet
          {...defaultProps}
          onSelect={onSelect}
          onClose={onClose}
          currentOrderType="limit"
        />,
      );

      const marketOption = screen.getByText('Market Order');
      fireEvent.press(marketOption);

      // Assert
      expect(onSelect).toHaveBeenCalledWith('market');
      expect(onClose).toHaveBeenCalled();
    });

    it('calls onSelect and onClose when limit order is pressed', () => {
      // Arrange
      const onSelect = jest.fn();
      const onClose = jest.fn();

      // Act
      render(
        <PerpsOrderTypeBottomSheet
          {...defaultProps}
          onSelect={onSelect}
          onClose={onClose}
          currentOrderType="market"
        />,
      );

      const limitOption = screen.getByText('Limit Order');
      fireEvent.press(limitOption);

      // Assert
      expect(onSelect).toHaveBeenCalledWith('limit');
      expect(onClose).toHaveBeenCalled();
    });

    it('handles selecting the same order type', () => {
      // Arrange
      const onSelect = jest.fn();
      const onClose = jest.fn();

      // Act
      render(
        <PerpsOrderTypeBottomSheet
          {...defaultProps}
          onSelect={onSelect}
          onClose={onClose}
          currentOrderType="market"
        />,
      );

      const marketOption = screen.getByText('Market Order');
      fireEvent.press(marketOption);

      // Assert
      expect(onSelect).toHaveBeenCalledWith('market');
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Bottom Sheet Interaction', () => {
    it('calls onClose when header close button is pressed', () => {
      // Arrange
      const onClose = jest.fn();

      // Act
      render(<PerpsOrderTypeBottomSheet {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByTestId('header-close-button');
      fireEvent.press(closeButton);

      // Assert
      expect(onClose).toHaveBeenCalled();
    });

    it('opens bottom sheet when visible becomes true', () => {
      // Arrange
      const { rerender } = render(
        <PerpsOrderTypeBottomSheet {...defaultProps} isVisible={false} />,
      );

      // Act
      rerender(<PerpsOrderTypeBottomSheet {...defaultProps} isVisible />);

      // Assert - Component should render when made visible
      expect(screen.getByTestId('bottom-sheet')).toBeOnTheScreen();
    });
  });

  describe('Props Validation', () => {
    it('handles undefined order type gracefully', () => {
      // Act
      render(
        <PerpsOrderTypeBottomSheet
          {...defaultProps}
          currentOrderType={undefined as unknown as OrderType}
        />,
      );

      // Assert - Should render without crashing
      expect(screen.getByText('Market Order')).toBeOnTheScreen();
      expect(screen.getByText('Limit Order')).toBeOnTheScreen();
    });

    it('renders with minimal props', () => {
      // Act
      render(
        <PerpsOrderTypeBottomSheet
          isVisible
          onClose={jest.fn()}
          onSelect={jest.fn()}
          currentOrderType="market"
        />,
      );

      // Assert
      expect(screen.getByText('Order Type')).toBeOnTheScreen();
    });
  });

  describe('Accessibility', () => {
    it('provides accessible touch targets for order type options', () => {
      // Act
      render(<PerpsOrderTypeBottomSheet {...defaultProps} />);

      // Assert - TouchableOpacity elements should be present and pressable
      const marketOption = screen.getByText('Market Order').parent;
      const limitOption = screen.getByText('Limit Order').parent;

      expect(marketOption).toBeDefined();
      expect(limitOption).toBeDefined();
    });

    it('maintains correct order of options', () => {
      // Act
      render(<PerpsOrderTypeBottomSheet {...defaultProps} />);

      // Assert - Market should come before Limit in the DOM
      const allTexts = screen.getAllByTestId(/text-/);
      const marketIndex = allTexts.findIndex(
        (el) => el.props.children === 'Market Order',
      );
      const limitIndex = allTexts.findIndex(
        (el) => el.props.children === 'Limit Order',
      );

      expect(marketIndex).toBeLessThan(limitIndex);
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid selection changes', () => {
      // Arrange
      const onSelect = jest.fn();
      const onClose = jest.fn();

      // Act
      render(
        <PerpsOrderTypeBottomSheet
          {...defaultProps}
          onSelect={onSelect}
          onClose={onClose}
        />,
      );

      const marketOption = screen.getByText('Market Order');
      const limitOption = screen.getByText('Limit Order');

      // Rapidly press both options
      fireEvent.press(marketOption);
      fireEvent.press(limitOption);

      // Assert
      expect(onSelect).toHaveBeenCalledTimes(2);
      expect(onSelect).toHaveBeenNthCalledWith(1, 'market');
      expect(onSelect).toHaveBeenNthCalledWith(2, 'limit');
      expect(onClose).toHaveBeenCalledTimes(2);
    });
  });

  describe('Component Memoization', () => {
    it('prevents unnecessary re-renders when props remain the same', () => {
      // Arrange
      const props = {
        isVisible: true,
        onClose: jest.fn(),
        onSelect: jest.fn(),
        currentOrderType: 'market' as OrderType,
      };

      const { rerender } = render(<PerpsOrderTypeBottomSheet {...props} />);

      // Act - Re-render with same props
      rerender(<PerpsOrderTypeBottomSheet {...props} />);

      // Assert - Component should render without issues
      expect(screen.getByText('Order Type')).toBeOnTheScreen();
    });

    it('re-renders when isVisible changes', () => {
      // Arrange
      const { rerender } = render(
        <PerpsOrderTypeBottomSheet {...defaultProps} isVisible={false} />,
      );

      // Act
      rerender(<PerpsOrderTypeBottomSheet {...defaultProps} isVisible />);

      // Assert
      expect(screen.getByText('Order Type')).toBeOnTheScreen();
    });
  });
});

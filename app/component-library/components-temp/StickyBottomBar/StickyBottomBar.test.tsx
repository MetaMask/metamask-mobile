// Third party dependencies
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Internal dependencies
import StickyBottomBar from './StickyBottomBar';
import { ButtonSize, ButtonWidthTypes } from '../../components/Buttons/Button';
import type { ButtonPrimaryProps } from '../../components/Buttons/Button/variants/ButtonPrimary/ButtonPrimary.types';

// Mock dependencies
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(),
}));

jest.mock('../../components/Buttons/Button', () => ({
  __esModule: true,
  default: ({ label, onPress, testID }: ButtonPrimaryProps) => {
    const { TouchableOpacity: MockTouchableOpacity, Text: MockText } =
      jest.requireActual('react-native');
    return (
      <MockTouchableOpacity onPress={onPress} testID={testID}>
        <MockText>{label}</MockText>
      </MockTouchableOpacity>
    );
  },
  ButtonSize: {
    Sm: '32',
    Md: '40',
    Lg: '48',
    Auto: 'auto',
  },
  ButtonVariants: {
    Link: 'Link',
    Primary: 'Primary',
    Secondary: 'Secondary',
  },
  ButtonWidthTypes: {
    Auto: 'auto',
    Full: 'full',
  },
}));

jest.mock('../../hooks', () => ({
  useStyles: () => ({
    styles: {
      container: {},
      buttonRow: {},
      buttonWrapper: {},
      button: {},
    },
  }),
}));

describe('StickyBottomBar', () => {
  const mockOnPress = jest.fn();
  const mockUseSafeAreaInsets = jest.mocked(useSafeAreaInsets);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSafeAreaInsets.mockReturnValue({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    });
  });

  describe('Rendering', () => {
    it('renders with single button', () => {
      // Arrange
      const buttons = [
        {
          label: 'Buy',
          size: ButtonSize.Lg,
          onPress: mockOnPress,
        },
      ];

      // Act
      const { getByText } = render(<StickyBottomBar buttons={buttons} />);

      // Assert
      expect(getByText('Buy')).toBeOnTheScreen();
    });

    it('renders with multiple buttons', () => {
      // Arrange
      const buttons = [
        {
          label: 'Buy',
          size: ButtonSize.Lg,
          onPress: mockOnPress,
        },
        {
          label: 'Sell',
          size: ButtonSize.Lg,
          onPress: mockOnPress,
        },
      ];

      // Act
      const { getByText } = render(<StickyBottomBar buttons={buttons} />);

      // Assert
      expect(getByText('Buy')).toBeOnTheScreen();
      expect(getByText('Sell')).toBeOnTheScreen();
    });

    it('renders with custom testID', () => {
      // Arrange
      const buttons = [
        {
          label: 'Buy',
          size: ButtonSize.Lg,
          onPress: mockOnPress,
        },
      ];
      const testID = 'custom-sticky-bar';

      // Act
      const { getByTestId } = render(
        <StickyBottomBar buttons={buttons} testID={testID} />,
      );

      // Assert
      expect(getByTestId(testID)).toBeOnTheScreen();
    });

    it('renders with default testID when not provided', () => {
      // Arrange
      const buttons = [
        {
          label: 'Buy',
          size: ButtonSize.Lg,
          onPress: mockOnPress,
        },
      ];

      // Act
      const { getByTestId } = render(<StickyBottomBar buttons={buttons} />);

      // Assert
      expect(getByTestId('sticky-bottom-bar')).toBeOnTheScreen();
    });

    it('returns null when no buttons provided', () => {
      // Arrange
      const buttons: ButtonPrimaryProps[] = [];

      // Act
      const { queryByTestId } = render(<StickyBottomBar buttons={buttons} />);

      // Assert
      expect(queryByTestId('sticky-bottom-bar')).toBeNull();
    });

    it('returns null when buttons array is undefined', () => {
      // Arrange & Act
      const { queryByTestId } = render(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <StickyBottomBar buttons={undefined as any} />,
      );

      // Assert
      expect(queryByTestId('sticky-bottom-bar')).toBeNull();
    });

    it('renders with four buttons', () => {
      // Arrange
      const buttons = [
        { label: 'Buy', size: ButtonSize.Lg, onPress: mockOnPress },
        { label: 'Sell', size: ButtonSize.Lg, onPress: mockOnPress },
        { label: 'Send', size: ButtonSize.Lg, onPress: mockOnPress },
        { label: 'Receive', size: ButtonSize.Lg, onPress: mockOnPress },
      ];

      // Act
      const { getByText } = render(<StickyBottomBar buttons={buttons} />);

      // Assert
      expect(getByText('Buy')).toBeOnTheScreen();
      expect(getByText('Sell')).toBeOnTheScreen();
      expect(getByText('Send')).toBeOnTheScreen();
      expect(getByText('Receive')).toBeOnTheScreen();
    });
  });

  describe('Button Interactions', () => {
    it('calls onPress when button is pressed', () => {
      // Arrange
      const mockBuyPress = jest.fn();
      const buttons = [
        {
          label: 'Buy',
          size: ButtonSize.Lg,
          onPress: mockBuyPress,
        },
      ];

      // Act
      const { getByText } = render(<StickyBottomBar buttons={buttons} />);
      fireEvent.press(getByText('Buy'));

      // Assert
      expect(mockBuyPress).toHaveBeenCalledTimes(1);
    });

    it('calls correct onPress for each button', () => {
      // Arrange
      const mockBuyPress = jest.fn();
      const mockSellPress = jest.fn();
      const buttons = [
        {
          label: 'Buy',
          size: ButtonSize.Lg,
          onPress: mockBuyPress,
        },
        {
          label: 'Sell',
          size: ButtonSize.Lg,
          onPress: mockSellPress,
        },
      ];

      // Act
      const { getByText } = render(<StickyBottomBar buttons={buttons} />);
      fireEvent.press(getByText('Buy'));
      fireEvent.press(getByText('Sell'));

      // Assert
      expect(mockBuyPress).toHaveBeenCalledTimes(1);
      expect(mockSellPress).toHaveBeenCalledTimes(1);
    });

    it('handles multiple presses on same button', () => {
      // Arrange
      const mockBuyPress = jest.fn();
      const buttons = [
        {
          label: 'Buy',
          size: ButtonSize.Lg,
          onPress: mockBuyPress,
        },
      ];

      // Act
      const { getByText } = render(<StickyBottomBar buttons={buttons} />);
      fireEvent.press(getByText('Buy'));
      fireEvent.press(getByText('Buy'));
      fireEvent.press(getByText('Buy'));

      // Assert
      expect(mockBuyPress).toHaveBeenCalledTimes(3);
    });
  });

  describe('SafeArea Integration', () => {
    it('applies SafeArea bottom inset padding', () => {
      // Arrange
      mockUseSafeAreaInsets.mockReturnValue({
        top: 0,
        right: 0,
        bottom: 34,
        left: 0,
      });
      const buttons = [
        {
          label: 'Buy',
          size: ButtonSize.Lg,
          onPress: mockOnPress,
        },
      ];

      // Act
      const { getByTestId } = render(<StickyBottomBar buttons={buttons} />);
      const container = getByTestId('sticky-bottom-bar');

      // Assert
      expect(mockUseSafeAreaInsets).toHaveBeenCalled();
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.anything(),
          expect.objectContaining({ paddingBottom: 50 }), // 34 + 16
        ]),
      );
    });

    it('applies SafeArea padding when bottom inset is zero', () => {
      // Arrange
      mockUseSafeAreaInsets.mockReturnValue({
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      });
      const buttons = [
        {
          label: 'Buy',
          size: ButtonSize.Lg,
          onPress: mockOnPress,
        },
      ];

      // Act
      const { getByTestId } = render(<StickyBottomBar buttons={buttons} />);
      const container = getByTestId('sticky-bottom-bar');

      // Assert
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.anything(),
          expect.objectContaining({ paddingBottom: 16 }), // 0 + 16
        ]),
      );
    });
  });

  describe('Button Configuration', () => {
    it('renders buttons with different sizes', () => {
      // Arrange
      const buttons = [
        {
          label: 'Small',
          size: ButtonSize.Sm,
          onPress: mockOnPress,
        },
        {
          label: 'Large',
          size: ButtonSize.Lg,
          onPress: mockOnPress,
        },
      ];

      // Act
      const { getByText } = render(<StickyBottomBar buttons={buttons} />);

      // Assert
      expect(getByText('Small')).toBeOnTheScreen();
      expect(getByText('Large')).toBeOnTheScreen();
    });

    it('renders buttons with width configuration', () => {
      // Arrange
      const buttons = [
        {
          label: 'Buy',
          size: ButtonSize.Lg,
          width: ButtonWidthTypes.Full,
          onPress: mockOnPress,
        },
      ];

      // Act
      const { getByText } = render(<StickyBottomBar buttons={buttons} />);

      // Assert
      expect(getByText('Buy')).toBeOnTheScreen();
    });

    it('renders buttons with disabled state', () => {
      // Arrange
      const buttons = [
        {
          label: 'Buy',
          size: ButtonSize.Lg,
          onPress: mockOnPress,
          isDisabled: true,
        },
      ];

      // Act
      const { getByText } = render(<StickyBottomBar buttons={buttons} />);

      // Assert
      expect(getByText('Buy')).toBeOnTheScreen();
    });

    it('renders buttons with loading state', () => {
      // Arrange
      const buttons = [
        {
          label: 'Buy',
          size: ButtonSize.Lg,
          onPress: mockOnPress,
          loading: true,
        },
      ];

      // Act
      const { getByText } = render(<StickyBottomBar buttons={buttons} />);

      // Assert
      expect(getByText('Buy')).toBeOnTheScreen();
    });
  });

  describe('Custom Styling', () => {
    it('applies custom style prop to container', () => {
      // Arrange
      const buttons = [
        {
          label: 'Buy',
          size: ButtonSize.Lg,
          onPress: mockOnPress,
        },
      ];
      const customStyle = { backgroundColor: 'red' };

      // Act
      const { getByTestId } = render(
        <StickyBottomBar buttons={buttons} style={customStyle} />,
      );
      const container = getByTestId('sticky-bottom-bar');

      // Assert
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.anything(),
          expect.anything(),
          customStyle,
        ]),
      );
    });

    it('applies custom style to individual buttons', () => {
      // Arrange
      const customButtonStyle = { marginTop: 10 };
      const buttons = [
        {
          label: 'Buy',
          size: ButtonSize.Lg,
          onPress: mockOnPress,
          style: customButtonStyle,
        },
      ];

      // Act
      const { getByText } = render(<StickyBottomBar buttons={buttons} />);

      // Assert
      expect(getByText('Buy')).toBeOnTheScreen();
    });
  });
});

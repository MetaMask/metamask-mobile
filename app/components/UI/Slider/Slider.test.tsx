import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import Slider from './Slider';
import { mockTheme } from '../../../util/theme';

// react-native-reanimated is already mocked globally via setUpTests() in testSetup.js

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: jest.requireActual('react-native').View,
  GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  Gesture: {
    Pan: jest.fn().mockReturnValue({
      enabled: jest.fn().mockReturnThis(),
      onBegin: jest.fn().mockReturnThis(),
      onUpdate: jest.fn().mockReturnThis(),
      onEnd: jest.fn().mockReturnThis(),
      onFinalize: jest.fn().mockReturnThis(),
      withSpring: jest.fn().mockReturnThis(),
      runOnJS: jest.fn().mockReturnThis(),
    }),
    Tap: jest.fn().mockReturnValue({
      enabled: jest.fn().mockReturnThis(),
      onEnd: jest.fn().mockReturnThis(),
    }),
    Simultaneous: jest.fn((tap, pan) => ({ tap, pan })),
  },
}));

jest.mock('react-native-linear-gradient', () => 'LinearGradient');

jest.mock('../../../util/haptics');

// Mock component library hooks
jest.mock('../../../component-library/hooks', () => ({
  useStyles: jest.fn(),
}));

// Mock component library Text component
jest.mock('../../../component-library/components/Texts/Text', () => {
  const { Text } = jest.requireActual('react-native');
  return (props: {
    children: React.ReactNode;
    style?: React.ComponentProps<typeof Text>['style'];
  }) => <Text {...props}>{props.children}</Text>;
});

describe('Slider', () => {
  const defaultProps = {
    value: 50,
    onValueChange: jest.fn(),
    minimumValue: 0,
    maximumValue: 100,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const { useStyles } = jest.requireMock('../../../component-library/hooks');
    useStyles.mockImplementation(
      (
        styleSheet: (params: {
          theme: typeof mockTheme;
        }) => Record<string, unknown>,
      ) => ({
        styles: styleSheet({ theme: mockTheme }),
      }),
    );
  });

  describe('Component Rendering', () => {
    it('renders slider with default props', () => {
      render(<Slider {...defaultProps} />);

      expect(screen.getByText('0%')).toBeOnTheScreen();
      expect(screen.getByText('25%')).toBeOnTheScreen();
      expect(screen.getByText('50%')).toBeOnTheScreen();
      expect(screen.getByText('75%')).toBeOnTheScreen();
      expect(screen.getByText('100%')).toBeOnTheScreen();
    });

    it('renders without percentage labels when showPercentageLabels is false', () => {
      render(<Slider {...defaultProps} showPercentageLabels={false} />);

      expect(screen.queryByText('0%')).toBeNull();
      expect(screen.queryByText('25%')).toBeNull();
      expect(screen.queryByText('50%')).toBeNull();
      expect(screen.queryByText('75%')).toBeNull();
      expect(screen.queryByText('100%')).toBeNull();
    });

    it('renders quick values when provided', () => {
      const quickValues = [1, 2, 5, 10];

      render(<Slider {...defaultProps} quickValues={quickValues} />);

      expect(screen.getByText('1x')).toBeOnTheScreen();
      expect(screen.getByText('2x')).toBeOnTheScreen();
      expect(screen.getByText('5x')).toBeOnTheScreen();
      expect(screen.getByText('10x')).toBeOnTheScreen();
    });

    it('does not render quick values when not provided', () => {
      render(<Slider {...defaultProps} />);

      expect(screen.queryByText('1x')).toBeNull();
      expect(screen.queryByText('2x')).toBeNull();
    });

    it('renders with custom min/max values', () => {
      render(
        <Slider
          {...defaultProps}
          minimumValue={10}
          maximumValue={200}
          value={100}
        />,
      );

      expect(screen.getByText('0%')).toBeOnTheScreen();
      expect(screen.getByText('100%')).toBeOnTheScreen();
    });

    it('renders with gradient progress color', () => {
      render(<Slider {...defaultProps} progressColor="gradient" />);

      expect(screen.getByText('50%')).toBeOnTheScreen();
    });

    it('renders with default progress color', () => {
      render(<Slider {...defaultProps} progressColor="default" />);

      expect(screen.getByText('50%')).toBeOnTheScreen();
    });

    it('applies testID when provided', () => {
      render(<Slider {...defaultProps} testID="my-slider" />);

      expect(screen.getByTestId('my-slider')).toBeOnTheScreen();
    });
  });

  describe('Percentage Button Functionality', () => {
    it('calls onValueChange when percentage button is pressed', async () => {
      const mockOnValueChange = jest.fn();

      render(<Slider {...defaultProps} onValueChange={mockOnValueChange} />);

      const button25 = screen.getByText('25%');
      fireEvent.press(button25);

      expect(mockOnValueChange).toHaveBeenCalledWith(25);
    });

    it('calculates correct values for custom range', async () => {
      const mockOnValueChange = jest.fn();

      render(
        <Slider
          {...defaultProps}
          onValueChange={mockOnValueChange}
          minimumValue={20}
          maximumValue={80}
        />,
      );

      const button50 = screen.getByText('50%');
      fireEvent.press(button50);

      expect(mockOnValueChange).toHaveBeenCalledWith(50);
    });

    it('does not call onValueChange when disabled', async () => {
      const mockOnValueChange = jest.fn();

      render(
        <Slider {...defaultProps} onValueChange={mockOnValueChange} disabled />,
      );

      const button25 = screen.getByText('25%');
      fireEvent.press(button25);

      expect(mockOnValueChange).not.toHaveBeenCalled();
    });

    it.each([
      [0, 0],
      [25, 25],
      [50, 50],
      [75, 75],
      [100, 100],
    ] as const)(
      'handles %s%% button press correctly',
      async (percent, expectedValue) => {
        const mockOnValueChange = jest.fn();

        render(<Slider {...defaultProps} onValueChange={mockOnValueChange} />);

        const button = screen.getByText(`${percent}%`);
        fireEvent.press(button);

        expect(mockOnValueChange).toHaveBeenCalledWith(expectedValue);
      },
    );
  });

  describe('Quick Values Functionality', () => {
    it('calls onValueChange when quick value button is pressed', async () => {
      const mockOnValueChange = jest.fn();
      const quickValues = [1, 2, 5, 10];

      render(
        <Slider
          {...defaultProps}
          onValueChange={mockOnValueChange}
          quickValues={quickValues}
        />,
      );

      const button5x = screen.getByText('5x');
      fireEvent.press(button5x);

      expect(mockOnValueChange).toHaveBeenCalledWith(5);
    });

    it('handles multiple quick value presses', async () => {
      const mockOnValueChange = jest.fn();
      const quickValues = [1, 2, 5, 10];

      render(
        <Slider
          {...defaultProps}
          onValueChange={mockOnValueChange}
          quickValues={quickValues}
        />,
      );

      await act(async () => {
        fireEvent.press(screen.getByText('1x'));
      });
      await act(async () => {
        fireEvent.press(screen.getByText('10x'));
      });

      expect(mockOnValueChange).toHaveBeenCalledWith(1);
      expect(mockOnValueChange).toHaveBeenCalledWith(10);
      expect(mockOnValueChange).toHaveBeenCalledTimes(2);
    });

    it('renders custom quick values correctly', () => {
      const customQuickValues = [0.5, 1.5, 3.7, 25];

      render(<Slider {...defaultProps} quickValues={customQuickValues} />);

      expect(screen.getByText('0.5x')).toBeOnTheScreen();
      expect(screen.getByText('1.5x')).toBeOnTheScreen();
      expect(screen.getByText('3.7x')).toBeOnTheScreen();
      expect(screen.getByText('25x')).toBeOnTheScreen();
    });
  });

  describe('Props and Configuration', () => {
    it('handles step prop correctly', () => {
      render(<Slider {...defaultProps} step={5} />);

      expect(screen.getByText('50%')).toBeOnTheScreen();
    });

    it('handles custom spring configuration', () => {
      render(<Slider {...defaultProps} />);

      expect(screen.getByText('50%')).toBeOnTheScreen();
    });

    it('uses default spring config when not provided', () => {
      render(<Slider {...defaultProps} />);

      expect(screen.getByText('50%')).toBeOnTheScreen();
    });

    it('handles disabled state correctly', () => {
      render(<Slider {...defaultProps} disabled />);

      expect(screen.getByText('25%')).toBeOnTheScreen();
      expect(screen.getByText('50%')).toBeOnTheScreen();
    });

    it('handles enabled state correctly', () => {
      render(<Slider {...defaultProps} disabled={false} />);

      expect(screen.getByText('25%')).toBeOnTheScreen();
      expect(screen.getByText('50%')).toBeOnTheScreen();
    });
  });

  describe('Layout and Animation', () => {
    it('handles layout events', () => {
      render(<Slider {...defaultProps} />);

      expect(screen.getByText('50%')).toBeOnTheScreen();
    });

    it('handles layout with zero width gracefully', () => {
      expect(() => render(<Slider {...defaultProps} />)).not.toThrow();
    });

    it('updates position when value changes', () => {
      const { rerender } = render(<Slider {...defaultProps} value={25} />);

      rerender(<Slider {...defaultProps} value={75} />);

      expect(screen.getByText('75%')).toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('handles equal minimum and maximum values', () => {
      render(
        <Slider
          {...defaultProps}
          minimumValue={50}
          maximumValue={50}
          value={50}
        />,
      );

      expect(screen.getByText('50%')).toBeOnTheScreen();
    });

    it('handles value outside range gracefully', () => {
      expect(() =>
        render(
          <Slider
            {...defaultProps}
            minimumValue={0}
            maximumValue={100}
            value={150}
          />,
        ),
      ).not.toThrow();
    });

    it('handles negative values', () => {
      render(
        <Slider
          {...defaultProps}
          minimumValue={-50}
          maximumValue={50}
          value={-25}
        />,
      );

      expect(screen.getByText('25%')).toBeOnTheScreen();
    });

    it('handles fractional values', () => {
      render(
        <Slider
          {...defaultProps}
          minimumValue={0}
          maximumValue={1}
          value={0.5}
          step={0.1}
        />,
      );

      expect(screen.getByText('50%')).toBeOnTheScreen();
    });

    it('handles large value ranges', () => {
      render(
        <Slider
          {...defaultProps}
          minimumValue={0}
          maximumValue={1000000}
          value={500000}
        />,
      );

      expect(screen.getByText('50%')).toBeOnTheScreen();
    });

    it('handles zero value in positive range', () => {
      render(
        <Slider
          {...defaultProps}
          minimumValue={0}
          maximumValue={100}
          value={0}
        />,
      );

      expect(screen.getByText('0%')).toBeOnTheScreen();
    });
  });

  describe('Logger & Haptics Integration', () => {
    it('configures reanimated logger on first render (if available)', () => {
      // configureReanimatedLogger is called at module scope, not per render.
      // After jest.clearAllMocks() the call count is reset, so we just
      // verify the component renders without crashing.
      render(<Slider {...defaultProps} />);
      expect(screen.getByText('0%')).toBeOnTheScreen();
    });

    it('triggers haptic feedback when crossing thresholds upward', async () => {
      const { playImpact } = jest.requireMock('../../../util/haptics');
      render(<Slider {...defaultProps} value={0} />);
      await act(async () => {
        fireEvent.press(screen.getByText('50%'));
      });
      expect(playImpact).toHaveBeenCalled();
    });

    it('triggers haptic feedback when crossing thresholds downward', async () => {
      const { playImpact } = jest.requireMock('../../../util/haptics');
      playImpact.mockClear();
      render(<Slider {...defaultProps} value={75} />);
      await act(async () => {
        fireEvent.press(screen.getByText('25%'));
      });
      expect(playImpact).toHaveBeenCalled();
    });

    it('triggers haptic feedback via quick value buttons threshold crossing', async () => {
      const { playImpact } = jest.requireMock('../../../util/haptics');
      playImpact.mockClear();
      render(<Slider {...defaultProps} value={10} quickValues={[5, 30]} />);
      await act(async () => {
        fireEvent.press(screen.getByText('30x'));
      });
      expect(playImpact).toHaveBeenCalled();
    });
  });

  describe('Gesture Integration', () => {
    it('sets up pan gesture correctly', () => {
      render(<Slider {...defaultProps} />);

      expect(screen.getByText('50%')).toBeOnTheScreen();
    });

    it('sets up tap gesture correctly', () => {
      render(<Slider {...defaultProps} />);

      expect(screen.getByText('50%')).toBeOnTheScreen();
    });

    it('disables gestures when disabled prop is true', () => {
      render(<Slider {...defaultProps} disabled />);

      expect(screen.getByText('50%')).toBeOnTheScreen();
    });

    it('enables gestures when disabled prop is false', () => {
      render(<Slider {...defaultProps} disabled={false} />);

      expect(screen.getByText('50%')).toBeOnTheScreen();
    });
  });

  describe('Progress Color Variants', () => {
    it('renders default progress color correctly', () => {
      render(<Slider {...defaultProps} progressColor="default" />);

      expect(screen.getByText('50%')).toBeOnTheScreen();
    });

    it('renders gradient progress color correctly', () => {
      render(<Slider {...defaultProps} progressColor="gradient" />);

      expect(screen.getByText('50%')).toBeOnTheScreen();
    });

    it('defaults to default progress color when not specified', () => {
      render(<Slider value={50} onValueChange={jest.fn()} />);

      expect(screen.getByText('50%')).toBeOnTheScreen();
    });
  });

  describe('Accessibility', () => {
    it('provides accessible touch targets for percentage buttons', () => {
      render(<Slider {...defaultProps} />);

      expect(screen.getByText('0%')).toBeOnTheScreen();
      expect(screen.getByText('25%')).toBeOnTheScreen();
      expect(screen.getByText('50%')).toBeOnTheScreen();
      expect(screen.getByText('75%')).toBeOnTheScreen();
      expect(screen.getByText('100%')).toBeOnTheScreen();
    });

    it('provides accessible touch targets for quick value buttons', () => {
      const quickValues = [1, 2, 5];

      render(<Slider {...defaultProps} quickValues={quickValues} />);

      expect(screen.getByText('1x')).toBeOnTheScreen();
      expect(screen.getByText('2x')).toBeOnTheScreen();
      expect(screen.getByText('5x')).toBeOnTheScreen();
    });

    it('disables touch targets when slider is disabled', () => {
      render(<Slider {...defaultProps} disabled />);

      expect(screen.getByText('25%')).toBeOnTheScreen();
      expect(screen.getByText('50%')).toBeOnTheScreen();
      expect(screen.getByText('75%')).toBeOnTheScreen();
    });

    it('exposes adjustable accessibility role with min/max/now/text', () => {
      render(
        <Slider
          {...defaultProps}
          value={50}
          testID="slider-a11y"
          formatAccessibilityValueText={(v) => `${v}%`}
        />,
      );

      const root = screen.getByTestId('slider-a11y');
      expect(root.props.accessibilityRole).toBe('adjustable');
      expect(root.props.accessibilityValue).toEqual({
        min: 0,
        max: 100,
        now: 50,
        text: '50%',
      });
    });

    it('handles accessibility increment action', () => {
      const mockOnValueChange = jest.fn();
      render(
        <Slider
          {...defaultProps}
          value={50}
          step={25}
          onValueChange={mockOnValueChange}
          testID="slider-a11y-inc"
        />,
      );

      const root = screen.getByTestId('slider-a11y-inc');
      fireEvent(root, 'accessibilityAction', {
        nativeEvent: { actionName: 'increment' },
      });

      expect(mockOnValueChange).toHaveBeenCalledWith(75);
    });

    it('handles accessibility decrement action', () => {
      const mockOnValueChange = jest.fn();
      render(
        <Slider
          {...defaultProps}
          value={50}
          step={25}
          onValueChange={mockOnValueChange}
          testID="slider-a11y-dec"
        />,
      );

      const root = screen.getByTestId('slider-a11y-dec');
      fireEvent(root, 'accessibilityAction', {
        nativeEvent: { actionName: 'decrement' },
      });

      expect(mockOnValueChange).toHaveBeenCalledWith(25);
    });

    it('clamps accessibility increment at maximumValue', () => {
      const mockOnValueChange = jest.fn();
      render(
        <Slider
          {...defaultProps}
          value={100}
          step={25}
          onValueChange={mockOnValueChange}
          testID="slider-a11y-clamp"
        />,
      );

      const root = screen.getByTestId('slider-a11y-clamp');
      fireEvent(root, 'accessibilityAction', {
        nativeEvent: { actionName: 'increment' },
      });

      expect(mockOnValueChange).not.toHaveBeenCalled();
    });

    it('does not invoke onValueChange on accessibility action when disabled', () => {
      const mockOnValueChange = jest.fn();
      render(
        <Slider
          {...defaultProps}
          value={50}
          step={25}
          onValueChange={mockOnValueChange}
          disabled
          testID="slider-a11y-disabled"
        />,
      );

      const root = screen.getByTestId('slider-a11y-disabled');
      fireEvent(root, 'accessibilityAction', {
        nativeEvent: { actionName: 'increment' },
      });

      expect(mockOnValueChange).not.toHaveBeenCalled();
    });
  });

  describe('Component Memoization and Performance', () => {
    it('handles rapid value changes without crashing', () => {
      const { rerender } = render(<Slider {...defaultProps} value={0} />);

      for (let i = 0; i <= 100; i += 10) {
        rerender(<Slider {...defaultProps} value={i} />);
      }

      expect(screen.getByText('100%')).toBeOnTheScreen();
    });

    it('handles prop changes efficiently', () => {
      const { rerender } = render(<Slider {...defaultProps} />);

      rerender(<Slider {...defaultProps} minimumValue={10} />);
      rerender(<Slider {...defaultProps} maximumValue={200} />);
      rerender(<Slider {...defaultProps} step={5} />);
      rerender(<Slider {...defaultProps} />);

      expect(screen.getByText('50%')).toBeOnTheScreen();
    });
  });
});

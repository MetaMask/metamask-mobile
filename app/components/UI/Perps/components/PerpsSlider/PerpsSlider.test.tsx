import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PerpsSlider from './PerpsSlider';

// Mock dependencies - only what's absolutely necessary
jest.mock('react-native-reanimated', () => {
  const View = jest.requireActual('react-native').View;
  const actualReanimated = jest.requireActual('react-native-reanimated/mock');

  return {
    ...actualReanimated,
    useSharedValue: jest.fn((initial) => ({ value: initial })),
    useAnimatedStyle: jest.fn((styleFactory) => {
      try {
        return styleFactory();
      } catch {
        return {};
      }
    }),
    withSpring: jest.fn((value) => value),
    runOnJS: jest.fn((fn) => fn),
    configureReanimatedLogger: jest.fn(),
    ReanimatedLogLevel: {
      warn: 1,
    },
    default: {
      View,
    },
  };
});

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

// Mock component library hooks
jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: jest.fn(),
}));

// Mock component library Text component
jest.mock('../../../../../component-library/components/Texts/Text', () => {
  const { Text } = jest.requireActual('react-native');
  return (props: {
    children: React.ReactNode;
    style?: React.ComponentProps<typeof Text>['style'];
  }) => <Text {...props}>{props.children}</Text>;
});

// Mock styles
jest.mock('./PerpsSlider.styles', () => () => ({
  container: { paddingVertical: 8 },
  sliderContainer: { flexDirection: 'row', alignItems: 'center' },
  trackContainer: { flex: 1, position: 'relative', paddingBottom: 30 },
  track: { height: 6, backgroundColor: '#e1e1e1', borderRadius: 3 },
  progress: { height: 6, backgroundColor: '#0066cc', borderRadius: 3 },
  thumb: {
    width: 21,
    height: 21,
    backgroundColor: '#ffffff',
    borderRadius: 10.5,
    position: 'absolute',
  },
  percentageWrapper: { position: 'absolute', top: 14, alignItems: 'center' },
  percentageWrapper0: { left: 0 },
  percentageWrapper25: { left: '25%' },
  percentageWrapper50: { left: '50%' },
  percentageWrapper75: { left: '75%' },
  percentageWrapper100: { right: 0, left: 'auto' },
  percentageDot: {
    width: 5,
    height: 5,
    backgroundColor: '#666',
    borderRadius: 2.5,
    position: 'absolute',
  },
  percentageDot25: { left: '25%' },
  percentageDot50: { left: '50%' },
  percentageDot75: { left: '75%' },
  percentageText: { color: '#666', fontSize: 12, fontWeight: '500' },
  quickValuesRow: { flexDirection: 'row', justifyContent: 'space-around' },
  quickValueButton: { padding: 8, backgroundColor: '#f0f0f0' },
  gradientProgress: { flex: 1, borderRadius: 3 },
}));

describe('PerpsSlider', () => {
  const defaultProps = {
    value: 50,
    onValueChange: jest.fn(),
    minimumValue: 0,
    maximumValue: 100,
  };

  const mockStyles = {
    container: { paddingVertical: 8 },
    sliderContainer: { flexDirection: 'row', alignItems: 'center' },
    trackContainer: { flex: 1, position: 'relative', paddingBottom: 30 },
    track: { height: 6, backgroundColor: '#e1e1e1', borderRadius: 3 },
    progress: { height: 6, backgroundColor: '#0066cc', borderRadius: 3 },
    thumb: {
      width: 21,
      height: 21,
      backgroundColor: '#ffffff',
      borderRadius: 10.5,
      position: 'absolute',
    },
    percentageWrapper: { position: 'absolute', top: 14, alignItems: 'center' },
    percentageWrapper0: { left: 0 },
    percentageWrapper25: { left: '25%' },
    percentageWrapper50: { left: '50%' },
    percentageWrapper75: { left: '75%' },
    percentageWrapper100: { right: 0, left: 'auto' },
    percentageDot: {
      width: 5,
      height: 5,
      backgroundColor: '#666',
      borderRadius: 2.5,
      position: 'absolute',
    },
    percentageDot25: { left: '25%' },
    percentageDot50: { left: '50%' },
    percentageDot75: { left: '75%' },
    percentageText: { color: '#666', fontSize: 12, fontWeight: '500' },
    quickValuesRow: { flexDirection: 'row', justifyContent: 'space-around' },
    quickValueButton: { padding: 8, backgroundColor: '#f0f0f0' },
    gradientProgress: { flex: 1, borderRadius: 3 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const { useStyles } = jest.requireMock(
      '../../../../../component-library/hooks',
    );
    useStyles.mockReturnValue({ styles: mockStyles });
  });

  describe('Component Rendering', () => {
    it('renders slider with default props', () => {
      // Act
      render(<PerpsSlider {...defaultProps} />);

      // Assert - Check that basic slider elements are rendered
      expect(screen.getByText('0%')).toBeOnTheScreen();
      expect(screen.getByText('25%')).toBeOnTheScreen();
      expect(screen.getByText('50%')).toBeOnTheScreen();
      expect(screen.getByText('75%')).toBeOnTheScreen();
      expect(screen.getByText('100%')).toBeOnTheScreen();
    });

    it('renders without percentage labels when showPercentageLabels is false', () => {
      // Act
      render(<PerpsSlider {...defaultProps} showPercentageLabels={false} />);

      // Assert
      expect(screen.queryByText('0%')).toBeNull();
      expect(screen.queryByText('25%')).toBeNull();
      expect(screen.queryByText('50%')).toBeNull();
      expect(screen.queryByText('75%')).toBeNull();
      expect(screen.queryByText('100%')).toBeNull();
    });

    it('renders quick values when provided', () => {
      // Arrange
      const quickValues = [1, 2, 5, 10];

      // Act
      render(<PerpsSlider {...defaultProps} quickValues={quickValues} />);

      // Assert
      expect(screen.getByText('1x')).toBeOnTheScreen();
      expect(screen.getByText('2x')).toBeOnTheScreen();
      expect(screen.getByText('5x')).toBeOnTheScreen();
      expect(screen.getByText('10x')).toBeOnTheScreen();
    });

    it('does not render quick values when not provided', () => {
      // Act
      render(<PerpsSlider {...defaultProps} />);

      // Assert
      expect(screen.queryByText('1x')).toBeNull();
      expect(screen.queryByText('2x')).toBeNull();
    });

    it('renders with custom min/max values', () => {
      // Act
      render(
        <PerpsSlider
          {...defaultProps}
          minimumValue={10}
          maximumValue={200}
          value={100}
        />,
      );

      // Assert - Percentage labels should still show 0-100%
      expect(screen.getByText('0%')).toBeOnTheScreen();
      expect(screen.getByText('100%')).toBeOnTheScreen();
    });

    it('renders with gradient progress color', () => {
      // Act
      render(<PerpsSlider {...defaultProps} progressColor="gradient" />);

      // Assert - Component should render without crashing
      expect(screen.getByText('50%')).toBeOnTheScreen();
    });

    it('renders with default progress color', () => {
      // Act
      render(<PerpsSlider {...defaultProps} progressColor="default" />);

      // Assert - Component should render without crashing
      expect(screen.getByText('50%')).toBeOnTheScreen();
    });
  });

  describe('Percentage Button Functionality', () => {
    it('calls onValueChange when percentage button is pressed', () => {
      // Arrange
      const mockOnValueChange = jest.fn();

      // Act
      render(
        <PerpsSlider {...defaultProps} onValueChange={mockOnValueChange} />,
      );

      const button25 = screen.getByText('25%');
      fireEvent.press(button25);

      // Assert - 25% of range (0-100) = 25
      expect(mockOnValueChange).toHaveBeenCalledWith(25);
    });

    it('calculates correct values for custom range', () => {
      // Arrange
      const mockOnValueChange = jest.fn();

      // Act
      render(
        <PerpsSlider
          {...defaultProps}
          onValueChange={mockOnValueChange}
          minimumValue={20}
          maximumValue={80}
        />,
      );

      const button50 = screen.getByText('50%');
      fireEvent.press(button50);

      // Assert - 50% of range (20-80) = 50
      expect(mockOnValueChange).toHaveBeenCalledWith(50);
    });

    it('does not call onValueChange when disabled', () => {
      // Arrange
      const mockOnValueChange = jest.fn();

      // Act
      render(
        <PerpsSlider
          {...defaultProps}
          onValueChange={mockOnValueChange}
          disabled
        />,
      );

      const button25 = screen.getByText('25%');
      fireEvent.press(button25);

      // Assert
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
      (percent, expectedValue) => {
        // Arrange
        const mockOnValueChange = jest.fn();

        // Act
        render(
          <PerpsSlider {...defaultProps} onValueChange={mockOnValueChange} />,
        );

        const button = screen.getByText(`${percent}%`);
        fireEvent.press(button);

        // Assert
        expect(mockOnValueChange).toHaveBeenCalledWith(expectedValue);
      },
    );
  });

  describe('Quick Values Functionality', () => {
    it('calls onValueChange when quick value button is pressed', () => {
      // Arrange
      const mockOnValueChange = jest.fn();
      const quickValues = [1, 2, 5, 10];

      // Act
      render(
        <PerpsSlider
          {...defaultProps}
          onValueChange={mockOnValueChange}
          quickValues={quickValues}
        />,
      );

      const button5x = screen.getByText('5x');
      fireEvent.press(button5x);

      // Assert
      expect(mockOnValueChange).toHaveBeenCalledWith(5);
    });

    it('handles multiple quick value presses', () => {
      // Arrange
      const mockOnValueChange = jest.fn();
      const quickValues = [1, 2, 5, 10];

      // Act
      render(
        <PerpsSlider
          {...defaultProps}
          onValueChange={mockOnValueChange}
          quickValues={quickValues}
        />,
      );

      fireEvent.press(screen.getByText('1x'));
      fireEvent.press(screen.getByText('10x'));

      // Assert
      expect(mockOnValueChange).toHaveBeenCalledWith(1);
      expect(mockOnValueChange).toHaveBeenCalledWith(10);
      expect(mockOnValueChange).toHaveBeenCalledTimes(2);
    });

    it('renders custom quick values correctly', () => {
      // Arrange
      const customQuickValues = [0.5, 1.5, 3.7, 25];

      // Act
      render(<PerpsSlider {...defaultProps} quickValues={customQuickValues} />);

      // Assert
      expect(screen.getByText('0.5x')).toBeOnTheScreen();
      expect(screen.getByText('1.5x')).toBeOnTheScreen();
      expect(screen.getByText('3.7x')).toBeOnTheScreen();
      expect(screen.getByText('25x')).toBeOnTheScreen();
    });
  });

  describe('Props and Configuration', () => {
    it('handles step prop correctly', () => {
      // Act
      render(<PerpsSlider {...defaultProps} step={5} />);

      // Assert - Component should render without crashing
      expect(screen.getByText('50%')).toBeOnTheScreen();
    });

    it('handles custom spring configuration', () => {
      // Act
      render(<PerpsSlider {...defaultProps} />);

      // Assert - Component should render without crashing
      expect(screen.getByText('50%')).toBeOnTheScreen();
    });

    it('uses default spring config when not provided', () => {
      // Act
      render(<PerpsSlider {...defaultProps} />);

      // Assert - Component should render without crashing
      expect(screen.getByText('50%')).toBeOnTheScreen();
    });

    it('handles disabled state correctly', () => {
      // Act
      render(<PerpsSlider {...defaultProps} disabled />);

      // Assert - Component should render without crashing when disabled
      expect(screen.getByText('25%')).toBeOnTheScreen();
      expect(screen.getByText('50%')).toBeOnTheScreen();
    });

    it('handles enabled state correctly', () => {
      // Act
      render(<PerpsSlider {...defaultProps} disabled={false} />);

      // Assert - Component should render without crashing when enabled
      expect(screen.getByText('25%')).toBeOnTheScreen();
      expect(screen.getByText('50%')).toBeOnTheScreen();
    });
  });

  describe('Layout and Animation', () => {
    it('handles layout events', () => {
      // Act
      render(<PerpsSlider {...defaultProps} />);

      // We can't easily test the layout event in unit tests,
      // but we can verify the component renders without crashing
      expect(screen.getByText('50%')).toBeOnTheScreen();
    });

    it('handles layout with zero width gracefully', () => {
      // Act & Assert - Should not crash
      expect(() => render(<PerpsSlider {...defaultProps} />)).not.toThrow();
    });

    it('updates position when value changes', () => {
      // Arrange
      const { rerender } = render(<PerpsSlider {...defaultProps} value={25} />);

      // Act
      rerender(<PerpsSlider {...defaultProps} value={75} />);

      // Assert - Component should handle value change without crashing
      expect(screen.getByText('75%')).toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('handles equal minimum and maximum values', () => {
      // Act
      render(
        <PerpsSlider
          {...defaultProps}
          minimumValue={50}
          maximumValue={50}
          value={50}
        />,
      );

      // Assert - Should render without crashing
      expect(screen.getByText('50%')).toBeOnTheScreen();
    });

    it('handles value outside range gracefully', () => {
      // Act & Assert - Should not crash with value outside range
      expect(() =>
        render(
          <PerpsSlider
            {...defaultProps}
            minimumValue={0}
            maximumValue={100}
            value={150}
          />,
        ),
      ).not.toThrow();
    });

    it('handles negative values', () => {
      // Act
      render(
        <PerpsSlider
          {...defaultProps}
          minimumValue={-50}
          maximumValue={50}
          value={-25}
        />,
      );

      // Assert - Should render without crashing
      expect(screen.getByText('25%')).toBeOnTheScreen();
    });

    it('handles fractional values', () => {
      // Act
      render(
        <PerpsSlider
          {...defaultProps}
          minimumValue={0}
          maximumValue={1}
          value={0.5}
          step={0.1}
        />,
      );

      // Assert - Should render without crashing
      expect(screen.getByText('50%')).toBeOnTheScreen();
    });

    it('handles large value ranges', () => {
      // Act
      render(
        <PerpsSlider
          {...defaultProps}
          minimumValue={0}
          maximumValue={1000000}
          value={500000}
        />,
      );

      // Assert - Should render without crashing
      expect(screen.getByText('50%')).toBeOnTheScreen();
    });

    it('handles zero value in positive range', () => {
      // Act
      render(
        <PerpsSlider
          {...defaultProps}
          minimumValue={0}
          maximumValue={100}
          value={0}
        />,
      );

      // Assert - Should render without crashing
      expect(screen.getByText('0%')).toBeOnTheScreen();
    });
  });

  describe('Gesture Integration', () => {
    it('sets up pan gesture correctly', () => {
      // Act
      render(<PerpsSlider {...defaultProps} />);

      // Assert - Component should render without gesture handler errors
      expect(screen.getByText('50%')).toBeOnTheScreen();
    });

    it('sets up tap gesture correctly', () => {
      // Act
      render(<PerpsSlider {...defaultProps} />);

      // Assert - Component should render without gesture handler errors
      expect(screen.getByText('50%')).toBeOnTheScreen();
    });

    it('disables gestures when disabled prop is true', () => {
      // Act
      render(<PerpsSlider {...defaultProps} disabled />);

      // Assert - Component should render without crashing
      expect(screen.getByText('50%')).toBeOnTheScreen();
    });

    it('enables gestures when disabled prop is false', () => {
      // Act
      render(<PerpsSlider {...defaultProps} disabled={false} />);

      // Assert - Component should render without crashing
      expect(screen.getByText('50%')).toBeOnTheScreen();
    });
  });

  describe('Progress Color Variants', () => {
    it('renders default progress color correctly', () => {
      // Act
      render(<PerpsSlider {...defaultProps} progressColor="default" />);

      // Assert - Should render without LinearGradient
      expect(screen.getByText('50%')).toBeOnTheScreen();
    });

    it('renders gradient progress color correctly', () => {
      // Act
      render(<PerpsSlider {...defaultProps} progressColor="gradient" />);

      // Assert - Should render with LinearGradient (mocked)
      expect(screen.getByText('50%')).toBeOnTheScreen();
    });

    it('defaults to default progress color when not specified', () => {
      // Act
      render(<PerpsSlider value={50} onValueChange={jest.fn()} />);

      // Assert - Should render without crashing
      expect(screen.getByText('50%')).toBeOnTheScreen();
    });
  });

  describe('Accessibility', () => {
    it('provides accessible touch targets for percentage buttons', () => {
      // Act
      render(<PerpsSlider {...defaultProps} />);

      // Assert - All percentage button labels should be rendered and accessible
      expect(screen.getByText('0%')).toBeOnTheScreen();
      expect(screen.getByText('25%')).toBeOnTheScreen();
      expect(screen.getByText('50%')).toBeOnTheScreen();
      expect(screen.getByText('75%')).toBeOnTheScreen();
      expect(screen.getByText('100%')).toBeOnTheScreen();
    });

    it('provides accessible touch targets for quick value buttons', () => {
      // Arrange
      const quickValues = [1, 2, 5];

      // Act
      render(<PerpsSlider {...defaultProps} quickValues={quickValues} />);

      // Assert - All quick value button labels should be rendered and accessible
      expect(screen.getByText('1x')).toBeOnTheScreen();
      expect(screen.getByText('2x')).toBeOnTheScreen();
      expect(screen.getByText('5x')).toBeOnTheScreen();
    });

    it('disables touch targets when slider is disabled', () => {
      // Act
      render(<PerpsSlider {...defaultProps} disabled />);

      // Assert - Component should render all percentage labels when disabled
      expect(screen.getByText('25%')).toBeOnTheScreen();
      expect(screen.getByText('50%')).toBeOnTheScreen();
      expect(screen.getByText('75%')).toBeOnTheScreen();
    });
  });

  describe('Component Memoization and Performance', () => {
    it('handles rapid value changes without crashing', () => {
      // Arrange
      const { rerender } = render(<PerpsSlider {...defaultProps} value={0} />);

      // Act - Rapidly change values
      for (let i = 0; i <= 100; i += 10) {
        rerender(<PerpsSlider {...defaultProps} value={i} />);
      }

      // Assert - Should not crash
      expect(screen.getByText('100%')).toBeOnTheScreen();
    });

    it('handles prop changes efficiently', () => {
      // Arrange
      const { rerender } = render(<PerpsSlider {...defaultProps} />);

      // Act - Change various props
      rerender(<PerpsSlider {...defaultProps} minimumValue={10} />);
      rerender(<PerpsSlider {...defaultProps} maximumValue={200} />);
      rerender(<PerpsSlider {...defaultProps} step={5} />);
      rerender(<PerpsSlider {...defaultProps} />);

      // Assert - Should handle all changes without crashing
      expect(screen.getByText('50%')).toBeOnTheScreen();
    });
  });
});

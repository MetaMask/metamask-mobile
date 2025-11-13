import React from 'react';
import { render } from '@testing-library/react-native';
import { BridgeRewardsAnimation } from './BridgeRewardsAnimation';
import { useBridgeRewardsAnimation } from './useBridgeRewardsAnimation';
import { BridgeRewardAnimationState } from './types';

// Mock the hook
jest.mock('./useBridgeRewardsAnimation');

// Mock Rive
jest.mock('rive-react-native', () => ({
  __esModule: true,
  default: jest.fn(() => null),
  Alignment: { CenterRight: 'CenterRight' },
  Fit: { FitHeight: 'FitHeight' },
}));

// Mock design system
jest.mock('@metamask/design-system-react-native', () => ({
  Text: 'Text',
  TextVariant: {
    BodyMd: 'BodyMd',
  },
}));

// Mock theme
jest.mock('../../../../../util/theme', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      text: {
        default: '#000000',
        alternative: '#666666',
      },
    },
  })),
}));

// Mock useStyles
jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: jest.fn((styleSheet, vars) => {
    const mockTheme = {
      colors: {
        text: {
          default: '#000000',
          alternative: '#666666',
        },
      },
    };
    // Call styleSheet with proper structure
    const styles = styleSheet({ theme: mockTheme, vars });
    return {
      styles: {
        container: styles.container || {},
        riveIcon: styles.riveIcon || {},
        riveSize: styles.riveSize || { width: 16, height: 16 },
        textContainer: styles.textContainer || {},
        counterText: styles.counterText || {},
      },
    };
  }),
}));

const mockUseBridgeRewardsAnimation =
  useBridgeRewardsAnimation as jest.MockedFunction<
    typeof useBridgeRewardsAnimation
  >;

describe('BridgeRewardsAnimation', () => {
  const defaultHookReturn = {
    riveRef: { current: null },
    animatedStyle: { opacity: 1 },
    iconPosition: -20,
    displayValue: 0,
    displayText: null,
    hideValue: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBridgeRewardsAnimation.mockReturnValue(defaultHookReturn);
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(<BridgeRewardsAnimation value={0} />);

      expect(toJSON()).toBeTruthy();
    });

    it('renders with value', () => {
      mockUseBridgeRewardsAnimation.mockReturnValue({
        ...defaultHookReturn,
        displayValue: 100,
      });

      const { getByText } = render(<BridgeRewardsAnimation value={100} />);

      expect(getByText('100')).toBeTruthy();
    });

    it('renders formatted value', () => {
      mockUseBridgeRewardsAnimation.mockReturnValue({
        ...defaultHookReturn,
        displayValue: 1000,
      });

      const { getByText } = render(<BridgeRewardsAnimation value={1000} />);

      expect(getByText('1,000')).toBeTruthy();
    });
  });

  describe('Loading State', () => {
    it('hides value when hideValue is true', () => {
      mockUseBridgeRewardsAnimation.mockReturnValue({
        ...defaultHookReturn,
        hideValue: true,
        displayValue: 100,
      });

      const { queryByText } = render(
        <BridgeRewardsAnimation
          value={100}
          state={BridgeRewardAnimationState.Loading}
        />,
      );

      expect(queryByText('100')).toBeNull();
    });

    it('passes loading state to hook', () => {
      render(
        <BridgeRewardsAnimation
          value={100}
          state={BridgeRewardAnimationState.Loading}
        />,
      );

      expect(mockUseBridgeRewardsAnimation).toHaveBeenCalledWith({
        value: 100,
        state: BridgeRewardAnimationState.Loading,
      });
    });
  });

  describe('Idle State', () => {
    it('shows value in idle state', () => {
      mockUseBridgeRewardsAnimation.mockReturnValue({
        ...defaultHookReturn,
        displayValue: 50,
        hideValue: false,
      });

      const { getByText } = render(
        <BridgeRewardsAnimation
          value={50}
          state={BridgeRewardAnimationState.Idle}
        />,
      );

      expect(getByText('50')).toBeTruthy();
    });

    it('passes idle state to hook', () => {
      render(
        <BridgeRewardsAnimation
          value={50}
          state={BridgeRewardAnimationState.Idle}
        />,
      );

      expect(mockUseBridgeRewardsAnimation).toHaveBeenCalledWith({
        value: 50,
        state: BridgeRewardAnimationState.Idle,
      });
    });
  });

  describe('Error State', () => {
    it('shows error text', () => {
      mockUseBridgeRewardsAnimation.mockReturnValue({
        ...defaultHookReturn,
        displayText: "Couldn't Load",
        hideValue: false,
      });

      const { getByText } = render(
        <BridgeRewardsAnimation
          value={100}
          state={BridgeRewardAnimationState.ErrorState}
        />,
      );

      expect(getByText("Couldn't Load")).toBeTruthy();
    });

    it('passes error state to hook', () => {
      render(
        <BridgeRewardsAnimation
          value={100}
          state={BridgeRewardAnimationState.ErrorState}
        />,
      );

      expect(mockUseBridgeRewardsAnimation).toHaveBeenCalledWith({
        value: 100,
        state: BridgeRewardAnimationState.ErrorState,
      });
    });
  });

  describe('Icon Positioning', () => {
    it('applies correct icon position from hook', () => {
      mockUseBridgeRewardsAnimation.mockReturnValue({
        ...defaultHookReturn,
        iconPosition: 0,
      });

      render(<BridgeRewardsAnimation value={100} />);

      // Check that styles are computed with iconPosition
      expect(mockUseBridgeRewardsAnimation).toHaveBeenCalled();
    });

    it('handles negative icon position', () => {
      mockUseBridgeRewardsAnimation.mockReturnValue({
        ...defaultHookReturn,
        iconPosition: -20,
      });

      const { toJSON } = render(<BridgeRewardsAnimation value={100} />);

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Memoization', () => {
    it('does not re-render when unrelated props change', () => {
      const { rerender } = render(
        <BridgeRewardsAnimation
          value={100}
          state={BridgeRewardAnimationState.Idle}
        />,
      );

      const callCount = mockUseBridgeRewardsAnimation.mock.calls.length;

      // Re-render with same props
      rerender(
        <BridgeRewardsAnimation
          value={100}
          state={BridgeRewardAnimationState.Idle}
        />,
      );

      // Should not call hook again due to memoization
      expect(mockUseBridgeRewardsAnimation.mock.calls.length).toBe(callCount);
    });

    it('re-renders when value changes', () => {
      const { rerender } = render(<BridgeRewardsAnimation value={100} />);

      const callCount = mockUseBridgeRewardsAnimation.mock.calls.length;

      // Re-render with different value
      rerender(<BridgeRewardsAnimation value={200} />);

      // Should call hook again
      expect(mockUseBridgeRewardsAnimation.mock.calls.length).toBeGreaterThan(
        callCount,
      );
    });

    it('re-renders when state changes', () => {
      const { rerender } = render(
        <BridgeRewardsAnimation
          value={100}
          state={BridgeRewardAnimationState.Idle}
        />,
      );

      const callCount = mockUseBridgeRewardsAnimation.mock.calls.length;

      // Re-render with different state
      rerender(
        <BridgeRewardsAnimation
          value={100}
          state={BridgeRewardAnimationState.Loading}
        />,
      );

      // Should call hook again
      expect(mockUseBridgeRewardsAnimation.mock.calls.length).toBeGreaterThan(
        callCount,
      );
    });
  });

  describe('Text Display', () => {
    it('displays text when displayText is set', () => {
      mockUseBridgeRewardsAnimation.mockReturnValue({
        ...defaultHookReturn,
        displayText: 'Custom Text',
        hideValue: false,
      });

      const { getByText } = render(<BridgeRewardsAnimation value={100} />);

      expect(getByText('Custom Text')).toBeTruthy();
    });

    it('prioritizes displayText over displayValue', () => {
      mockUseBridgeRewardsAnimation.mockReturnValue({
        ...defaultHookReturn,
        displayText: 'Error Message',
        displayValue: 100,
        hideValue: false,
      });

      const { getByText, queryByText } = render(
        <BridgeRewardsAnimation value={100} />,
      );

      expect(getByText('Error Message')).toBeTruthy();
      expect(queryByText('100')).toBeNull();
    });

    it('shows empty string when hideValue is true', () => {
      mockUseBridgeRewardsAnimation.mockReturnValue({
        ...defaultHookReturn,
        displayValue: 100,
        hideValue: true,
      });

      const { getByText } = render(<BridgeRewardsAnimation value={100} />);

      expect(getByText('')).toBeTruthy();
    });
  });

  describe('Default State', () => {
    it('defaults to Idle state when state prop is not provided', () => {
      render(<BridgeRewardsAnimation value={100} />);

      expect(mockUseBridgeRewardsAnimation).toHaveBeenCalledWith({
        value: 100,
        state: BridgeRewardAnimationState.Idle,
      });
    });
  });
});

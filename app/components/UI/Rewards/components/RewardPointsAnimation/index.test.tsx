import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TextVariant } from '@metamask/design-system-react-native';
import RewardPointsAnimation, { RewardAnimationState } from './index';

jest.mock('../../hooks/useRewardsAnimation', () => ({
  useRewardsAnimation: jest.fn(),
  RewardAnimationState: {
    Loading: 'loading',
    ErrorState: 'error',
    Idle: 'idle',
  },
}));

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      outerContainer: {},
      container: {},
      riveIcon: {},
      counterText: {},
      infoIconContainer: {},
      infoIcon: {},
    },
  })),
}));

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

jest.mock('rive-react-native', () => ({
  __esModule: true,
  default: 'Rive',
  Alignment: { CenterRight: 'center-right' },
  Fit: { FitHeight: 'fit-height' },
}));

jest.mock('../../../../../animations/rewards_icon_animations.riv', () => ({}));

describe('RewardPointsAnimation', () => {
  const mockUseRewardsAnimation =
    // eslint-disable-next-line @typescript-eslint/no-require-imports, import/no-commonjs, @typescript-eslint/no-var-requires
    require('../../hooks/useRewardsAnimation').useRewardsAnimation;

  const defaultProps = {
    value: 1000,
  };

  const mockHookReturn = {
    riveRef: { current: null },
    animatedStyle: {},
    rivePositionStyle: {},
    displayValue: 1000,
    displayText: null,
    isAnimating: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRewardsAnimation.mockReturnValue(mockHookReturn);
  });

  describe('basic rendering', () => {
    it('renders with default props', () => {
      const { getByText } = render(<RewardPointsAnimation {...defaultProps} />);

      expect(getByText('1,000')).toBeOnTheScreen();
    });

    it('renders with custom value', () => {
      mockUseRewardsAnimation.mockReturnValue({
        ...mockHookReturn,
        displayValue: 5000,
      });

      const { getByText } = render(<RewardPointsAnimation value={5000} />);

      expect(getByText('5,000')).toBeOnTheScreen();
    });

    it('renders with zero value', () => {
      mockUseRewardsAnimation.mockReturnValue({
        ...mockHookReturn,
        displayValue: 0,
      });

      const { getByText } = render(<RewardPointsAnimation value={0} />);

      expect(getByText('0')).toBeOnTheScreen();
    });

    it('renders with large value', () => {
      mockUseRewardsAnimation.mockReturnValue({
        ...mockHookReturn,
        displayValue: 1234567,
      });

      const { getByText } = render(<RewardPointsAnimation value={1234567} />);

      expect(getByText('1,234,567')).toBeOnTheScreen();
    });
  });

  describe('animation states', () => {
    it('renders in idle state', () => {
      const { getByText } = render(
        <RewardPointsAnimation
          {...defaultProps}
          state={RewardAnimationState.Idle}
        />,
      );

      expect(getByText('1,000')).toBeOnTheScreen();
      expect(mockUseRewardsAnimation).toHaveBeenCalledWith({
        value: 1000,
        duration: 1000,
        state: RewardAnimationState.Idle,
      });
    });

    it('renders in loading state', () => {
      mockUseRewardsAnimation.mockReturnValue({
        ...mockHookReturn,
        displayValue: 0,
      });

      const { getByText } = render(
        <RewardPointsAnimation
          {...defaultProps}
          state={RewardAnimationState.Loading}
        />,
      );

      expect(getByText('0')).toBeOnTheScreen();
      expect(mockUseRewardsAnimation).toHaveBeenCalledWith({
        value: 1000,
        duration: 1000,
        state: RewardAnimationState.Loading,
      });
    });

    it('renders in error state with error text', () => {
      mockUseRewardsAnimation.mockReturnValue({
        ...mockHookReturn,
        displayText: "Couldn't Load",
      });

      const { getByText } = render(
        <RewardPointsAnimation
          {...defaultProps}
          state={RewardAnimationState.ErrorState}
        />,
      );

      expect(getByText("Couldn't Load")).toBeOnTheScreen();
      expect(mockUseRewardsAnimation).toHaveBeenCalledWith({
        value: 1000,
        duration: 1000,
        state: RewardAnimationState.ErrorState,
      });
    });
  });

  describe('custom props', () => {
    it('renders with custom duration', () => {
      render(<RewardPointsAnimation {...defaultProps} duration={2000} />);

      expect(mockUseRewardsAnimation).toHaveBeenCalledWith({
        value: 1000,
        duration: 2000,
        state: RewardAnimationState.Idle,
      });
    });

    it('renders with custom text variant', () => {
      const { getByText } = render(
        <RewardPointsAnimation
          {...defaultProps}
          variant={TextVariant.HeadingMd}
        />,
      );

      expect(getByText('1,000')).toBeOnTheScreen();
    });

    it('renders with custom height and width', () => {
      render(
        <RewardPointsAnimation {...defaultProps} height={24} width={24} />,
      );

      expect(mockUseRewardsAnimation).toHaveBeenCalled();
    });
  });

  describe('number formatting', () => {
    it('formats numbers with default locale', () => {
      mockUseRewardsAnimation.mockReturnValue({
        ...mockHookReturn,
        displayValue: 1234,
      });

      const { getByText } = render(<RewardPointsAnimation value={1234} />);

      expect(getByText('1,234')).toBeOnTheScreen();
    });

    it('formats numbers with custom locale', () => {
      mockUseRewardsAnimation.mockReturnValue({
        ...mockHookReturn,
        displayValue: 1234,
      });

      const { getByText } = render(
        <RewardPointsAnimation value={1234} locale="de-DE" />,
      );

      expect(getByText('1.234')).toBeOnTheScreen();
    });

    it('formats numbers with custom format options', () => {
      mockUseRewardsAnimation.mockReturnValue({
        ...mockHookReturn,
        displayValue: 1234.567,
      });

      const { getByText } = render(
        <RewardPointsAnimation
          value={1234.567}
          formatOptions={{ maximumFractionDigits: 2 }}
        />,
      );

      expect(getByText('1,234.57')).toBeOnTheScreen();
    });

    it('handles decimal values correctly', () => {
      mockUseRewardsAnimation.mockReturnValue({
        ...mockHookReturn,
        displayValue: 123.45,
      });

      const { getByText } = render(<RewardPointsAnimation value={123.45} />);

      expect(getByText('123.45')).toBeOnTheScreen();
    });
  });

  describe('error state interactions', () => {
    it('renders info icon when in error state with infoOnPress', () => {
      const mockInfoOnPress = jest.fn();
      mockUseRewardsAnimation.mockReturnValue({
        ...mockHookReturn,
        displayText: "Couldn't Load",
      });

      const { getByTestId } = render(
        <RewardPointsAnimation
          {...defaultProps}
          state={RewardAnimationState.ErrorState}
          infoOnPress={mockInfoOnPress}
        />,
      );

      expect(getByTestId('info-icon')).toBeOnTheScreen();
    });

    it('renders info icon when in error state with default noop callback', () => {
      mockUseRewardsAnimation.mockReturnValue({
        ...mockHookReturn,
        displayText: "Couldn't Load",
      });

      const { getByTestId } = render(
        <RewardPointsAnimation
          {...defaultProps}
          state={RewardAnimationState.ErrorState}
        />,
      );

      expect(getByTestId('info-icon')).toBeOnTheScreen();
    });

    it('does not render info icon when infoOnPress is explicitly null', () => {
      mockUseRewardsAnimation.mockReturnValue({
        ...mockHookReturn,
        displayText: "Couldn't Load",
      });

      const { queryByTestId } = render(
        <RewardPointsAnimation
          {...defaultProps}
          state={RewardAnimationState.ErrorState}
          infoOnPress={null as unknown as () => void}
        />,
      );

      expect(queryByTestId('info-icon')).toBeNull();
    });

    it('calls infoOnPress when info icon is pressed', () => {
      const mockInfoOnPress = jest.fn();
      mockUseRewardsAnimation.mockReturnValue({
        ...mockHookReturn,
        displayText: "Couldn't Load",
      });

      const { getByTestId } = render(
        <RewardPointsAnimation
          {...defaultProps}
          state={RewardAnimationState.ErrorState}
          infoOnPress={mockInfoOnPress}
        />,
      );

      fireEvent.press(getByTestId('info-icon'));

      expect(mockInfoOnPress).toHaveBeenCalledTimes(1);
    });

    it('does not render info icon when not in error state', () => {
      const { queryByTestId } = render(
        <RewardPointsAnimation
          {...defaultProps}
          state={RewardAnimationState.Idle}
        />,
      );

      expect(queryByTestId('info-icon')).toBeNull();
    });
  });

  describe('hook integration', () => {
    it('passes correct props to useRewardsAnimation hook', () => {
      const customProps = {
        value: 5000,
        duration: 1500,
        state: RewardAnimationState.Loading,
      };

      render(<RewardPointsAnimation {...customProps} />);

      expect(mockUseRewardsAnimation).toHaveBeenCalledWith({
        value: 5000,
        duration: 1500,
        state: RewardAnimationState.Loading,
      });
    });

    it('uses default values when props not provided', () => {
      render(<RewardPointsAnimation value={100} />);

      expect(mockUseRewardsAnimation).toHaveBeenCalledWith({
        value: 100,
        duration: 1000,
        state: RewardAnimationState.Idle,
      });
    });

    it('handles hook returning null displayText', () => {
      mockUseRewardsAnimation.mockReturnValue({
        ...mockHookReturn,
        displayText: null,
        displayValue: 999,
      });

      const { getByText } = render(<RewardPointsAnimation value={999} />);

      expect(getByText('999')).toBeOnTheScreen();
    });

    it('handles hook returning empty displayText', () => {
      mockUseRewardsAnimation.mockReturnValue({
        ...mockHookReturn,
        displayText: '',
        displayValue: 888,
      });

      const { getByText } = render(<RewardPointsAnimation value={888} />);

      expect(getByText('888')).toBeOnTheScreen();
    });
  });

  describe('edge cases', () => {
    it('handles negative values', () => {
      mockUseRewardsAnimation.mockReturnValue({
        ...mockHookReturn,
        displayValue: -100,
      });

      const { getByText } = render(<RewardPointsAnimation value={-100} />);

      expect(getByText('-100')).toBeOnTheScreen();
    });

    it('handles very large numbers', () => {
      const largeValue = 999999999;
      mockUseRewardsAnimation.mockReturnValue({
        ...mockHookReturn,
        displayValue: largeValue,
      });

      const { getByText } = render(
        <RewardPointsAnimation value={largeValue} />,
      );

      expect(getByText('999,999,999')).toBeOnTheScreen();
    });

    it('handles zero value correctly', () => {
      mockUseRewardsAnimation.mockReturnValue({
        ...mockHookReturn,
        displayValue: 0,
      });

      const { getByText } = render(<RewardPointsAnimation value={0} />);

      expect(getByText('0')).toBeOnTheScreen();
    });

    it('handles undefined infoOnPress gracefully', () => {
      mockUseRewardsAnimation.mockReturnValue({
        ...mockHookReturn,
        displayText: "Couldn't Load",
      });

      expect(() => {
        render(
          <RewardPointsAnimation
            {...defaultProps}
            state={RewardAnimationState.ErrorState}
            infoOnPress={undefined}
          />,
        );
      }).not.toThrow();
    });
  });

  describe('accessibility', () => {
    it('renders text with proper accessibility', () => {
      const { getByText } = render(<RewardPointsAnimation {...defaultProps} />);

      const textElement = getByText('1,000');
      expect(textElement).toBeOnTheScreen();
    });

    it('renders info icon with proper accessibility in error state', () => {
      const mockInfoOnPress = jest.fn();
      mockUseRewardsAnimation.mockReturnValue({
        ...mockHookReturn,
        displayText: "Couldn't Load",
      });

      const { getByTestId } = render(
        <RewardPointsAnimation
          {...defaultProps}
          state={RewardAnimationState.ErrorState}
          infoOnPress={mockInfoOnPress}
        />,
      );

      const infoIcon = getByTestId('info-icon');
      expect(infoIcon).toBeOnTheScreen();
    });
  });

  describe('performance', () => {
    it('memoizes number formatter correctly', () => {
      const { rerender } = render(
        <RewardPointsAnimation value={1000} locale="en-US" />,
      );

      rerender(<RewardPointsAnimation value={1000} locale="en-US" />);

      expect(mockUseRewardsAnimation).toHaveBeenCalledTimes(2);
    });

    it('updates when value changes', () => {
      const { rerender } = render(<RewardPointsAnimation value={1000} />);

      rerender(<RewardPointsAnimation value={2000} />);

      expect(mockUseRewardsAnimation).toHaveBeenCalledWith({
        value: 2000,
        duration: 1000,
        state: RewardAnimationState.Idle,
      });
    });

    it('updates when state changes', () => {
      const { rerender } = render(
        <RewardPointsAnimation
          value={1000}
          state={RewardAnimationState.Idle}
        />,
      );

      rerender(
        <RewardPointsAnimation
          value={1000}
          state={RewardAnimationState.Loading}
        />,
      );

      expect(mockUseRewardsAnimation).toHaveBeenCalledWith({
        value: 1000,
        duration: 1000,
        state: RewardAnimationState.Loading,
      });
    });
  });
});

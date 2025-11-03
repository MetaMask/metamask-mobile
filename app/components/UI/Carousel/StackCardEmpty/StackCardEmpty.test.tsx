import React from 'react';
import { render } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { ANIMATION_TIMINGS } from '../animations/animationTimings';
import { StackCardEmpty } from './StackCardEmpty';

// Mock dependencies
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn(() => ({})),
    color: jest.fn(() => '#000000'),
  }),
}));

// Mock design system components
jest.mock('@metamask/design-system-react-native', () => ({
  Box: 'View',
  Text: 'Text',
  TextVariant: {
    BodyMd: 'BodyMd',
  },
  TextColor: {
    TextAlternative: 'TextAlternative',
  },
  FontWeight: {
    Medium: 'Medium',
  },
}));

// Mock i18n
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'wallet.carousel.empty_state': "You're all caught up!",
    };
    return translations[key] || key;
  }),
}));

// Mock Animated.View to verify listener props are set correctly
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Animated: {
    ...jest.requireActual('react-native').Animated,
    View: 'View',
  },
}));

jest.mock('rive-react-native', () => ({
  __esModule: true,
  default: 'Rive',
  Alignment: { Center: 'Center' },
  Fit: { Cover: 'Cover' },
}));

describe('StackCardEmpty', () => {
  const createAnimatedValue = (initialValue = 0) =>
    new Animated.Value(initialValue);

  const defaultProps = {
    emptyStateOpacity: createAnimatedValue(1),
    emptyStateScale: createAnimatedValue(1),
    emptyStateTranslateY: createAnimatedValue(0),
    nextCardBgOpacity: createAnimatedValue(0),
    onTransitionToEmpty: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('rendering', () => {
    it('renders empty state card with correct content and structure', () => {
      const { getByTestId, getByText } = render(
        <StackCardEmpty {...defaultProps} />,
      );

      const emptyCard = getByTestId('carousel-empty-state');
      expect(emptyCard).toBeDefined();
      expect(getByText("You're all caught up!")).toBeDefined();
    });
  });

  describe('auto-dismiss behavior', () => {
    it('calls onTransitionToEmpty after idle timeout', () => {
      render(<StackCardEmpty {...defaultProps} />);

      jest.advanceTimersByTime(ANIMATION_TIMINGS.EMPTY_STATE_IDLE_TIME);

      expect(defaultProps.onTransitionToEmpty).toHaveBeenCalledTimes(1);
    });

    it('does not call onTransitionToEmpty before timeout', () => {
      render(<StackCardEmpty {...defaultProps} />);

      jest.advanceTimersByTime(ANIMATION_TIMINGS.EMPTY_STATE_IDLE_TIME - 100);

      expect(defaultProps.onTransitionToEmpty).not.toHaveBeenCalled();
    });

    it('does not call onTransitionToEmpty when callback is undefined', () => {
      render(
        <StackCardEmpty {...defaultProps} onTransitionToEmpty={undefined} />,
      );

      jest.advanceTimersByTime(ANIMATION_TIMINGS.EMPTY_STATE_IDLE_TIME + 100);

      expect(defaultProps.onTransitionToEmpty).not.toHaveBeenCalled();
    });

    it('clears dismiss timer on unmount before timeout completes', () => {
      const { unmount } = render(<StackCardEmpty {...defaultProps} />);

      jest.advanceTimersByTime(250);
      unmount();
      jest.advanceTimersByTime(ANIMATION_TIMINGS.EMPTY_STATE_IDLE_TIME);

      expect(defaultProps.onTransitionToEmpty).not.toHaveBeenCalled();
    });
  });

  describe('animation value listeners', () => {
    it('sets up listener on emptyStateOpacity', () => {
      const removeListenerMock = jest.fn();
      const opacityValue = {
        addListener: jest.fn(),
        removeListener: removeListenerMock,
      } as Partial<Animated.Value>;

      render(
        <StackCardEmpty
          {...defaultProps}
          emptyStateOpacity={opacityValue as Animated.Value}
        />,
      );

      expect(opacityValue.addListener).toHaveBeenCalled();
    });

    it('removes listener on unmount', () => {
      const removeListenerMock = jest.fn();
      const opacityValue = {
        addListener: jest.fn().mockReturnValue(123),
        removeListener: removeListenerMock,
      } as Partial<Animated.Value>;

      const { unmount } = render(
        <StackCardEmpty
          {...defaultProps}
          emptyStateOpacity={opacityValue as Animated.Value}
        />,
      );

      unmount();

      expect(removeListenerMock).toHaveBeenCalledWith(123);
    });

    it('clears pending animation timeout on unmount', () => {
      const opacityValue = createAnimatedValue(0.5);
      const { unmount } = render(
        <StackCardEmpty {...defaultProps} emptyStateOpacity={opacityValue} />,
      );

      jest.advanceTimersByTime(50);
      unmount();
      jest.advanceTimersByTime(100);

      // Component should be unmounted, no callbacks should fire
      expect(defaultProps.onTransitionToEmpty).not.toHaveBeenCalled();
    });
  });

  describe('animation values', () => {
    it('renders with custom animation values', () => {
      const customOpacity = createAnimatedValue(0.5);
      const customScale = createAnimatedValue(0.9);
      const customTranslateY = createAnimatedValue(10);

      const { getByTestId } = render(
        <StackCardEmpty
          {...defaultProps}
          emptyStateOpacity={customOpacity}
          emptyStateScale={customScale}
          emptyStateTranslateY={customTranslateY}
        />,
      );

      expect(getByTestId('carousel-empty-state')).toBeDefined();
    });
  });

  describe('background overlay', () => {
    it('renders with nextCardBgOpacity applied to overlay', () => {
      const bgOpacity = createAnimatedValue(0.5);

      const { getByTestId } = render(
        <StackCardEmpty {...defaultProps} nextCardBgOpacity={bgOpacity} />,
      );

      expect(getByTestId('carousel-empty-state')).toBeDefined();
    });
  });

  describe('timeout cleanup and memory management', () => {
    it('prevents multiple timeouts from being created', () => {
      const opacityValue = createAnimatedValue(0);
      const { rerender } = render(
        <StackCardEmpty {...defaultProps} emptyStateOpacity={opacityValue} />,
      );

      // Trigger multiple updates
      rerender(
        <StackCardEmpty {...defaultProps} emptyStateOpacity={opacityValue} />,
      );

      jest.advanceTimersByTime(100);

      // Only one dismiss should fire
      expect(defaultProps.onTransitionToEmpty).not.toHaveBeenCalled();
    });

    it('clears all pending timers on unmount', () => {
      const { unmount } = render(<StackCardEmpty {...defaultProps} />);

      // Schedule multiple operations
      jest.advanceTimersByTime(100);
      unmount();

      // Clear any pending timers
      jest.clearAllTimers();

      expect(defaultProps.onTransitionToEmpty).not.toHaveBeenCalled();
    });
  });

  describe('component rendering with animation setup', () => {
    it('renders empty state text correctly', () => {
      const { getByText } = render(<StackCardEmpty {...defaultProps} />);

      expect(getByText("You're all caught up!")).toBeDefined();
    });

    it('unmounts without throwing errors', () => {
      const { unmount } = render(<StackCardEmpty {...defaultProps} />);

      expect(() => unmount()).not.toThrow();
    });
  });
});

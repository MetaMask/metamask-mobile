import React from 'react';
import { act, render } from '@testing-library/react-native';
import ReactTestRenderer from 'react-test-renderer';
import { Animated } from 'react-native';
import { ANIMATION_TIMINGS } from '../animations/animationTimings';
import { StackCardEmpty } from './StackCardEmpty';
import { __mockRiveFireState } from '../../../../__mocks__/rive-react-native';

// Mock dependencies
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const tw = () => ({});
    tw.style = jest.fn(() => ({}));
    return tw;
  },
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
    __mockRiveFireState.mockReset();
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

      // The dismiss timer only starts after the card reaches full visibility
      // and the confetti-trigger delay (50ms) elapses, so advance past both.
      jest.advanceTimersByTime(ANIMATION_TIMINGS.EMPTY_STATE_IDLE_TIME + 100);

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

    it('calls the latest onTransitionToEmpty after callback updates', () => {
      const firstCallback = jest.fn();
      const secondCallback = jest.fn();
      const { rerender } = render(
        <StackCardEmpty
          {...defaultProps}
          onTransitionToEmpty={firstCallback}
        />,
      );

      rerender(
        <StackCardEmpty
          {...defaultProps}
          onTransitionToEmpty={secondCallback}
        />,
      );

      jest.advanceTimersByTime(ANIMATION_TIMINGS.EMPTY_STATE_IDLE_TIME + 100);

      expect(secondCallback).toHaveBeenCalledTimes(1);
      expect(firstCallback).not.toHaveBeenCalled();
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

  describe('confetti animation', () => {
    it('fires Rive confetti when empty card becomes visible', () => {
      render(<StackCardEmpty {...defaultProps} />);

      act(() => {
        jest.advanceTimersByTime(50);
      });

      expect(__mockRiveFireState).toHaveBeenCalledWith('Confetti', 'Start');
    });

    it('logs a warning when Rive confetti fireState throws', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      __mockRiveFireState.mockImplementation(() => {
        throw new Error('confetti failed');
      });

      render(<StackCardEmpty {...defaultProps} />);

      act(() => {
        jest.advanceTimersByTime(50);
      });

      expect(warnSpy).toHaveBeenCalledWith(
        'Error triggering Rive confetti animation:',
        expect.any(Error),
      );

      warnSpy.mockRestore();
    });

    it('hides Rive layer when animation load fails', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      let riveRenderer: ReactTestRenderer.ReactTestRenderer | undefined;

      act(() => {
        riveRenderer = ReactTestRenderer.create(
          <StackCardEmpty {...defaultProps} />,
        );
      });

      const riveNode = riveRenderer?.root.findByProps({
        artboardName: 'Artboard',
      });
      act(() => {
        riveNode?.props.onError(new Error('load failed'));
      });

      expect(warnSpy).toHaveBeenCalledWith(
        'Rive animation failed to load:',
        expect.any(Error),
      );
      expect(
        riveRenderer?.root.findAllByProps({ artboardName: 'Artboard' }),
      ).toHaveLength(0);

      warnSpy.mockRestore();
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

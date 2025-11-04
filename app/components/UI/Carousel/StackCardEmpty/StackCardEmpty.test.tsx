import React from 'react';
import { render } from '@testing-library/react-native';
import { Animated } from 'react-native';
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

jest.mock('../animations/animationTimings', () => ({
  ANIMATION_TIMINGS: {
    EMPTY_STATE_IDLE_TIME: 500,
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

describe('StackCardEmpty', () => {
  const defaultProps = {
    emptyStateOpacity: new Animated.Value(1),
    emptyStateScale: new Animated.Value(1),
    emptyStateTranslateY: new Animated.Value(0),
    nextCardBgOpacity: new Animated.Value(0),
    onTransitionToEmpty: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders empty state card with centered text', () => {
    const { getByText, getByTestId } = render(
      <StackCardEmpty {...defaultProps} />,
    );

    expect(getByText("You're all caught up!")).toBeTruthy();
    expect(getByTestId('carousel-empty-state')).toBeTruthy();
  });

  it('has proper styling with border and background', () => {
    const { getByTestId } = render(<StackCardEmpty {...defaultProps} />);

    const emptyCard = getByTestId('carousel-empty-state');
    expect(emptyCard).toBeTruthy();
  });

  it('auto-dismisses after idle time when onTransitionToEmpty is provided', () => {
    render(<StackCardEmpty {...defaultProps} />);

    // Fast-forward time
    jest.advanceTimersByTime(500);

    expect(defaultProps.onTransitionToEmpty).toHaveBeenCalled();
  });

  it('does not auto-dismiss when onTransitionToEmpty is not provided', () => {
    render(
      <StackCardEmpty {...defaultProps} onTransitionToEmpty={undefined} />,
    );

    // Fast-forward time
    jest.advanceTimersByTime(600);

    expect(defaultProps.onTransitionToEmpty).not.toHaveBeenCalled();
  });

  it('cleans up timer on unmount', () => {
    const { unmount } = render(<StackCardEmpty {...defaultProps} />);

    unmount();

    // Should not crash or call callback after unmount
    jest.advanceTimersByTime(600);
    expect(defaultProps.onTransitionToEmpty).not.toHaveBeenCalled();
  });

  describe('Animation Values', () => {
    it('uses provided animation values for styling', () => {
      const customOpacity = new Animated.Value(0.5);
      const customScale = new Animated.Value(0.9);
      const customTranslateY = new Animated.Value(10);

      const { getByTestId } = render(
        <StackCardEmpty
          {...defaultProps}
          emptyStateOpacity={customOpacity}
          emptyStateScale={customScale}
          emptyStateTranslateY={customTranslateY}
        />,
      );

      expect(getByTestId('carousel-empty-state')).toBeTruthy();
    });
  });
});

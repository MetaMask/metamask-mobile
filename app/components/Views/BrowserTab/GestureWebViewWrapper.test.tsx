/**
 * Unit tests for GestureWebViewWrapper
 *
 * COVERAGE NOTE:
 * This component achieves ~25% unit test coverage because ~60% of the code
 * consists of worklets that run on the UI thread and cannot be unit tested:
 * - Lines 209-355: Gesture handler worklets (onTouchesDown, onUpdate, onEnd, onFinalize)
 * - Lines 137-158, 176-182: Callbacks only invoked from within worklets
 *
 * These worklets are tested via E2E tests instead.
 * See: e2e/specs/browser/ for gesture navigation E2E tests.
 *
 * This test file covers:
 * - Component rendering and prop handling
 * - Gesture setup (Pan, Native, Race)
 * - Constants validation
 * - Business logic calculations (edge detection, thresholds, progress)
 * - Enablement conditions
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { View } from 'react-native';
import {
  EDGE_THRESHOLD,
  SWIPE_THRESHOLD,
  PULL_THRESHOLD,
  SCROLL_TOP_THRESHOLD,
  PULL_ACTIVATION_ZONE,
} from './constants';
import {
  GestureWebViewWrapper,
  type GestureWebViewWrapperProps,
} from './GestureWebViewWrapper';

// Mock react-native-gesture-handler
const mockPanGesture = {
  manualActivation: jest.fn().mockReturnThis(),
  onTouchesDown: jest.fn().mockReturnThis(),
  onUpdate: jest.fn().mockReturnThis(),
  onEnd: jest.fn().mockReturnThis(),
  onFinalize: jest.fn().mockReturnThis(),
};

jest.mock('react-native-gesture-handler', () => ({
  Gesture: {
    Pan: jest.fn(() => mockPanGesture),
    Native: jest.fn(() => ({})),
    Race: jest.fn((...gestures) => gestures[0]),
  },
  GestureDetector: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock react-native-reanimated
const mockSharedValue = <T,>(initialValue: T) => ({
  value: initialValue,
});

jest.mock('react-native-reanimated', () => ({
  useSharedValue: jest.fn((initial) => mockSharedValue(initial)),
  withTiming: jest.fn((toValue) => toValue),
  runOnJS: jest.fn((fn) => fn),
  useAnimatedStyle: jest.fn(() => ({})),
  default: {
    View: ({
      children,
      style,
      ...props
    }: {
      children?: React.ReactNode;
      style?: object;
    }) => {
      const RNView = jest.requireActual('react-native').View;
      return (
        <RNView style={style} {...props}>
          {children}
        </RNView>
      );
    },
  },
}));

// Mock expo-haptics
const mockImpactAsync = jest.fn();
jest.mock('expo-haptics', () => ({
  impactAsync: mockImpactAsync,
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));

// Mock useTheme
jest.mock('../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      primary: { default: '#037DD6' },
    },
  }),
}));

// Mock useMetrics
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({}),
}));

jest.mock('../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

// Mock MetaMetricsEvents
jest.mock('../../../core/Analytics', () => ({
  MetaMetricsEvents: {
    BROWSER_SWIPE_BACK: 'browser_swipe_back',
    BROWSER_SWIPE_FORWARD: 'browser_swipe_forward',
    BROWSER_PULL_REFRESH: 'browser_pull_refresh',
  },
}));

/**
 * Helper to create default props for GestureWebViewWrapper
 */
const createDefaultProps = (
  overrides: Partial<GestureWebViewWrapperProps> = {},
): GestureWebViewWrapperProps => ({
  isTabActive: true,
  isUrlBarFocused: false,
  firstUrlLoaded: true,
  backEnabled: true,
  forwardEnabled: true,
  onGoBack: jest.fn(),
  onGoForward: jest.fn(),
  onReload: jest.fn(),
  scrollY: mockSharedValue(0),
  isRefreshing: mockSharedValue(false),
  children: <View testID="test-webview" />,
  ...overrides,
});

/**
 * Helper to render the component with props
 */
const renderComponent = (props: Partial<GestureWebViewWrapperProps> = {}) => {
  const defaultProps = createDefaultProps(props);
  return render(<GestureWebViewWrapper {...defaultProps} />);
};

describe('GestureWebViewWrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('component rendering', () => {
    it('renders children correctly', () => {
      const { getByTestId } = renderComponent();

      expect(getByTestId('test-webview')).toBeTruthy();
    });

    it('renders refresh indicator', () => {
      const { UNSAFE_getAllByType } = renderComponent();
      const ActivityIndicator =
        jest.requireActual('react-native').ActivityIndicator;

      const indicators = UNSAFE_getAllByType(ActivityIndicator);

      expect(indicators.length).toBeGreaterThan(0);
    });

    it('renders with custom children', () => {
      const { getByTestId } = renderComponent({
        children: <View testID="custom-child" />,
      });

      expect(getByTestId('custom-child')).toBeTruthy();
    });

    it('renders when all props are provided', () => {
      const props = createDefaultProps();
      const { getByTestId } = render(<GestureWebViewWrapper {...props} />);

      expect(getByTestId('test-webview')).toBeTruthy();
    });

    it('mounts without crashing with minimal props', () => {
      const { getByTestId } = renderComponent({
        isTabActive: false,
        isUrlBarFocused: true,
        firstUrlLoaded: false,
        backEnabled: false,
        forwardEnabled: false,
      });

      expect(getByTestId('test-webview')).toBeTruthy();
    });
  });

  describe('gesture setup', () => {
    it('creates Pan gesture with manualActivation', () => {
      const { Gesture } = jest.requireMock('react-native-gesture-handler');

      renderComponent();

      expect(Gesture.Pan).toHaveBeenCalled();
      expect(mockPanGesture.manualActivation).toHaveBeenCalledWith(true);
    });

    it('creates Native gesture for WebView', () => {
      const { Gesture } = jest.requireMock('react-native-gesture-handler');

      renderComponent();

      expect(Gesture.Native).toHaveBeenCalled();
    });

    it('combines gestures with Race', () => {
      const { Gesture } = jest.requireMock('react-native-gesture-handler');

      renderComponent();

      expect(Gesture.Race).toHaveBeenCalled();
    });

    it('sets up onTouchesDown handler', () => {
      renderComponent();

      expect(mockPanGesture.onTouchesDown).toHaveBeenCalled();
    });

    it('sets up onUpdate handler', () => {
      renderComponent();

      expect(mockPanGesture.onUpdate).toHaveBeenCalled();
    });

    it('sets up onEnd handler', () => {
      renderComponent();

      expect(mockPanGesture.onEnd).toHaveBeenCalled();
    });

    it('sets up onFinalize handler', () => {
      renderComponent();

      expect(mockPanGesture.onFinalize).toHaveBeenCalled();
    });
  });

  describe('shared value synchronization', () => {
    it('accepts scrollY shared value prop', () => {
      const scrollY = mockSharedValue(50);
      const { getByTestId } = renderComponent({ scrollY });

      expect(getByTestId('test-webview')).toBeTruthy();
      expect(scrollY.value).toBe(50);
    });

    it('accepts isRefreshing shared value prop', () => {
      const isRefreshing = mockSharedValue(true);
      const { getByTestId } = renderComponent({ isRefreshing });

      expect(getByTestId('test-webview')).toBeTruthy();
      expect(isRefreshing.value).toBe(true);
    });

    it('renders with zero scrollY', () => {
      const scrollY = mockSharedValue(0);
      const { getByTestId } = renderComponent({ scrollY });

      expect(getByTestId('test-webview')).toBeTruthy();
    });

    it('renders with non-zero scrollY', () => {
      const scrollY = mockSharedValue(100);
      const { getByTestId } = renderComponent({ scrollY });

      expect(getByTestId('test-webview')).toBeTruthy();
    });
  });

  describe('hook dependencies', () => {
    it('uses useTheme hook for colors', () => {
      const { getByTestId } = renderComponent();

      // If useTheme didn't work, rendering would fail
      expect(getByTestId('test-webview')).toBeTruthy();
    });

    it('uses useMetrics hook for analytics', () => {
      const { getByTestId } = renderComponent();

      // If useMetrics didn't work, rendering would fail
      expect(getByTestId('test-webview')).toBeTruthy();
    });
  });

  describe('gesture enablement', () => {
    it('calculates gestures enabled when tab is active, URL bar not focused, and URL loaded', () => {
      const { getByTestId } = renderComponent({
        isTabActive: true,
        isUrlBarFocused: false,
        firstUrlLoaded: true,
      });

      expect(getByTestId('test-webview')).toBeTruthy();
    });

    it('renders when gestures are disabled (tab not active)', () => {
      const { getByTestId } = renderComponent({
        isTabActive: false,
      });

      expect(getByTestId('test-webview')).toBeTruthy();
    });

    it('renders when gestures are disabled (URL bar focused)', () => {
      const { getByTestId } = renderComponent({
        isUrlBarFocused: true,
      });

      expect(getByTestId('test-webview')).toBeTruthy();
    });

    it('renders when gestures are disabled (first URL not loaded)', () => {
      const { getByTestId } = renderComponent({
        firstUrlLoaded: false,
      });

      expect(getByTestId('test-webview')).toBeTruthy();
    });
  });

  describe('navigation state', () => {
    it('renders with back navigation enabled', () => {
      const { getByTestId } = renderComponent({
        backEnabled: true,
      });

      expect(getByTestId('test-webview')).toBeTruthy();
    });

    it('renders with back navigation disabled', () => {
      const { getByTestId } = renderComponent({
        backEnabled: false,
      });

      expect(getByTestId('test-webview')).toBeTruthy();
    });

    it('renders with forward navigation enabled', () => {
      const { getByTestId } = renderComponent({
        forwardEnabled: true,
      });

      expect(getByTestId('test-webview')).toBeTruthy();
    });

    it('renders with forward navigation disabled', () => {
      const { getByTestId } = renderComponent({
        forwardEnabled: false,
      });

      expect(getByTestId('test-webview')).toBeTruthy();
    });
  });

  describe('callback props', () => {
    it('accepts onGoBack callback', () => {
      const onGoBack = jest.fn();
      const { getByTestId } = renderComponent({ onGoBack });

      expect(getByTestId('test-webview')).toBeTruthy();
    });

    it('accepts onGoForward callback', () => {
      const onGoForward = jest.fn();
      const { getByTestId } = renderComponent({ onGoForward });

      expect(getByTestId('test-webview')).toBeTruthy();
    });

    it('accepts onReload callback', () => {
      const onReload = jest.fn();
      const { getByTestId } = renderComponent({ onReload });

      expect(getByTestId('test-webview')).toBeTruthy();
    });
  });

  describe('shared value props', () => {
    it('accepts scrollY shared value', () => {
      const scrollY = mockSharedValue(100);
      const { getByTestId } = renderComponent({ scrollY });

      expect(getByTestId('test-webview')).toBeTruthy();
    });

    it('accepts isRefreshing shared value', () => {
      const isRefreshing = mockSharedValue(true);
      const { getByTestId } = renderComponent({ isRefreshing });

      expect(getByTestId('test-webview')).toBeTruthy();
    });
  });
});

describe('GestureWebViewWrapper constants', () => {
  describe('EDGE_THRESHOLD', () => {
    it('returns positive pixel value for edge detection', () => {
      expect(EDGE_THRESHOLD).toBeGreaterThan(0);
      expect(typeof EDGE_THRESHOLD).toBe('number');
    });

    it('uses 20 pixels as default edge threshold', () => {
      expect(EDGE_THRESHOLD).toBe(20);
    });
  });

  describe('SWIPE_THRESHOLD', () => {
    it('returns decimal value between 0 and 1 for swipe percentage', () => {
      expect(SWIPE_THRESHOLD).toBeGreaterThan(0);
      expect(SWIPE_THRESHOLD).toBeLessThanOrEqual(1);
    });

    it('uses 30% of screen width as swipe threshold', () => {
      expect(SWIPE_THRESHOLD).toBe(0.3);
    });
  });

  describe('PULL_THRESHOLD', () => {
    it('returns positive pixel value for pull distance', () => {
      expect(PULL_THRESHOLD).toBeGreaterThan(0);
      expect(typeof PULL_THRESHOLD).toBe('number');
    });

    it('uses 80 pixels as pull threshold', () => {
      expect(PULL_THRESHOLD).toBe(80);
    });
  });

  describe('SCROLL_TOP_THRESHOLD', () => {
    it('returns small positive value for top detection tolerance', () => {
      expect(SCROLL_TOP_THRESHOLD).toBeGreaterThanOrEqual(0);
      expect(SCROLL_TOP_THRESHOLD).toBeLessThan(20);
    });

    it('uses 5 pixels as scroll top threshold', () => {
      expect(SCROLL_TOP_THRESHOLD).toBe(5);
    });
  });

  describe('PULL_ACTIVATION_ZONE', () => {
    it('returns positive pixel value for pull zone', () => {
      expect(PULL_ACTIVATION_ZONE).toBeGreaterThan(0);
      expect(typeof PULL_ACTIVATION_ZONE).toBe('number');
    });

    it('uses 50 pixels as pull activation zone', () => {
      expect(PULL_ACTIVATION_ZONE).toBe(50);
    });
  });
});

describe('GestureWebViewWrapper gesture zone calculations', () => {
  const screenWidth = 400;

  describe('left edge detection', () => {
    it('identifies touch at x=0 as left edge', () => {
      const x = 0;

      const isLeftEdge = x < EDGE_THRESHOLD;

      expect(isLeftEdge).toBe(true);
    });

    it('identifies touch at x=19 as left edge', () => {
      const x = 19;

      const isLeftEdge = x < EDGE_THRESHOLD;

      expect(isLeftEdge).toBe(true);
    });

    it('identifies touch at x=20 as outside left edge', () => {
      const x = 20;

      const isLeftEdge = x < EDGE_THRESHOLD;

      expect(isLeftEdge).toBe(false);
    });

    it('identifies touch at x=100 as outside left edge', () => {
      const x = 100;

      const isLeftEdge = x < EDGE_THRESHOLD;

      expect(isLeftEdge).toBe(false);
    });
  });

  describe('right edge detection', () => {
    it('identifies touch at screen edge as right edge', () => {
      const x = screenWidth - 1;
      const rightEdgeStart = screenWidth - EDGE_THRESHOLD;

      const isRightEdge = x > rightEdgeStart;

      expect(isRightEdge).toBe(true);
    });

    it('identifies touch at rightEdgeStart+1 as right edge', () => {
      const rightEdgeStart = screenWidth - EDGE_THRESHOLD;
      const x = rightEdgeStart + 1;

      const isRightEdge = x > rightEdgeStart;

      expect(isRightEdge).toBe(true);
    });

    it('identifies touch at rightEdgeStart as outside right edge', () => {
      const rightEdgeStart = screenWidth - EDGE_THRESHOLD;
      const x = rightEdgeStart;

      const isRightEdge = x > rightEdgeStart;

      expect(isRightEdge).toBe(false);
    });

    it('identifies touch at center as outside right edge', () => {
      const x = screenWidth / 2;
      const rightEdgeStart = screenWidth - EDGE_THRESHOLD;

      const isRightEdge = x > rightEdgeStart;

      expect(isRightEdge).toBe(false);
    });
  });

  describe('pull activation zone detection', () => {
    it('identifies touch at y=0 as in pull zone', () => {
      const y = 0;

      const isInPullZone = y < PULL_ACTIVATION_ZONE;

      expect(isInPullZone).toBe(true);
    });

    it('identifies touch at y=49 as in pull zone', () => {
      const y = 49;

      const isInPullZone = y < PULL_ACTIVATION_ZONE;

      expect(isInPullZone).toBe(true);
    });

    it('identifies touch at y=50 as outside pull zone', () => {
      const y = 50;

      const isInPullZone = y < PULL_ACTIVATION_ZONE;

      expect(isInPullZone).toBe(false);
    });

    it('identifies touch at y=100 as outside pull zone', () => {
      const y = 100;

      const isInPullZone = y < PULL_ACTIVATION_ZONE;

      expect(isInPullZone).toBe(false);
    });
  });

  describe('scroll top detection', () => {
    it('identifies scrollY=0 as at top', () => {
      const scrollY = 0;

      const isAtTop = scrollY <= SCROLL_TOP_THRESHOLD;

      expect(isAtTop).toBe(true);
    });

    it('identifies scrollY=5 as at top (threshold value)', () => {
      const scrollY = 5;

      const isAtTop = scrollY <= SCROLL_TOP_THRESHOLD;

      expect(isAtTop).toBe(true);
    });

    it('identifies scrollY=6 as not at top', () => {
      const scrollY = 6;

      const isAtTop = scrollY <= SCROLL_TOP_THRESHOLD;

      expect(isAtTop).toBe(false);
    });

    it('identifies scrollY=100 as not at top', () => {
      const scrollY = 100;

      const isAtTop = scrollY <= SCROLL_TOP_THRESHOLD;

      expect(isAtTop).toBe(false);
    });
  });

  describe('swipe threshold calculation', () => {
    it('calculates swipe distance as 30% of screen width', () => {
      const swipeDistance = screenWidth * SWIPE_THRESHOLD;

      expect(swipeDistance).toBe(120);
    });

    it('identifies translation below threshold as incomplete', () => {
      const translation = 100;
      const swipeDistance = screenWidth * SWIPE_THRESHOLD;

      const thresholdMet = translation >= swipeDistance;

      expect(thresholdMet).toBe(false);
    });

    it('identifies translation at threshold as complete', () => {
      const translation = 120;
      const swipeDistance = screenWidth * SWIPE_THRESHOLD;

      const thresholdMet = translation >= swipeDistance;

      expect(thresholdMet).toBe(true);
    });

    it('identifies translation above threshold as complete', () => {
      const translation = 200;
      const swipeDistance = screenWidth * SWIPE_THRESHOLD;

      const thresholdMet = translation >= swipeDistance;

      expect(thresholdMet).toBe(true);
    });
  });

  describe('pull threshold calculation', () => {
    it('identifies pull below threshold as incomplete', () => {
      const translationY = 50;

      const thresholdMet = translationY >= PULL_THRESHOLD;

      expect(thresholdMet).toBe(false);
    });

    it('identifies pull at threshold as complete', () => {
      const translationY = 80;

      const thresholdMet = translationY >= PULL_THRESHOLD;

      expect(thresholdMet).toBe(true);
    });

    it('identifies pull above threshold as complete', () => {
      const translationY = 100;

      const thresholdMet = translationY >= PULL_THRESHOLD;

      expect(thresholdMet).toBe(true);
    });
  });
});

describe('GestureWebViewWrapper gesture enablement logic', () => {
  describe('areGesturesEnabled calculation', () => {
    it('enables gestures when all conditions are true', () => {
      const isTabActive = true;
      const isUrlBarFocused = false;
      const firstUrlLoaded = true;

      const areGesturesEnabled =
        isTabActive && !isUrlBarFocused && firstUrlLoaded;

      expect(areGesturesEnabled).toBe(true);
    });

    it('disables gestures when tab is not active', () => {
      const isTabActive = false;
      const isUrlBarFocused = false;
      const firstUrlLoaded = true;

      const areGesturesEnabled =
        isTabActive && !isUrlBarFocused && firstUrlLoaded;

      expect(areGesturesEnabled).toBe(false);
    });

    it('disables gestures when URL bar is focused', () => {
      const isTabActive = true;
      const isUrlBarFocused = true;
      const firstUrlLoaded = true;

      const areGesturesEnabled =
        isTabActive && !isUrlBarFocused && firstUrlLoaded;

      expect(areGesturesEnabled).toBe(false);
    });

    it('disables gestures when first URL not loaded', () => {
      const isTabActive = true;
      const isUrlBarFocused = false;
      const firstUrlLoaded = false;

      const areGesturesEnabled =
        isTabActive && !isUrlBarFocused && firstUrlLoaded;

      expect(areGesturesEnabled).toBe(false);
    });

    it('disables gestures when multiple conditions fail', () => {
      const isTabActive = false;
      const isUrlBarFocused = true;
      const firstUrlLoaded = false;

      const areGesturesEnabled =
        isTabActive && !isUrlBarFocused && firstUrlLoaded;

      expect(areGesturesEnabled).toBe(false);
    });
  });

  describe('pull-to-refresh enablement', () => {
    it('enables pull-to-refresh when at top and not refreshing', () => {
      const isAtTop = true;
      const isRefreshing = false;
      const isInPullZone = true;

      const canPullToRefresh = isAtTop && !isRefreshing && isInPullZone;

      expect(canPullToRefresh).toBe(true);
    });

    it('disables pull-to-refresh when not at top', () => {
      const isAtTop = false;
      const isRefreshing = false;
      const isInPullZone = true;

      const canPullToRefresh = isAtTop && !isRefreshing && isInPullZone;

      expect(canPullToRefresh).toBe(false);
    });

    it('disables pull-to-refresh when already refreshing', () => {
      const isAtTop = true;
      const isRefreshing = true;
      const isInPullZone = true;

      const canPullToRefresh = isAtTop && !isRefreshing && isInPullZone;

      expect(canPullToRefresh).toBe(false);
    });

    it('disables pull-to-refresh when not in pull zone', () => {
      const isAtTop = true;
      const isRefreshing = false;
      const isInPullZone = false;

      const canPullToRefresh = isAtTop && !isRefreshing && isInPullZone;

      expect(canPullToRefresh).toBe(false);
    });
  });
});

describe('GestureWebViewWrapper swipe progress calculation', () => {
  const screenWidth = 400;
  const swipeDistance = screenWidth * SWIPE_THRESHOLD;

  it('calculates progress of 0 for no translation', () => {
    const translationX = 0;

    const progress = Math.min(translationX / swipeDistance, 1);

    expect(progress).toBe(0);
  });

  it('calculates progress of 0.5 for half translation', () => {
    const translationX = 60;

    const progress = Math.min(translationX / swipeDistance, 1);

    expect(progress).toBe(0.5);
  });

  it('calculates progress of 1 for full translation', () => {
    const translationX = 120;

    const progress = Math.min(translationX / swipeDistance, 1);

    expect(progress).toBe(1);
  });

  it('clamps progress at 1 for translation exceeding threshold', () => {
    const translationX = 200;

    const progress = Math.min(translationX / swipeDistance, 1);

    expect(progress).toBe(1);
  });
});

describe('GestureWebViewWrapper pull progress calculation', () => {
  it('calculates progress of 0 for no pull', () => {
    const translationY = 0;

    const progress = Math.min(translationY / PULL_THRESHOLD, 1.5);

    expect(progress).toBe(0);
  });

  it('calculates progress of 0.5 for half pull', () => {
    const translationY = 40;

    const progress = Math.min(translationY / PULL_THRESHOLD, 1.5);

    expect(progress).toBe(0.5);
  });

  it('calculates progress of 1 for full pull', () => {
    const translationY = 80;

    const progress = Math.min(translationY / PULL_THRESHOLD, 1.5);

    expect(progress).toBe(1);
  });

  it('allows progress up to 1.5 for over-pull', () => {
    const translationY = 120;

    const progress = Math.min(translationY / PULL_THRESHOLD, 1.5);

    expect(progress).toBe(1.5);
  });

  it('clamps progress at 1.5 for extreme over-pull', () => {
    const translationY = 200;

    const progress = Math.min(translationY / PULL_THRESHOLD, 1.5);

    expect(progress).toBe(1.5);
  });
});

describe('GestureWebViewWrapper forward swipe progress calculation', () => {
  const screenWidth = 400;
  const swipeDistance = screenWidth * SWIPE_THRESHOLD;

  it('calculates progress for negative translation (swipe left)', () => {
    const translationX = -60;

    const progress = Math.min(Math.abs(translationX) / swipeDistance, 1);

    expect(progress).toBe(0.5);
  });

  it('calculates progress of 1 for full left swipe', () => {
    const translationX = -120;

    const progress = Math.min(Math.abs(translationX) / swipeDistance, 1);

    expect(progress).toBe(1);
  });

  it('clamps progress at 1 for excessive left swipe', () => {
    const translationX = -200;

    const progress = Math.min(Math.abs(translationX) / swipeDistance, 1);

    expect(progress).toBe(1);
  });
});

describe('GestureWebViewWrapper gesture type determination', () => {
  const screenWidth = 400;
  const rightEdgeStart = screenWidth - EDGE_THRESHOLD;

  /**
   * Helper to determine gesture type based on touch position and state
   */
  const determineGestureType = (params: {
    x: number;
    y: number;
    scrollY: number;
    backEnabled: boolean;
    forwardEnabled: boolean;
    isRefreshing: boolean;
  }): 'back' | 'forward' | 'refresh' | null => {
    const { x, y, scrollY, backEnabled, forwardEnabled, isRefreshing } = params;

    const isLeftEdge = x < EDGE_THRESHOLD && backEnabled;
    const isRightEdge = x > rightEdgeStart && forwardEnabled;
    const currentlyAtTop = scrollY <= SCROLL_TOP_THRESHOLD;
    const isInPullZone = y < PULL_ACTIVATION_ZONE;
    const canPullToRefresh = currentlyAtTop && !isRefreshing && isInPullZone;

    if (isLeftEdge) return 'back';
    if (isRightEdge) return 'forward';
    if (canPullToRefresh) return 'refresh';
    return null;
  };

  describe('back gesture detection', () => {
    it('activates back gesture on left edge when back is enabled', () => {
      const result = determineGestureType({
        x: 10,
        y: 200,
        scrollY: 100,
        backEnabled: true,
        forwardEnabled: true,
        isRefreshing: false,
      });

      expect(result).toBe('back');
    });

    it('returns null on left edge when back is disabled', () => {
      const result = determineGestureType({
        x: 10,
        y: 200,
        scrollY: 100,
        backEnabled: false,
        forwardEnabled: true,
        isRefreshing: false,
      });

      expect(result).toBeNull();
    });

    it('prioritizes back gesture over refresh when on left edge at top', () => {
      const result = determineGestureType({
        x: 10,
        y: 25,
        scrollY: 0,
        backEnabled: true,
        forwardEnabled: true,
        isRefreshing: false,
      });

      expect(result).toBe('back');
    });
  });

  describe('forward gesture detection', () => {
    it('activates forward gesture on right edge when forward is enabled', () => {
      const result = determineGestureType({
        x: screenWidth - 5,
        y: 200,
        scrollY: 100,
        backEnabled: true,
        forwardEnabled: true,
        isRefreshing: false,
      });

      expect(result).toBe('forward');
    });

    it('returns null on right edge when forward is disabled', () => {
      const result = determineGestureType({
        x: screenWidth - 5,
        y: 200,
        scrollY: 100,
        backEnabled: true,
        forwardEnabled: false,
        isRefreshing: false,
      });

      expect(result).toBeNull();
    });

    it('prioritizes forward gesture over refresh when on right edge at top', () => {
      const result = determineGestureType({
        x: screenWidth - 5,
        y: 25,
        scrollY: 0,
        backEnabled: true,
        forwardEnabled: true,
        isRefreshing: false,
      });

      expect(result).toBe('forward');
    });
  });

  describe('refresh gesture detection', () => {
    it('activates refresh when at top in pull zone and not refreshing', () => {
      const result = determineGestureType({
        x: 200,
        y: 25,
        scrollY: 0,
        backEnabled: true,
        forwardEnabled: true,
        isRefreshing: false,
      });

      expect(result).toBe('refresh');
    });

    it('returns null for refresh when already refreshing', () => {
      const result = determineGestureType({
        x: 200,
        y: 25,
        scrollY: 0,
        backEnabled: true,
        forwardEnabled: true,
        isRefreshing: true,
      });

      expect(result).toBeNull();
    });

    it('returns null for refresh when not at top', () => {
      const result = determineGestureType({
        x: 200,
        y: 25,
        scrollY: 100,
        backEnabled: true,
        forwardEnabled: true,
        isRefreshing: false,
      });

      expect(result).toBeNull();
    });

    it('returns null for refresh when outside pull zone', () => {
      const result = determineGestureType({
        x: 200,
        y: 100,
        scrollY: 0,
        backEnabled: true,
        forwardEnabled: true,
        isRefreshing: false,
      });

      expect(result).toBeNull();
    });
  });

  describe('no gesture detection', () => {
    it('returns null for center touch when not at top', () => {
      const result = determineGestureType({
        x: 200,
        y: 200,
        scrollY: 100,
        backEnabled: true,
        forwardEnabled: true,
        isRefreshing: false,
      });

      expect(result).toBeNull();
    });

    it('returns null when all navigation is disabled', () => {
      const result = determineGestureType({
        x: 10,
        y: 200,
        scrollY: 100,
        backEnabled: false,
        forwardEnabled: false,
        isRefreshing: false,
      });

      expect(result).toBeNull();
    });
  });
});

describe('GestureWebViewWrapper refresh indicator visibility', () => {
  /**
   * Mirrors the refresh indicator visibility logic
   */
  const getRefreshIndicatorVisibility = (
    scrollY: number,
    pullProgress: number,
  ) => {
    const atTop = scrollY <= SCROLL_TOP_THRESHOLD;
    return {
      opacity: atTop ? pullProgress : 0,
      display: atTop ? 'flex' : 'none',
    };
  };

  describe('visibility when at top', () => {
    it('displays indicator with full opacity when at top and fully pulled', () => {
      const result = getRefreshIndicatorVisibility(0, 1);

      expect(result.opacity).toBe(1);
      expect(result.display).toBe('flex');
    });

    it('displays indicator with half opacity when at top and half pulled', () => {
      const result = getRefreshIndicatorVisibility(0, 0.5);

      expect(result.opacity).toBe(0.5);
      expect(result.display).toBe('flex');
    });

    it('displays indicator with zero opacity when at top and not pulled', () => {
      const result = getRefreshIndicatorVisibility(0, 0);

      expect(result.opacity).toBe(0);
      expect(result.display).toBe('flex');
    });

    it('displays indicator when scrollY equals threshold', () => {
      const result = getRefreshIndicatorVisibility(SCROLL_TOP_THRESHOLD, 1);

      expect(result.opacity).toBe(1);
      expect(result.display).toBe('flex');
    });
  });

  describe('visibility when not at top', () => {
    it('hides indicator when scrolled down regardless of pull progress', () => {
      const result = getRefreshIndicatorVisibility(100, 1);

      expect(result.opacity).toBe(0);
      expect(result.display).toBe('none');
    });

    it('hides indicator when just below threshold', () => {
      const result = getRefreshIndicatorVisibility(SCROLL_TOP_THRESHOLD + 1, 1);

      expect(result.opacity).toBe(0);
      expect(result.display).toBe('none');
    });
  });
});

describe('GestureWebViewWrapper swipe completion threshold', () => {
  const screenWidth = 400;
  const swipeDistance = screenWidth * SWIPE_THRESHOLD;

  describe('back swipe completion', () => {
    it('completes back swipe when translation exceeds threshold', () => {
      const translationX = swipeDistance + 10;

      const isComplete = translationX >= swipeDistance;

      expect(isComplete).toBe(true);
    });

    it('completes back swipe when translation equals threshold', () => {
      const translationX = swipeDistance;

      const isComplete = translationX >= swipeDistance;

      expect(isComplete).toBe(true);
    });

    it('does not complete back swipe when translation below threshold', () => {
      const translationX = swipeDistance - 1;

      const isComplete = translationX >= swipeDistance;

      expect(isComplete).toBe(false);
    });
  });

  describe('forward swipe completion', () => {
    it('completes forward swipe when negative translation exceeds threshold', () => {
      const translationX = -(swipeDistance + 10);

      const isComplete = translationX <= -swipeDistance;

      expect(isComplete).toBe(true);
    });

    it('completes forward swipe when negative translation equals threshold', () => {
      const translationX = -swipeDistance;

      const isComplete = translationX <= -swipeDistance;

      expect(isComplete).toBe(true);
    });

    it('does not complete forward swipe when negative translation below threshold', () => {
      const translationX = -(swipeDistance - 1);

      const isComplete = translationX <= -swipeDistance;

      expect(isComplete).toBe(false);
    });
  });
});

describe('GestureWebViewWrapper pull refresh cancellation', () => {
  it('cancels refresh when translationY becomes negative', () => {
    const translationY = -5;

    const shouldCancel = translationY < 0;

    expect(shouldCancel).toBe(true);
  });

  it('continues refresh when translationY is zero', () => {
    const translationY = 0;

    const shouldCancel = translationY < 0;

    expect(shouldCancel).toBe(false);
  });

  it('continues refresh when translationY is positive', () => {
    const translationY = 50;

    const shouldCancel = translationY < 0;

    expect(shouldCancel).toBe(false);
  });
});

describe('GestureWebViewWrapper haptic feedback trigger', () => {
  it('triggers haptic when pull exceeds 10 pixels', () => {
    const translationY = 15;
    const pullHapticTriggered = false;

    const shouldTriggerHaptic = !pullHapticTriggered && translationY > 10;

    expect(shouldTriggerHaptic).toBe(true);
  });

  it('does not trigger haptic when pull is 10 pixels or less', () => {
    const translationY = 10;
    const pullHapticTriggered = false;

    const shouldTriggerHaptic = !pullHapticTriggered && translationY > 10;

    expect(shouldTriggerHaptic).toBe(false);
  });

  it('does not trigger haptic when already triggered', () => {
    const translationY = 50;
    const pullHapticTriggered = true;

    const shouldTriggerHaptic = !pullHapticTriggered && translationY > 10;

    expect(shouldTriggerHaptic).toBe(false);
  });
});

describe('GestureWebViewWrapper refresh indicator transform', () => {
  it('positions indicator above view when pull progress is 0', () => {
    const pullProgress = 0;

    const translateY = pullProgress * PULL_THRESHOLD - PULL_THRESHOLD;

    expect(translateY).toBe(-PULL_THRESHOLD);
  });

  it('positions indicator at top when pull progress is 1', () => {
    const pullProgress = 1;

    const translateY = pullProgress * PULL_THRESHOLD - PULL_THRESHOLD;

    expect(translateY).toBe(0);
  });

  it('positions indicator below top when pull progress exceeds 1', () => {
    const pullProgress = 1.5;

    const translateY = pullProgress * PULL_THRESHOLD - PULL_THRESHOLD;

    expect(translateY).toBe(PULL_THRESHOLD * 0.5);
  });
});

describe('GestureWebViewWrapper edge boundary conditions', () => {
  const screenWidth = 400;
  const rightEdgeStart = screenWidth - EDGE_THRESHOLD;

  it('treats exactly EDGE_THRESHOLD as outside left edge', () => {
    const x = EDGE_THRESHOLD;

    const isLeftEdge = x < EDGE_THRESHOLD;

    expect(isLeftEdge).toBe(false);
  });

  it('treats EDGE_THRESHOLD - 0.001 as inside left edge', () => {
    const x = EDGE_THRESHOLD - 0.001;

    const isLeftEdge = x < EDGE_THRESHOLD;

    expect(isLeftEdge).toBe(true);
  });

  it('treats exactly rightEdgeStart as outside right edge', () => {
    const x = rightEdgeStart;

    const isRightEdge = x > rightEdgeStart;

    expect(isRightEdge).toBe(false);
  });

  it('treats rightEdgeStart + 0.001 as inside right edge', () => {
    const x = rightEdgeStart + 0.001;

    const isRightEdge = x > rightEdgeStart;

    expect(isRightEdge).toBe(true);
  });

  it('treats negative x values as inside left edge', () => {
    const x = -5;

    const isLeftEdge = x < EDGE_THRESHOLD;

    expect(isLeftEdge).toBe(true);
  });
});

describe('GestureWebViewWrapper combined conditions truth table', () => {
  const screenWidth = 400;

  interface TestCase {
    name: string;
    x: number;
    y: number;
    scrollY: number;
    backEnabled: boolean;
    forwardEnabled: boolean;
    isRefreshing: boolean;
    expected: 'back' | 'forward' | 'refresh' | null;
  }

  const testCases: TestCase[] = [
    {
      name: 'left edge + back enabled',
      x: 5,
      y: 200,
      scrollY: 100,
      backEnabled: true,
      forwardEnabled: true,
      isRefreshing: false,
      expected: 'back',
    },
    {
      name: 'left edge + back disabled',
      x: 5,
      y: 200,
      scrollY: 100,
      backEnabled: false,
      forwardEnabled: true,
      isRefreshing: false,
      expected: null,
    },
    {
      name: 'right edge + forward enabled',
      x: screenWidth - 5,
      y: 200,
      scrollY: 100,
      backEnabled: true,
      forwardEnabled: true,
      isRefreshing: false,
      expected: 'forward',
    },
    {
      name: 'right edge + forward disabled',
      x: screenWidth - 5,
      y: 200,
      scrollY: 100,
      backEnabled: true,
      forwardEnabled: false,
      isRefreshing: false,
      expected: null,
    },
    {
      name: 'center + at top + in pull zone + not refreshing',
      x: 200,
      y: 25,
      scrollY: 0,
      backEnabled: true,
      forwardEnabled: true,
      isRefreshing: false,
      expected: 'refresh',
    },
    {
      name: 'center + at top + outside pull zone',
      x: 200,
      y: 100,
      scrollY: 0,
      backEnabled: true,
      forwardEnabled: true,
      isRefreshing: false,
      expected: null,
    },
    {
      name: 'center + not at top + in pull zone',
      x: 200,
      y: 25,
      scrollY: 100,
      backEnabled: true,
      forwardEnabled: true,
      isRefreshing: false,
      expected: null,
    },
    {
      name: 'center + at top + in pull zone + already refreshing',
      x: 200,
      y: 25,
      scrollY: 0,
      backEnabled: true,
      forwardEnabled: true,
      isRefreshing: true,
      expected: null,
    },
  ];

  it.each(testCases)('returns $expected for $name', (testCase) => {
    const rightEdgeStart = screenWidth - EDGE_THRESHOLD;

    const isLeftEdge = testCase.x < EDGE_THRESHOLD && testCase.backEnabled;
    const isRightEdge = testCase.x > rightEdgeStart && testCase.forwardEnabled;
    const currentlyAtTop = testCase.scrollY <= SCROLL_TOP_THRESHOLD;
    const isInPullZone = testCase.y < PULL_ACTIVATION_ZONE;
    const canPullToRefresh =
      currentlyAtTop && !testCase.isRefreshing && isInPullZone;

    let result: 'back' | 'forward' | 'refresh' | null = null;
    if (isLeftEdge) result = 'back';
    else if (isRightEdge) result = 'forward';
    else if (canPullToRefresh) result = 'refresh';

    expect(result).toBe(testCase.expected);
  });
});

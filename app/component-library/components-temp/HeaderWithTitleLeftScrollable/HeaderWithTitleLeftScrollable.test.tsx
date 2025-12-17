// Third party dependencies.
import React from 'react';
import { render, renderHook } from '@testing-library/react-native';
import { useSharedValue, SharedValue } from 'react-native-reanimated';
import { Text } from 'react-native';

// Internal dependencies.
import HeaderWithTitleLeftScrollable from './HeaderWithTitleLeftScrollable';
import useHeaderWithTitleLeftScrollable from './useHeaderWithTitleLeftScrollable';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  Reanimated.useSharedValue = jest.fn((initial) => ({
    value: initial,
  }));
  Reanimated.useAnimatedStyle = jest.fn((fn) => fn());
  Reanimated.interpolate = jest.fn(
    (_value, _inputRange, outputRange) => outputRange[0],
  );
  Reanimated.Extrapolation = { CLAMP: 'clamp' };
  return Reanimated;
});

// Test wrapper component that provides scrollY
const TestWrapper: React.FC<{
  children: (scrollYValue: SharedValue<number>) => React.ReactNode;
}> = ({ children }) => {
  const scrollYValue = useSharedValue(0);
  return <>{children(scrollYValue)}</>;
};

describe('HeaderWithTitleLeftScrollable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders with title', () => {
      const { getAllByText } = render(
        <TestWrapper>
          {(scrollYValue) => (
            <HeaderWithTitleLeftScrollable
              title="Test Title"
              scrollY={scrollYValue}
            />
          )}
        </TestWrapper>,
      );

      expect(getAllByText('Test Title').length).toBeGreaterThan(0);
    });

    it('renders container with testID when provided', () => {
      const { getByTestId } = render(
        <TestWrapper>
          {(scrollYValue) => (
            <HeaderWithTitleLeftScrollable
              title="Test"
              scrollY={scrollYValue}
              testID="test-container"
            />
          )}
        </TestWrapper>,
      );

      expect(getByTestId('test-container')).toBeOnTheScreen();
    });
  });

  describe('back button', () => {
    it('renders back button when onBack provided', () => {
      const { getByTestId } = render(
        <TestWrapper>
          {(scrollYValue) => (
            <HeaderWithTitleLeftScrollable
              title="Test"
              scrollY={scrollYValue}
              onBack={jest.fn()}
              backButtonProps={{ testID: 'test-back-button' }}
            />
          )}
        </TestWrapper>,
      );

      expect(getByTestId('test-back-button')).toBeOnTheScreen();
    });

    it('renders back button when backButtonProps provided', () => {
      const { getByTestId } = render(
        <TestWrapper>
          {(scrollYValue) => (
            <HeaderWithTitleLeftScrollable
              title="Test"
              scrollY={scrollYValue}
              backButtonProps={{
                onPress: jest.fn(),
                testID: 'test-back-button',
              }}
            />
          )}
        </TestWrapper>,
      );

      expect(getByTestId('test-back-button')).toBeOnTheScreen();
    });
  });

  describe('titleLeft and titleLeftProps', () => {
    it('renders custom titleLeft node', () => {
      const { getByText } = render(
        <TestWrapper>
          {(scrollYValue) => (
            <HeaderWithTitleLeftScrollable
              title="Test"
              scrollY={scrollYValue}
              titleLeft={<Text>Custom Content</Text>}
            />
          )}
        </TestWrapper>,
      );

      expect(getByText('Custom Content')).toBeOnTheScreen();
    });

    it('titleLeft takes priority over titleLeftProps', () => {
      const { getByText, queryByText } = render(
        <TestWrapper>
          {(scrollYValue) => (
            <HeaderWithTitleLeftScrollable
              title="Test"
              scrollY={scrollYValue}
              titleLeft={<Text>Custom Node</Text>}
              titleLeftProps={{ title: 'Props Title' }}
            />
          )}
        </TestWrapper>,
      );

      expect(getByText('Custom Node')).toBeOnTheScreen();
      expect(queryByText('Props Title')).toBeNull();
    });
  });
});

describe('useHeaderWithTitleLeftScrollable', () => {
  it('returns onScroll handler', () => {
    const { result } = renderHook(() => useHeaderWithTitleLeftScrollable());

    expect(typeof result.current.onScroll).toBe('function');
  });

  it('returns scrollY shared value with initial value of 0', () => {
    const { result } = renderHook(() => useHeaderWithTitleLeftScrollable());

    expect(result.current.scrollY.value).toBe(0);
  });

  it('returns expandedHeight', () => {
    const { result } = renderHook(() => useHeaderWithTitleLeftScrollable());

    expect(result.current.expandedHeight).toBe(140);
  });

  it('returns scrollTriggerPosition defaulting to expandedHeight', () => {
    const { result } = renderHook(() => useHeaderWithTitleLeftScrollable());

    expect(result.current.scrollTriggerPosition).toBe(
      result.current.expandedHeight,
    );
  });

  it('uses custom scrollTriggerPosition when provided', () => {
    const { result } = renderHook(() =>
      useHeaderWithTitleLeftScrollable({
        scrollTriggerPosition: 80,
      }),
    );

    expect(result.current.scrollTriggerPosition).toBe(80);
  });

  it('uses custom expandedHeight when provided', () => {
    const { result } = renderHook(() =>
      useHeaderWithTitleLeftScrollable({ expandedHeight: 200 }),
    );

    expect(result.current.expandedHeight).toBe(200);
  });
});

// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSharedValue, SharedValue } from 'react-native-reanimated';

// Internal dependencies.
import getHeaderWithTitleLeftScrollableNavbarOptions from './getHeaderWithTitleLeftScrollableNavbarOptions';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => ({
  useSharedValue: jest.fn((initial) => ({ value: initial })),
  useAnimatedStyle: jest.fn(() => ({})),
  useDerivedValue: jest.fn((fn) => ({ value: fn() })),
  withTiming: jest.fn((value) => value),
  interpolate: jest.fn((_value, _inputRange, outputRange) => outputRange[0]),
  Extrapolation: { CLAMP: 'clamp' },
  default: {
    View: 'Animated.View',
  },
}));

const CONTAINER_TEST_ID = 'header-scrollable-container';
const BACK_BUTTON_TEST_ID = 'header-scrollable-back-button';

// Test wrapper component that provides scrollY
const TestWrapper: React.FC<{
  children: (scrollYValue: SharedValue<number>) => React.ReactNode;
}> = ({ children }) => {
  const scrollYValue = useSharedValue(0);
  return <>{children(scrollYValue)}</>;
};

describe('getHeaderWithTitleLeftScrollableNavbarOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('return value', () => {
    it('returns object with header function', () => {
      const mockScrollY = { value: 0 };
      const options = getHeaderWithTitleLeftScrollableNavbarOptions({
        title: 'Send',
        scrollY: mockScrollY as SharedValue<number>,
      });

      expect(options).toHaveProperty('header');
      expect(typeof options.header).toBe('function');
    });

    it('returns React element when header function is called', () => {
      const mockScrollY = { value: 0 };
      const options = getHeaderWithTitleLeftScrollableNavbarOptions({
        title: 'Send',
        scrollY: mockScrollY as SharedValue<number>,
      });

      const headerElement = options.header();

      expect(React.isValidElement(headerElement)).toBe(true);
    });
  });

  describe('rendering', () => {
    it('renders HeaderWithTitleLeftScrollable with title', () => {
      const { getAllByText, getByTestId } = render(
        <TestWrapper>
          {(scrollYValue) => {
            const options = getHeaderWithTitleLeftScrollableNavbarOptions({
              title: 'Send',
              scrollY: scrollYValue,
              testID: CONTAINER_TEST_ID,
            });
            const Header = options.header;
            return <Header />;
          }}
        </TestWrapper>,
      );

      expect(getByTestId(CONTAINER_TEST_ID)).toBeOnTheScreen();
      expect(getAllByText('Send').length).toBeGreaterThan(0);
    });

    it('renders HeaderWithTitleLeftScrollable with back button', () => {
      const onBack = jest.fn();
      const { getByTestId } = render(
        <TestWrapper>
          {(scrollYValue) => {
            const options = getHeaderWithTitleLeftScrollableNavbarOptions({
              title: 'Send',
              scrollY: scrollYValue,
              onBack,
              backButtonProps: { testID: BACK_BUTTON_TEST_ID },
            });
            const Header = options.header;
            return <Header />;
          }}
        </TestWrapper>,
      );

      expect(getByTestId(BACK_BUTTON_TEST_ID)).toBeOnTheScreen();
    });

    it('renders HeaderWithTitleLeftScrollable with titleLeftProps', () => {
      const { getByText } = render(
        <TestWrapper>
          {(scrollYValue) => {
            const options = getHeaderWithTitleLeftScrollableNavbarOptions({
              title: 'Send',
              scrollY: scrollYValue,
              titleLeftProps: {
                topLabel: 'Sending',
                bottomLabel: 'To 0x123...',
              },
            });
            const Header = options.header;
            return <Header />;
          }}
        </TestWrapper>,
      );

      expect(getByText('Sending')).toBeOnTheScreen();
      expect(getByText('To 0x123...')).toBeOnTheScreen();
    });
  });

  describe('props forwarding', () => {
    it('forwards onBack callback to HeaderWithTitleLeftScrollable', () => {
      const onBack = jest.fn();
      const { getByTestId } = render(
        <TestWrapper>
          {(scrollYValue) => {
            const options = getHeaderWithTitleLeftScrollableNavbarOptions({
              title: 'Send',
              scrollY: scrollYValue,
              onBack,
              backButtonProps: { testID: BACK_BUTTON_TEST_ID },
            });
            const Header = options.header;
            return <Header />;
          }}
        </TestWrapper>,
      );

      fireEvent.press(getByTestId(BACK_BUTTON_TEST_ID));

      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('forwards testID to HeaderWithTitleLeftScrollable container', () => {
      const { getByTestId } = render(
        <TestWrapper>
          {(scrollYValue) => {
            const options = getHeaderWithTitleLeftScrollableNavbarOptions({
              title: 'Send',
              scrollY: scrollYValue,
              testID: 'custom-scrollable-header',
            });
            const Header = options.header;
            return <Header />;
          }}
        </TestWrapper>,
      );

      expect(getByTestId('custom-scrollable-header')).toBeOnTheScreen();
    });
  });
});

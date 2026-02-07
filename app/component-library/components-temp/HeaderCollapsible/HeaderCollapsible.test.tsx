// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';
import { useSharedValue, SharedValue } from 'react-native-reanimated';
import { Text } from 'react-native';

// External dependencies.
import { IconName } from '@metamask/design-system-react-native';

// Internal dependencies.
import HeaderCollapsible from './HeaderCollapsible';

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

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

// Test wrapper component that provides scrollY
const TestWrapper: React.FC<{
  children: (scrollYValue: SharedValue<number>) => React.ReactNode;
}> = ({ children }) => {
  const scrollYValue = useSharedValue(0);
  return <>{children(scrollYValue)}</>;
};

describe('HeaderCollapsible', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders with title', () => {
      const { getAllByText } = render(
        <TestWrapper>
          {(scrollYValue) => (
            <HeaderCollapsible title="Test Title" scrollY={scrollYValue} />
          )}
        </TestWrapper>,
      );

      expect(getAllByText('Test Title').length).toBeGreaterThan(0);
    });

    it('renders container with testID when provided', () => {
      const { getByTestId } = render(
        <TestWrapper>
          {(scrollYValue) => (
            <HeaderCollapsible
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
            <HeaderCollapsible
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
            <HeaderCollapsible
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

  describe('close button', () => {
    it('renders close button when onClose provided', () => {
      const { getByTestId } = render(
        <TestWrapper>
          {(scrollYValue) => (
            <HeaderCollapsible
              title="Test"
              scrollY={scrollYValue}
              onClose={jest.fn()}
              closeButtonProps={{ testID: 'test-close-button' }}
            />
          )}
        </TestWrapper>,
      );

      expect(getByTestId('test-close-button')).toBeOnTheScreen();
    });

    it('renders close button when closeButtonProps provided', () => {
      const { getByTestId } = render(
        <TestWrapper>
          {(scrollYValue) => (
            <HeaderCollapsible
              title="Test"
              scrollY={scrollYValue}
              closeButtonProps={{
                onPress: jest.fn(),
                testID: 'test-close-button',
              }}
            />
          )}
        </TestWrapper>,
      );

      expect(getByTestId('test-close-button')).toBeOnTheScreen();
    });
  });

  describe('endButtonIconProps', () => {
    it('renders endButtonIconProps', () => {
      const { getByTestId } = render(
        <TestWrapper>
          {(scrollYValue) => (
            <HeaderCollapsible
              title="Test"
              scrollY={scrollYValue}
              endButtonIconProps={[
                {
                  iconName: IconName.Close,
                  onPress: jest.fn(),
                  testID: 'end-button',
                },
              ]}
            />
          )}
        </TestWrapper>,
      );

      expect(getByTestId('end-button')).toBeOnTheScreen();
    });
  });

  describe('isInsideSafeAreaView', () => {
    it('positions header at top 0 when isInsideSafeAreaView is false', () => {
      const { getByTestId } = render(
        <TestWrapper>
          {(scrollYValue) => (
            <HeaderCollapsible
              title="Test"
              scrollY={scrollYValue}
              isInsideSafeAreaView={false}
              testID="test-container"
            />
          )}
        </TestWrapper>,
      );

      const container = getByTestId('test-container');
      const flattenedStyle = Array.isArray(container.props.style)
        ? Object.assign({}, ...container.props.style)
        : container.props.style;

      expect(flattenedStyle.top).toBe(0);
    });

    it('positions header at insets.top when isInsideSafeAreaView is true', () => {
      const { getByTestId } = render(
        <TestWrapper>
          {(scrollYValue) => (
            <HeaderCollapsible
              title="Test"
              scrollY={scrollYValue}
              isInsideSafeAreaView
              testID="test-container"
            />
          )}
        </TestWrapper>,
      );

      const container = getByTestId('test-container');
      const flattenedStyle = Array.isArray(container.props.style)
        ? Object.assign({}, ...container.props.style)
        : container.props.style;

      expect(flattenedStyle.top).toBe(44);
    });
  });

  describe('expandedContent', () => {
    it('renders custom expandedContent node', () => {
      const { getByText } = render(
        <TestWrapper>
          {(scrollYValue) => (
            <HeaderCollapsible
              title="Test"
              scrollY={scrollYValue}
              expandedContent={<Text>Custom Expanded Content</Text>}
            />
          )}
        </TestWrapper>,
      );

      expect(getByText('Custom Expanded Content')).toBeOnTheScreen();
    });

    it('does not render expanded content when not provided', () => {
      const { queryByText } = render(
        <TestWrapper>
          {(scrollYValue) => (
            <HeaderCollapsible title="Test" scrollY={scrollYValue} />
          )}
        </TestWrapper>,
      );

      expect(queryByText('Custom Expanded Content')).toBeNull();
    });
  });

  describe('subtitle', () => {
    it('renders subtitle in compact header when provided', () => {
      const { getByText } = render(
        <TestWrapper>
          {(scrollYValue) => (
            <HeaderCollapsible
              title="Test Title"
              subtitle="Test Subtitle"
              scrollY={scrollYValue}
            />
          )}
        </TestWrapper>,
      );

      expect(getByText('Test Subtitle')).toBeOnTheScreen();
    });

    it('does not render subtitle when not provided', () => {
      const { queryByText } = render(
        <TestWrapper>
          {(scrollYValue) => (
            <HeaderCollapsible title="Test Title" scrollY={scrollYValue} />
          )}
        </TestWrapper>,
      );

      expect(queryByText('Test Subtitle')).toBeNull();
    });

    it('renders subtitle with testID when provided via subtitleProps', () => {
      const { getByTestId } = render(
        <TestWrapper>
          {(scrollYValue) => (
            <HeaderCollapsible
              title="Test Title"
              subtitle="Test Subtitle"
              subtitleProps={{ testID: 'subtitle-test-id' }}
              scrollY={scrollYValue}
            />
          )}
        </TestWrapper>,
      );

      expect(getByTestId('subtitle-test-id')).toBeOnTheScreen();
    });
  });

  describe('children', () => {
    it('renders custom children in compact header section', () => {
      const { getByText } = render(
        <TestWrapper>
          {(scrollYValue) => (
            <HeaderCollapsible title="Test Title" scrollY={scrollYValue}>
              <Text>Custom Compact Content</Text>
            </HeaderCollapsible>
          )}
        </TestWrapper>,
      );

      expect(getByText('Custom Compact Content')).toBeOnTheScreen();
    });

    it('does not render subtitle when children provided', () => {
      const { getByText, queryByText } = render(
        <TestWrapper>
          {(scrollYValue) => (
            <HeaderCollapsible
              title="Test Title"
              subtitle="Test Subtitle"
              scrollY={scrollYValue}
            >
              <Text>Custom Content</Text>
            </HeaderCollapsible>
          )}
        </TestWrapper>,
      );

      expect(getByText('Custom Content')).toBeOnTheScreen();
      expect(queryByText('Test Subtitle')).toBeNull();
    });
  });
});

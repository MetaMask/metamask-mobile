// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';
import { useSharedValue } from 'react-native-reanimated';

// External dependencies.
import { IconName } from '@metamask/design-system-react-native';

// Internal dependencies.
import HeaderScrollable from './HeaderScrollable';
import useHeaderScrollable from './useHeaderScrollable';
import { HeaderScrollableTestIds } from './HeaderScrollable.constants';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  Reanimated.useSharedValue = jest.fn((initial) => ({
    value: initial,
  }));
  Reanimated.useAnimatedStyle = jest.fn((fn) => fn());
  Reanimated.useAnimatedScrollHandler = jest.fn(() => jest.fn());
  Reanimated.useDerivedValue = jest.fn((fn) => ({ value: fn() }));
  Reanimated.interpolate = jest.fn(
    (value, inputRange, outputRange) => outputRange[0],
  );
  Reanimated.Extrapolation = { CLAMP: 'clamp' };
  return Reanimated;
});

// Test wrapper component that provides scrollY
const TestWrapper: React.FC<{
  children: (scrollY: { value: number }) => React.ReactNode;
}> = ({ children }) => {
  const scrollY = useSharedValue(0);
  return <>{children(scrollY)}</>;
};

describe('HeaderScrollable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders with title', () => {
      const { getByText } = render(
        <TestWrapper>
          {(scrollY) => (
            <HeaderScrollable title="Test Title" scrollY={scrollY} />
          )}
        </TestWrapper>,
      );

      expect(getByText('Test Title')).toBeTruthy();
    });

    it('renders with left icon button', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <TestWrapper>
          {(scrollY) => (
            <HeaderScrollable
              title="Test Title"
              scrollY={scrollY}
              leftIcon={{
                iconName: IconName.ArrowLeft,
                onPress,
              }}
            />
          )}
        </TestWrapper>,
      );

      expect(getByTestId(HeaderScrollableTestIds.LEFT_ICON)).toBeTruthy();
    });

    it('renders with right icon button', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <TestWrapper>
          {(scrollY) => (
            <HeaderScrollable
              title="Test Title"
              scrollY={scrollY}
              rightIcon={{
                iconName: IconName.Close,
                onPress,
              }}
            />
          )}
        </TestWrapper>,
      );

      expect(getByTestId(HeaderScrollableTestIds.RIGHT_ICON)).toBeTruthy();
    });

    it('renders with both icon buttons', () => {
      const onPressLeft = jest.fn();
      const onPressRight = jest.fn();
      const { getByTestId } = render(
        <TestWrapper>
          {(scrollY) => (
            <HeaderScrollable
              title="Test Title"
              scrollY={scrollY}
              leftIcon={{
                iconName: IconName.ArrowLeft,
                onPress: onPressLeft,
              }}
              rightIcon={{
                iconName: IconName.Close,
                onPress: onPressRight,
              }}
            />
          )}
        </TestWrapper>,
      );

      expect(getByTestId(HeaderScrollableTestIds.LEFT_ICON)).toBeTruthy();
      expect(getByTestId(HeaderScrollableTestIds.RIGHT_ICON)).toBeTruthy();
    });

    it('renders without icon buttons when not provided', () => {
      const { queryByTestId } = render(
        <TestWrapper>
          {(scrollY) => (
            <HeaderScrollable title="Test Title" scrollY={scrollY} />
          )}
        </TestWrapper>,
      );

      expect(queryByTestId(HeaderScrollableTestIds.LEFT_ICON)).toBeNull();
      expect(queryByTestId(HeaderScrollableTestIds.RIGHT_ICON)).toBeNull();
    });

    it('renders with custom testID', () => {
      const customTestId = 'custom-header';
      const { getByTestId } = render(
        <TestWrapper>
          {(scrollY) => (
            <HeaderScrollable
              title="Test Title"
              scrollY={scrollY}
              testID={customTestId}
            />
          )}
        </TestWrapper>,
      );

      expect(getByTestId(customTestId)).toBeTruthy();
    });

    it('renders with custom large header content', () => {
      const { getByText } = render(
        <TestWrapper>
          {(scrollY) => (
            <HeaderScrollable
              title="Test Title"
              scrollY={scrollY}
              largeHeaderContent={<>{`Custom Content`}</>}
            />
          )}
        </TestWrapper>,
      );

      expect(getByText('Custom Content')).toBeTruthy();
    });

    it('renders toolbar section', () => {
      const { getByTestId } = render(
        <TestWrapper>
          {(scrollY) => (
            <HeaderScrollable title="Test Title" scrollY={scrollY} />
          )}
        </TestWrapper>,
      );

      expect(getByTestId(HeaderScrollableTestIds.TOOLBAR)).toBeTruthy();
    });

    it('renders large content section', () => {
      const { getByTestId } = render(
        <TestWrapper>
          {(scrollY) => (
            <HeaderScrollable title="Test Title" scrollY={scrollY} />
          )}
        </TestWrapper>,
      );

      expect(getByTestId(HeaderScrollableTestIds.LARGE_CONTENT)).toBeTruthy();
    });

    it('renders compact title section', () => {
      const { getByTestId } = render(
        <TestWrapper>
          {(scrollY) => (
            <HeaderScrollable title="Test Title" scrollY={scrollY} />
          )}
        </TestWrapper>,
      );

      expect(getByTestId(HeaderScrollableTestIds.COMPACT_TITLE)).toBeTruthy();
    });
  });

  describe('props', () => {
    it('accepts custom collapseThreshold', () => {
      const { getByTestId } = render(
        <TestWrapper>
          {(scrollY) => (
            <HeaderScrollable
              title="Test Title"
              scrollY={scrollY}
              collapseThreshold={60}
            />
          )}
        </TestWrapper>,
      );

      expect(getByTestId(HeaderScrollableTestIds.CONTAINER)).toBeTruthy();
    });

    it('uses custom testID for icon buttons when provided', () => {
      const customLeftTestId = 'custom-left-icon';
      const customRightTestId = 'custom-right-icon';
      const { getByTestId } = render(
        <TestWrapper>
          {(scrollY) => (
            <HeaderScrollable
              title="Test Title"
              scrollY={scrollY}
              leftIcon={{
                iconName: IconName.ArrowLeft,
                onPress: jest.fn(),
                testID: customLeftTestId,
              }}
              rightIcon={{
                iconName: IconName.Close,
                onPress: jest.fn(),
                testID: customRightTestId,
              }}
            />
          )}
        </TestWrapper>,
      );

      expect(getByTestId(customLeftTestId)).toBeTruthy();
      expect(getByTestId(customRightTestId)).toBeTruthy();
    });
  });
});

describe('useHeaderScrollable', () => {
  it('returns onScroll handler', () => {
    const result = useHeaderScrollable();

    expect(result.onScroll).toBeDefined();
  });

  it('returns scrollY shared value', () => {
    const result = useHeaderScrollable();

    expect(result.scrollY).toBeDefined();
    expect(result.scrollY.value).toBe(0);
  });

  it('returns expandedHeight', () => {
    const result = useHeaderScrollable();

    expect(result.expandedHeight).toBe(140);
  });

  it('returns headerHeight', () => {
    const result = useHeaderScrollable();

    expect(result.headerHeight).toBeDefined();
  });

  it('uses custom expandedHeight when provided', () => {
    const result = useHeaderScrollable({ expandedHeight: 200 });

    expect(result.expandedHeight).toBe(200);
  });

  it('uses default values when no options provided', () => {
    const result = useHeaderScrollable();

    expect(result.expandedHeight).toBe(140);
  });
});


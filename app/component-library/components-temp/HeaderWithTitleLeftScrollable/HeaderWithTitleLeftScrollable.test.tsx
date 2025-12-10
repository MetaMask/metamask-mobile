// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';
import { useSharedValue } from 'react-native-reanimated';
import { Text } from 'react-native';

// Internal dependencies.
import HeaderWithTitleLeftScrollable from './HeaderWithTitleLeftScrollable';
import useHeaderWithTitleLeftScrollable from './useHeaderWithTitleLeftScrollable';
import { HeaderWithTitleLeftScrollableTestIds } from './HeaderWithTitleLeftScrollable.constants';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  Reanimated.useSharedValue = jest.fn((initial) => ({
    value: initial,
  }));
  Reanimated.useAnimatedStyle = jest.fn((fn) => fn());
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

describe('HeaderWithTitleLeftScrollable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders with title', () => {
      const { getByText } = render(
        <TestWrapper>
          {(scrollY) => (
            <HeaderWithTitleLeftScrollable title="Test Title" scrollY={scrollY} />
          )}
        </TestWrapper>,
      );

      expect(getByText('Test Title')).toBeTruthy();
    });

    it('renders container with correct testID', () => {
      const { getByTestId } = render(
        <TestWrapper>
          {(scrollY) => (
            <HeaderWithTitleLeftScrollable title="Test" scrollY={scrollY} />
          )}
        </TestWrapper>,
      );

      expect(
        getByTestId(HeaderWithTitleLeftScrollableTestIds.CONTAINER),
      ).toBeTruthy();
    });

    it('renders HeaderBase section', () => {
      const { getByTestId } = render(
        <TestWrapper>
          {(scrollY) => (
            <HeaderWithTitleLeftScrollable title="Test" scrollY={scrollY} />
          )}
        </TestWrapper>,
      );

      expect(
        getByTestId(HeaderWithTitleLeftScrollableTestIds.HEADER_BASE),
      ).toBeTruthy();
    });

    it('renders compact title section', () => {
      const { getByTestId } = render(
        <TestWrapper>
          {(scrollY) => (
            <HeaderWithTitleLeftScrollable title="Test" scrollY={scrollY} />
          )}
        </TestWrapper>,
      );

      expect(
        getByTestId(HeaderWithTitleLeftScrollableTestIds.COMPACT_TITLE),
      ).toBeTruthy();
    });

    it('renders large content section', () => {
      const { getByTestId } = render(
        <TestWrapper>
          {(scrollY) => (
            <HeaderWithTitleLeftScrollable title="Test" scrollY={scrollY} />
          )}
        </TestWrapper>,
      );

      expect(
        getByTestId(HeaderWithTitleLeftScrollableTestIds.LARGE_CONTENT),
      ).toBeTruthy();
    });
  });

  describe('back button', () => {
    it('renders back button when onBack provided', () => {
      const { getByTestId } = render(
        <TestWrapper>
          {(scrollY) => (
            <HeaderWithTitleLeftScrollable
              title="Test"
              scrollY={scrollY}
              onBack={() => {}}
            />
          )}
        </TestWrapper>,
      );

      expect(
        getByTestId(HeaderWithTitleLeftScrollableTestIds.BACK_BUTTON),
      ).toBeTruthy();
    });

    it('renders back button when backButtonProps provided', () => {
      const { getByTestId } = render(
        <TestWrapper>
          {(scrollY) => (
            <HeaderWithTitleLeftScrollable
              title="Test"
              scrollY={scrollY}
              backButtonProps={{ onPress: () => {} }}
            />
          )}
        </TestWrapper>,
      );

      expect(
        getByTestId(HeaderWithTitleLeftScrollableTestIds.BACK_BUTTON),
      ).toBeTruthy();
    });
  });

  describe('titleLeft and titleLeftProps', () => {
    it('renders custom titleLeft node', () => {
      const { getByText } = render(
        <TestWrapper>
          {(scrollY) => (
            <HeaderWithTitleLeftScrollable
              title="Test"
              scrollY={scrollY}
              titleLeft={<Text>Custom Content</Text>}
            />
          )}
        </TestWrapper>,
      );

      expect(getByText('Custom Content')).toBeTruthy();
    });

    it('titleLeft takes priority over titleLeftProps', () => {
      const { getByText, queryByText } = render(
        <TestWrapper>
          {(scrollY) => (
            <HeaderWithTitleLeftScrollable
              title="Test"
              scrollY={scrollY}
              titleLeft={<Text>Custom Node</Text>}
              titleLeftProps={{ title: 'Props Title' }}
            />
          )}
        </TestWrapper>,
      );

      expect(getByText('Custom Node')).toBeTruthy();
      expect(queryByText('Props Title')).toBeNull();
    });
  });

  describe('props', () => {
    it('accepts custom testID', () => {
      const { getByTestId } = render(
        <TestWrapper>
          {(scrollY) => (
            <HeaderWithTitleLeftScrollable
              title="Test"
              scrollY={scrollY}
              testID="custom-header"
            />
          )}
        </TestWrapper>,
      );

      expect(getByTestId('custom-header')).toBeTruthy();
    });

    it('accepts custom scrollTriggerPosition', () => {
      const { getByTestId } = render(
        <TestWrapper>
          {(scrollY) => (
            <HeaderWithTitleLeftScrollable
              title="Test"
              scrollY={scrollY}
              scrollTriggerPosition={60}
            />
          )}
        </TestWrapper>,
      );

      expect(
        getByTestId(HeaderWithTitleLeftScrollableTestIds.CONTAINER),
      ).toBeTruthy();
    });
  });
});

describe('useHeaderWithTitleLeftScrollable', () => {
  it('returns onScroll handler', () => {
    const result = useHeaderWithTitleLeftScrollable();

    expect(result.onScroll).toBeDefined();
  });

  it('returns scrollY shared value', () => {
    const result = useHeaderWithTitleLeftScrollable();

    expect(result.scrollY).toBeDefined();
    expect(result.scrollY.value).toBe(0);
  });

  it('returns expandedHeight', () => {
    const result = useHeaderWithTitleLeftScrollable();

    expect(result.expandedHeight).toBe(140);
  });

  it('returns scrollTriggerPosition defaulting to expandedHeight', () => {
    const result = useHeaderWithTitleLeftScrollable();

    expect(result.scrollTriggerPosition).toBe(result.expandedHeight);
  });

  it('uses custom scrollTriggerPosition when provided', () => {
    const result = useHeaderWithTitleLeftScrollable({
      scrollTriggerPosition: 80,
    });

    expect(result.scrollTriggerPosition).toBe(80);
  });

  it('uses custom expandedHeight when provided', () => {
    const result = useHeaderWithTitleLeftScrollable({ expandedHeight: 200 });

    expect(result.expandedHeight).toBe(200);
  });
});


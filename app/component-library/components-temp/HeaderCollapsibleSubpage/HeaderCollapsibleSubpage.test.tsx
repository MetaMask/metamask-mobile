// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSharedValue, SharedValue } from 'react-native-reanimated';
import { Text, IconName } from '@metamask/design-system-react-native';

// Internal dependencies.
import HeaderCollapsibleSubpage from './HeaderCollapsibleSubpage';

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

const TEST_IDS = {
  CONTAINER: 'header-collapsible-subpage-container',
  TITLE_SECTION: 'header-collapsible-subpage-title-section',
  BACK_BUTTON: 'header-collapsible-subpage-back-button',
  CLOSE_BUTTON: 'header-collapsible-subpage-close-button',
  HEADER_BASE_END_ACCESSORY: 'header-base-end-accessory',
};

// Test wrapper component that provides scrollY
const TestWrapper: React.FC<{
  children: (scrollYValue: SharedValue<number>) => React.ReactNode;
}> = ({ children }) => {
  const scrollYValue = useSharedValue(0);
  return <>{children(scrollYValue)}</>;
};

describe('HeaderCollapsibleSubpage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders container with correct testID', () => {
      const { getByTestId } = render(
        <TestWrapper>
          {(scrollYValue) => (
            <HeaderCollapsibleSubpage
              title="Test"
              scrollY={scrollYValue}
              testID={TEST_IDS.CONTAINER}
              titleSubpageProps={{ title: 'Test' }}
            />
          )}
        </TestWrapper>,
      );

      expect(getByTestId(TEST_IDS.CONTAINER)).toBeOnTheScreen();
    });

    it('renders TitleSubpage with props when titleSubpageProps provided', () => {
      const { getByText, getByTestId } = render(
        <TestWrapper>
          {(scrollYValue) => (
            <HeaderCollapsibleSubpage
              title="Test"
              scrollY={scrollYValue}
              titleSubpageProps={{
                title: 'Token Name',
                bottomLabel: '$1,234.56',
                testID: TEST_IDS.TITLE_SECTION,
              }}
            />
          )}
        </TestWrapper>,
      );

      expect(getByText('Token Name')).toBeOnTheScreen();
      expect(getByText('$1,234.56')).toBeOnTheScreen();
      expect(getByTestId(TEST_IDS.TITLE_SECTION)).toBeOnTheScreen();
    });

    it('renders custom titleSubpage node when provided', () => {
      const { getByText } = render(
        <TestWrapper>
          {(scrollYValue) => (
            <HeaderCollapsibleSubpage
              title="Test"
              scrollY={scrollYValue}
              titleSubpage={<Text>Custom Title Section</Text>}
            />
          )}
        </TestWrapper>,
      );

      expect(getByText('Custom Title Section')).toBeOnTheScreen();
    });

    it('titleSubpage takes priority over titleSubpageProps', () => {
      const { getByText, queryByText } = render(
        <TestWrapper>
          {(scrollYValue) => (
            <HeaderCollapsibleSubpage
              title="Test"
              scrollY={scrollYValue}
              titleSubpage={<Text>Custom Node</Text>}
              titleSubpageProps={{ title: 'Props Title' }}
            />
          )}
        </TestWrapper>,
      );

      expect(getByText('Custom Node')).toBeOnTheScreen();
      expect(queryByText('Props Title')).toBeNull();
    });

    it('passes titleSectionTestID to TitleSubpage when titleSubpageProps provided', () => {
      const { getByTestId } = render(
        <TestWrapper>
          {(scrollYValue) => (
            <HeaderCollapsibleSubpage
              title="Test"
              scrollY={scrollYValue}
              titleSubpageProps={{ title: 'Token Name' }}
              titleSectionTestID={TEST_IDS.TITLE_SECTION}
            />
          )}
        </TestWrapper>,
      );

      expect(getByTestId(TEST_IDS.TITLE_SECTION)).toBeOnTheScreen();
    });
  });

  describe('back button', () => {
    it('renders back button when onBack provided', () => {
      const { getByTestId } = render(
        <TestWrapper>
          {(scrollYValue) => (
            <HeaderCollapsibleSubpage
              title="Test"
              scrollY={scrollYValue}
              onBack={jest.fn()}
              backButtonProps={{ testID: TEST_IDS.BACK_BUTTON }}
              titleSubpageProps={{ title: 'Test' }}
            />
          )}
        </TestWrapper>,
      );

      expect(getByTestId(TEST_IDS.BACK_BUTTON)).toBeOnTheScreen();
    });

    it('renders back button when backButtonProps provided', () => {
      const { getByTestId } = render(
        <TestWrapper>
          {(scrollYValue) => (
            <HeaderCollapsibleSubpage
              title="Test"
              scrollY={scrollYValue}
              backButtonProps={{
                onPress: jest.fn(),
                testID: TEST_IDS.BACK_BUTTON,
              }}
              titleSubpageProps={{ title: 'Test' }}
            />
          )}
        </TestWrapper>,
      );

      expect(getByTestId(TEST_IDS.BACK_BUTTON)).toBeOnTheScreen();
    });

    it('calls onBack when back button pressed', () => {
      const onBack = jest.fn();
      const { getByTestId } = render(
        <TestWrapper>
          {(scrollYValue) => (
            <HeaderCollapsibleSubpage
              title="Test"
              scrollY={scrollYValue}
              onBack={onBack}
              backButtonProps={{ testID: TEST_IDS.BACK_BUTTON }}
              titleSubpageProps={{ title: 'Test' }}
            />
          )}
        </TestWrapper>,
      );

      fireEvent.press(getByTestId(TEST_IDS.BACK_BUTTON));

      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('backButtonProps.onPress takes priority over onBack', () => {
      const onBack = jest.fn();
      const onPress = jest.fn();
      const { getByTestId } = render(
        <TestWrapper>
          {(scrollYValue) => (
            <HeaderCollapsibleSubpage
              title="Test"
              scrollY={scrollYValue}
              onBack={onBack}
              backButtonProps={{ onPress, testID: TEST_IDS.BACK_BUTTON }}
              titleSubpageProps={{ title: 'Test' }}
            />
          )}
        </TestWrapper>,
      );

      fireEvent.press(getByTestId(TEST_IDS.BACK_BUTTON));

      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onBack).not.toHaveBeenCalled();
    });
  });

  describe('close button', () => {
    it('renders close button when onClose provided', () => {
      const { getByTestId } = render(
        <TestWrapper>
          {(scrollYValue) => (
            <HeaderCollapsibleSubpage
              title="Test"
              scrollY={scrollYValue}
              onClose={jest.fn()}
              closeButtonProps={{ testID: TEST_IDS.CLOSE_BUTTON }}
              titleSubpageProps={{ title: 'Test' }}
            />
          )}
        </TestWrapper>,
      );

      expect(getByTestId(TEST_IDS.CLOSE_BUTTON)).toBeOnTheScreen();
    });

    it('calls onClose when close button pressed', () => {
      const onClose = jest.fn();
      const { getByTestId } = render(
        <TestWrapper>
          {(scrollYValue) => (
            <HeaderCollapsibleSubpage
              title="Test"
              scrollY={scrollYValue}
              onClose={onClose}
              closeButtonProps={{ testID: TEST_IDS.CLOSE_BUTTON }}
              titleSubpageProps={{ title: 'Test' }}
            />
          )}
        </TestWrapper>,
      );

      fireEvent.press(getByTestId(TEST_IDS.CLOSE_BUTTON));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('closeButtonProps.onPress takes priority over onClose', () => {
      const onClose = jest.fn();
      const onPress = jest.fn();
      const { getByTestId } = render(
        <TestWrapper>
          {(scrollYValue) => (
            <HeaderCollapsibleSubpage
              title="Test"
              scrollY={scrollYValue}
              onClose={onClose}
              closeButtonProps={{ onPress, testID: TEST_IDS.CLOSE_BUTTON }}
              titleSubpageProps={{ title: 'Test' }}
            />
          )}
        </TestWrapper>,
      );

      fireEvent.press(getByTestId(TEST_IDS.CLOSE_BUTTON));

      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('props forwarding', () => {
    it('forwards endButtonIconProps to HeaderBase', () => {
      const { getByTestId } = render(
        <TestWrapper>
          {(scrollYValue) => (
            <HeaderCollapsibleSubpage
              title="Test"
              scrollY={scrollYValue}
              onBack={jest.fn()}
              endButtonIconProps={[
                {
                  iconName: IconName.Close,
                  onPress: jest.fn(),
                  testID: TEST_IDS.HEADER_BASE_END_ACCESSORY,
                },
              ]}
              titleSubpageProps={{ title: 'Test' }}
            />
          )}
        </TestWrapper>,
      );

      expect(getByTestId(TEST_IDS.HEADER_BASE_END_ACCESSORY)).toBeOnTheScreen();
    });

    it('forwards startButtonIconProps directly when provided', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <TestWrapper>
          {(scrollYValue) => (
            <HeaderCollapsibleSubpage
              title="Test"
              scrollY={scrollYValue}
              startButtonIconProps={{
                iconName: IconName.Menu,
                onPress,
                testID: 'custom-start-button',
              }}
              titleSubpageProps={{ title: 'Test' }}
            />
          )}
        </TestWrapper>,
      );

      expect(getByTestId('custom-start-button')).toBeOnTheScreen();
    });
  });
});

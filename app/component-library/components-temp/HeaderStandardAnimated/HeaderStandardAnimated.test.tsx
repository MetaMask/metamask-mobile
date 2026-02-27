// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

// External dependencies.
import { IconName } from '@metamask/design-system-react-native';
import type { SharedValue } from 'react-native-reanimated';

// Internal dependencies.
import HeaderStandardAnimated from './HeaderStandardAnimated';

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  Reanimated.useSharedValue = jest.fn((initial: number) => ({
    value: initial,
  }));
  Reanimated.useAnimatedStyle = jest.fn((fn: () => object) => fn());
  return Reanimated;
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

const CONTAINER_TEST_ID = 'header-standard-animated-container';
const TITLE_TEST_ID = 'header-standard-animated-title';
const SUBTITLE_TEST_ID = 'header-standard-animated-subtitle';
const BACK_BUTTON_TEST_ID = 'header-standard-animated-back-button';
const CLOSE_BUTTON_TEST_ID = 'header-standard-animated-close-button';

const createMockSharedValue = (initial: number): SharedValue<number> => {
  const ref = { value: initial };
  return {
    get value() {
      return ref.value;
    },
    set value(v: number) {
      ref.value = v;
    },
    get: () => ref.value,
    set: (v: number | ((prev: number) => number)) => {
      ref.value = typeof v === 'function' ? v(ref.value) : v;
    },
    addListener: jest.fn(),
    removeListener: jest.fn(),
    modify: jest.fn(),
  };
};

const defaultProps = {
  scrollY: createMockSharedValue(0),
  titleSectionHeight: createMockSharedValue(100),
};

describe('HeaderStandardAnimated', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders with title', () => {
      const { getByText } = render(
        <HeaderStandardAnimated {...defaultProps} title="Test Title" />,
      );

      expect(getByText('Test Title')).toBeOnTheScreen();
    });

    it('renders title with testID when provided via titleProps', () => {
      const { getByTestId } = render(
        <HeaderStandardAnimated
          {...defaultProps}
          title="Test Title"
          titleProps={{ testID: TITLE_TEST_ID }}
        />,
      );

      expect(getByTestId(TITLE_TEST_ID)).toBeOnTheScreen();
    });

    it('renders container with testID when provided', () => {
      const { getByTestId } = render(
        <HeaderStandardAnimated
          {...defaultProps}
          title="Test Title"
          testID={CONTAINER_TEST_ID}
        />,
      );

      expect(getByTestId(CONTAINER_TEST_ID)).toBeOnTheScreen();
    });

    it('renders custom children instead of title', () => {
      const { getByText, queryByText } = render(
        <HeaderStandardAnimated {...defaultProps} title="Ignored Title">
          <Text>Custom Content</Text>
        </HeaderStandardAnimated>,
      );

      expect(getByText('Custom Content')).toBeOnTheScreen();
      expect(queryByText('Ignored Title')).not.toBeOnTheScreen();
    });

    it('renders children when both title and children provided', () => {
      const { getByText, queryByText } = render(
        <HeaderStandardAnimated {...defaultProps} title="Title Text">
          <Text>Children Text</Text>
        </HeaderStandardAnimated>,
      );

      expect(getByText('Children Text')).toBeOnTheScreen();
      expect(queryByText('Title Text')).not.toBeOnTheScreen();
    });

    it('renders subtitle when provided', () => {
      const { getByText } = render(
        <HeaderStandardAnimated
          {...defaultProps}
          title="Test Title"
          subtitle="Test Subtitle"
        />,
      );

      expect(getByText('Test Subtitle')).toBeOnTheScreen();
    });

    it('does not render subtitle when not provided', () => {
      const { queryByText } = render(
        <HeaderStandardAnimated {...defaultProps} title="Test Title" />,
      );

      expect(queryByText('Test Subtitle')).not.toBeOnTheScreen();
    });

    it('renders subtitle with testID when provided via subtitleProps', () => {
      const { getByTestId } = render(
        <HeaderStandardAnimated
          {...defaultProps}
          title="Test Title"
          subtitle="Test Subtitle"
          subtitleProps={{ testID: SUBTITLE_TEST_ID }}
        />,
      );

      expect(getByTestId(SUBTITLE_TEST_ID)).toBeOnTheScreen();
    });

    it('renders both title and subtitle together', () => {
      const { getByText } = render(
        <HeaderStandardAnimated
          {...defaultProps}
          title="Main Title"
          subtitle="Supporting Text"
        />,
      );

      expect(getByText('Main Title')).toBeOnTheScreen();
      expect(getByText('Supporting Text')).toBeOnTheScreen();
    });
  });

  describe('back button', () => {
    it('renders back button when onBack provided', () => {
      const { getByTestId } = render(
        <HeaderStandardAnimated
          {...defaultProps}
          title="Title"
          onBack={jest.fn()}
          backButtonProps={{ testID: BACK_BUTTON_TEST_ID }}
        />,
      );

      expect(getByTestId(BACK_BUTTON_TEST_ID)).toBeOnTheScreen();
    });

    it('renders back button when backButtonProps provided', () => {
      const { getByTestId } = render(
        <HeaderStandardAnimated
          {...defaultProps}
          title="Title"
          backButtonProps={{
            onPress: jest.fn(),
            testID: BACK_BUTTON_TEST_ID,
          }}
        />,
      );

      expect(getByTestId(BACK_BUTTON_TEST_ID)).toBeOnTheScreen();
    });

    it('calls onBack when back button pressed', () => {
      const onBack = jest.fn();
      const { getByTestId } = render(
        <HeaderStandardAnimated
          {...defaultProps}
          title="Title"
          onBack={onBack}
          backButtonProps={{ testID: BACK_BUTTON_TEST_ID }}
        />,
      );

      fireEvent.press(getByTestId(BACK_BUTTON_TEST_ID));

      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('calls backButtonProps.onPress when back button pressed', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <HeaderStandardAnimated
          {...defaultProps}
          title="Title"
          backButtonProps={{ onPress, testID: BACK_BUTTON_TEST_ID }}
        />,
      );

      fireEvent.press(getByTestId(BACK_BUTTON_TEST_ID));

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('uses backButtonProps.onPress over onBack when both provided', () => {
      const onBack = jest.fn();
      const onPress = jest.fn();
      const { getByTestId } = render(
        <HeaderStandardAnimated
          {...defaultProps}
          title="Title"
          onBack={onBack}
          backButtonProps={{ onPress, testID: BACK_BUTTON_TEST_ID }}
        />,
      );

      fireEvent.press(getByTestId(BACK_BUTTON_TEST_ID));

      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onBack).not.toHaveBeenCalled();
    });

    it('renders startButtonIconProps when provided', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <HeaderStandardAnimated
          {...defaultProps}
          title="Title"
          startButtonIconProps={{
            iconName: IconName.Menu,
            onPress,
            testID: 'custom-start-button',
          }}
        />,
      );

      expect(getByTestId('custom-start-button')).toBeOnTheScreen();
    });

    it('startButtonIconProps takes priority over onBack', () => {
      const onBack = jest.fn();
      const onPress = jest.fn();
      const { getByTestId, queryByTestId } = render(
        <HeaderStandardAnimated
          {...defaultProps}
          title="Title"
          onBack={onBack}
          backButtonProps={{ testID: BACK_BUTTON_TEST_ID }}
          startButtonIconProps={{
            iconName: IconName.Menu,
            onPress,
            testID: 'custom-start-button',
          }}
        />,
      );

      expect(getByTestId('custom-start-button')).toBeOnTheScreen();
      expect(queryByTestId(BACK_BUTTON_TEST_ID)).not.toBeOnTheScreen();
    });
  });

  describe('close button', () => {
    it('renders close button when onClose provided', () => {
      const { getByTestId } = render(
        <HeaderStandardAnimated
          {...defaultProps}
          title="Title"
          onClose={jest.fn()}
          closeButtonProps={{ testID: CLOSE_BUTTON_TEST_ID }}
        />,
      );

      expect(getByTestId(CLOSE_BUTTON_TEST_ID)).toBeOnTheScreen();
    });

    it('renders close button when closeButtonProps provided', () => {
      const { getByTestId } = render(
        <HeaderStandardAnimated
          {...defaultProps}
          title="Title"
          closeButtonProps={{
            onPress: jest.fn(),
            testID: CLOSE_BUTTON_TEST_ID,
          }}
        />,
      );

      expect(getByTestId(CLOSE_BUTTON_TEST_ID)).toBeOnTheScreen();
    });

    it('calls onClose when close button pressed', () => {
      const onClose = jest.fn();
      const { getByTestId } = render(
        <HeaderStandardAnimated
          {...defaultProps}
          title="Title"
          onClose={onClose}
          closeButtonProps={{ testID: CLOSE_BUTTON_TEST_ID }}
        />,
      );

      fireEvent.press(getByTestId(CLOSE_BUTTON_TEST_ID));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls closeButtonProps.onPress when close button pressed', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <HeaderStandardAnimated
          {...defaultProps}
          title="Title"
          closeButtonProps={{ onPress, testID: CLOSE_BUTTON_TEST_ID }}
        />,
      );

      fireEvent.press(getByTestId(CLOSE_BUTTON_TEST_ID));

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('uses closeButtonProps.onPress over onClose when both provided', () => {
      const onClose = jest.fn();
      const onPress = jest.fn();
      const { getByTestId } = render(
        <HeaderStandardAnimated
          {...defaultProps}
          title="Title"
          onClose={onClose}
          closeButtonProps={{ onPress, testID: CLOSE_BUTTON_TEST_ID }}
        />,
      );

      fireEvent.press(getByTestId(CLOSE_BUTTON_TEST_ID));

      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('props forwarding', () => {
    it('accepts custom testID', () => {
      const { getByTestId } = render(
        <HeaderStandardAnimated
          {...defaultProps}
          title="Title"
          testID="custom-header"
        />,
      );

      expect(getByTestId('custom-header')).toBeOnTheScreen();
    });
  });
});

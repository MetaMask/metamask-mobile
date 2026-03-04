// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

// External dependencies.
import { IconName } from '@metamask/design-system-react-native';

// Internal dependencies.
import HeaderStandard from './HeaderStandard';

const CONTAINER_TEST_ID = 'header-compact-standard-container';
const TITLE_TEST_ID = 'header-compact-standard-title';
const BACK_BUTTON_TEST_ID = 'header-compact-standard-back-button';
const CLOSE_BUTTON_TEST_ID = 'header-compact-standard-close-button';
const START_ACCESSORY_TEST_ID = 'start-accessory-wrapper';
const END_ACCESSORY_TEST_ID = 'end-accessory-wrapper';

describe('HeaderStandard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders with title', () => {
      const { getByText } = render(<HeaderStandard title="Test Title" />);

      expect(getByText('Test Title')).toBeOnTheScreen();
    });

    it('renders title with testID when provided via titleProps', () => {
      const { getByTestId } = render(
        <HeaderStandard
          title="Test Title"
          titleProps={{ testID: TITLE_TEST_ID }}
        />,
      );

      expect(getByTestId(TITLE_TEST_ID)).toBeOnTheScreen();
    });

    it('renders container with testID when provided', () => {
      const { getByTestId } = render(
        <HeaderStandard title="Test Title" testID={CONTAINER_TEST_ID} />,
      );

      expect(getByTestId(CONTAINER_TEST_ID)).toBeOnTheScreen();
    });

    it('renders custom children instead of title', () => {
      const { getByText, queryByText } = render(
        <HeaderStandard title="Ignored Title">
          <Text>Custom Content</Text>
        </HeaderStandard>,
      );

      expect(getByText('Custom Content')).toBeOnTheScreen();
      expect(queryByText('Ignored Title')).not.toBeOnTheScreen();
    });

    it('renders children when both title and children provided', () => {
      const { getByText, queryByText } = render(
        <HeaderStandard title="Title Text">
          <Text>Children Text</Text>
        </HeaderStandard>,
      );

      expect(getByText('Children Text')).toBeOnTheScreen();
      expect(queryByText('Title Text')).not.toBeOnTheScreen();
    });

    it('renders subtitle when provided', () => {
      const { getByText } = render(
        <HeaderStandard title="Test Title" subtitle="Test Subtitle" />,
      );

      expect(getByText('Test Subtitle')).toBeOnTheScreen();
    });

    it('does not render subtitle when not provided', () => {
      const { queryByText } = render(<HeaderStandard title="Test Title" />);

      expect(queryByText('Test Subtitle')).not.toBeOnTheScreen();
    });

    it('renders subtitle with testID when provided via subtitleProps', () => {
      const { getByTestId } = render(
        <HeaderStandard
          title="Test Title"
          subtitle="Test Subtitle"
          subtitleProps={{ testID: 'subtitle-test-id' }}
        />,
      );

      expect(getByTestId('subtitle-test-id')).toBeOnTheScreen();
    });

    it('renders both title and subtitle together', () => {
      const { getByText } = render(
        <HeaderStandard title="Main Title" subtitle="Supporting Text" />,
      );

      expect(getByText('Main Title')).toBeOnTheScreen();
      expect(getByText('Supporting Text')).toBeOnTheScreen();
    });

    it('renders title when passed as React node', () => {
      const TITLE_NODE_TEST_ID = 'custom-title-node';
      const { getByTestId, getByText } = render(
        <HeaderStandard
          title={<Text testID={TITLE_NODE_TEST_ID}>Custom Title Node</Text>}
        />,
      );

      expect(getByTestId(TITLE_NODE_TEST_ID)).toBeOnTheScreen();
      expect(getByText('Custom Title Node')).toBeOnTheScreen();
    });

    it('renders subtitle when passed as React node', () => {
      const SUBTITLE_NODE_TEST_ID = 'custom-subtitle-node';
      const { getByTestId, getByText } = render(
        <HeaderStandard
          title="Page Title"
          subtitle={
            <Text testID={SUBTITLE_NODE_TEST_ID}>Custom Subtitle Node</Text>
          }
        />,
      );

      expect(getByTestId(SUBTITLE_NODE_TEST_ID)).toBeOnTheScreen();
      expect(getByText('Custom Subtitle Node')).toBeOnTheScreen();
    });

    it('renders both title and subtitle as React nodes', () => {
      const TITLE_NODE_TEST_ID = 'title-node';
      const SUBTITLE_NODE_TEST_ID = 'subtitle-node';
      const { getByTestId } = render(
        <HeaderStandard
          title={<Text testID={TITLE_NODE_TEST_ID}>Node Title</Text>}
          subtitle={<Text testID={SUBTITLE_NODE_TEST_ID}>Node Subtitle</Text>}
        />,
      );

      expect(getByTestId(TITLE_NODE_TEST_ID)).toBeOnTheScreen();
      expect(getByTestId(SUBTITLE_NODE_TEST_ID)).toBeOnTheScreen();
    });
  });

  describe('back button', () => {
    it('renders back button when onBack provided', () => {
      const { getByTestId } = render(
        <HeaderStandard
          title="Title"
          onBack={jest.fn()}
          backButtonProps={{ testID: BACK_BUTTON_TEST_ID }}
        />,
      );

      expect(getByTestId(BACK_BUTTON_TEST_ID)).toBeOnTheScreen();
    });

    it('renders back button when backButtonProps provided', () => {
      const { getByTestId } = render(
        <HeaderStandard
          title="Title"
          backButtonProps={{ onPress: jest.fn(), testID: BACK_BUTTON_TEST_ID }}
        />,
      );

      expect(getByTestId(BACK_BUTTON_TEST_ID)).toBeOnTheScreen();
    });

    it('calls onBack when back button pressed', () => {
      const onBack = jest.fn();
      const { getByTestId } = render(
        <HeaderStandard
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
        <HeaderStandard
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
        <HeaderStandard
          title="Title"
          onBack={onBack}
          backButtonProps={{ onPress, testID: BACK_BUTTON_TEST_ID }}
        />,
      );

      fireEvent.press(getByTestId(BACK_BUTTON_TEST_ID));

      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onBack).not.toHaveBeenCalled();
    });

    it('does not render start accessory when no back button props provided', () => {
      const { queryByTestId } = render(
        <HeaderStandard
          title="Title"
          startAccessoryWrapperProps={{ testID: START_ACCESSORY_TEST_ID }}
        />,
      );

      expect(queryByTestId(START_ACCESSORY_TEST_ID)).not.toBeOnTheScreen();
    });

    it('renders startButtonIconProps when provided', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <HeaderStandard
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
        <HeaderStandard
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
        <HeaderStandard
          title="Title"
          onClose={jest.fn()}
          closeButtonProps={{ testID: CLOSE_BUTTON_TEST_ID }}
        />,
      );

      expect(getByTestId(CLOSE_BUTTON_TEST_ID)).toBeOnTheScreen();
    });

    it('renders close button when closeButtonProps provided', () => {
      const { getByTestId } = render(
        <HeaderStandard
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
        <HeaderStandard
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
        <HeaderStandard
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
        <HeaderStandard
          title="Title"
          onClose={onClose}
          closeButtonProps={{ onPress, testID: CLOSE_BUTTON_TEST_ID }}
        />,
      );

      fireEvent.press(getByTestId(CLOSE_BUTTON_TEST_ID));

      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not render end accessory when no close button props provided', () => {
      const { queryByTestId } = render(
        <HeaderStandard
          title="Title"
          endAccessoryWrapperProps={{ testID: END_ACCESSORY_TEST_ID }}
        />,
      );

      expect(queryByTestId(END_ACCESSORY_TEST_ID)).not.toBeOnTheScreen();
    });
  });

  describe('props forwarding', () => {
    it('renders start accessory when onBack is provided', () => {
      const { getByTestId } = render(
        <HeaderStandard
          title="Title"
          onBack={jest.fn()}
          backButtonProps={{ testID: BACK_BUTTON_TEST_ID }}
          startAccessoryWrapperProps={{ testID: START_ACCESSORY_TEST_ID }}
        />,
      );

      expect(getByTestId(START_ACCESSORY_TEST_ID)).toBeOnTheScreen();
    });

    it('forwards endButtonIconProps and adds close button', () => {
      const { getByTestId } = render(
        <HeaderStandard
          title="Title"
          endButtonIconProps={[
            { iconName: IconName.Search, onPress: jest.fn() },
          ]}
          onClose={jest.fn()}
          closeButtonProps={{ testID: CLOSE_BUTTON_TEST_ID }}
          endAccessoryWrapperProps={{ testID: END_ACCESSORY_TEST_ID }}
        />,
      );

      expect(getByTestId(END_ACCESSORY_TEST_ID)).toBeOnTheScreen();
      expect(getByTestId(CLOSE_BUTTON_TEST_ID)).toBeOnTheScreen();
    });

    it('accepts custom testID', () => {
      const { getByTestId } = render(
        <HeaderStandard title="Title" testID="custom-header" />,
      );

      expect(getByTestId('custom-header')).toBeOnTheScreen();
    });
  });
});

// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

// External dependencies.
import { IconName } from '@metamask/design-system-react-native';

// Internal dependencies.
import HeaderCenter from './HeaderCenter';

const CONTAINER_TEST_ID = 'header-center-container';
const TITLE_TEST_ID = 'header-center-title';
const BACK_BUTTON_TEST_ID = 'header-center-back-button';
const CLOSE_BUTTON_TEST_ID = 'header-center-close-button';
const START_ACCESSORY_TEST_ID = 'start-accessory-wrapper';
const END_ACCESSORY_TEST_ID = 'end-accessory-wrapper';

describe('HeaderCenter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders with title', () => {
      const { getByText } = render(<HeaderCenter title="Test Title" />);

      expect(getByText('Test Title')).toBeTruthy();
    });

    it('renders title with testID when provided via titleProps', () => {
      const { getByTestId } = render(
        <HeaderCenter
          title="Test Title"
          titleProps={{ testID: TITLE_TEST_ID }}
        />,
      );

      expect(getByTestId(TITLE_TEST_ID)).toBeTruthy();
    });

    it('renders container with testID when provided', () => {
      const { getByTestId } = render(
        <HeaderCenter title="Test Title" testID={CONTAINER_TEST_ID} />,
      );

      expect(getByTestId(CONTAINER_TEST_ID)).toBeTruthy();
    });

    it('renders custom children instead of title', () => {
      const { getByText, queryByText } = render(
        <HeaderCenter title="Ignored Title">
          <Text>Custom Content</Text>
        </HeaderCenter>,
      );

      expect(getByText('Custom Content')).toBeTruthy();
      expect(queryByText('Ignored Title')).toBeNull();
    });

    it('renders children when both title and children provided', () => {
      const { getByText, queryByText } = render(
        <HeaderCenter title="Title Text">
          <Text>Children Text</Text>
        </HeaderCenter>,
      );

      expect(getByText('Children Text')).toBeTruthy();
      expect(queryByText('Title Text')).toBeNull();
    });
  });

  describe('back button', () => {
    it('renders back button when onBack provided', () => {
      const { getByTestId } = render(
        <HeaderCenter
          title="Title"
          onBack={jest.fn()}
          backButtonProps={{ testID: BACK_BUTTON_TEST_ID }}
        />,
      );

      expect(getByTestId(BACK_BUTTON_TEST_ID)).toBeTruthy();
    });

    it('renders back button when backButtonProps provided', () => {
      const { getByTestId } = render(
        <HeaderCenter
          title="Title"
          backButtonProps={{ onPress: jest.fn(), testID: BACK_BUTTON_TEST_ID }}
        />,
      );

      expect(getByTestId(BACK_BUTTON_TEST_ID)).toBeTruthy();
    });

    it('calls onBack when back button pressed', () => {
      const onBack = jest.fn();
      const { getByTestId } = render(
        <HeaderCenter
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
        <HeaderCenter
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
        <HeaderCenter
          title="Title"
          onBack={onBack}
          backButtonProps={{ onPress, testID: BACK_BUTTON_TEST_ID }}
        />,
      );

      fireEvent.press(getByTestId(BACK_BUTTON_TEST_ID));

      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onBack).not.toHaveBeenCalled();
    });

    it('does not render back button when neither onBack nor backButtonProps provided', () => {
      const { queryByTestId } = render(
        <HeaderCenter title="Title" testID={CONTAINER_TEST_ID} />,
      );

      expect(queryByTestId(BACK_BUTTON_TEST_ID)).toBeNull();
    });
  });

  describe('close button', () => {
    it('renders close button when onClose provided', () => {
      const { getByTestId } = render(
        <HeaderCenter
          title="Title"
          onClose={jest.fn()}
          closeButtonProps={{ testID: CLOSE_BUTTON_TEST_ID }}
        />,
      );

      expect(getByTestId(CLOSE_BUTTON_TEST_ID)).toBeTruthy();
    });

    it('renders close button when closeButtonProps provided', () => {
      const { getByTestId } = render(
        <HeaderCenter
          title="Title"
          closeButtonProps={{
            onPress: jest.fn(),
            testID: CLOSE_BUTTON_TEST_ID,
          }}
        />,
      );

      expect(getByTestId(CLOSE_BUTTON_TEST_ID)).toBeTruthy();
    });

    it('calls onClose when close button pressed', () => {
      const onClose = jest.fn();
      const { getByTestId } = render(
        <HeaderCenter
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
        <HeaderCenter
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
        <HeaderCenter
          title="Title"
          onClose={onClose}
          closeButtonProps={{ onPress, testID: CLOSE_BUTTON_TEST_ID }}
        />,
      );

      fireEvent.press(getByTestId(CLOSE_BUTTON_TEST_ID));

      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not render close button when neither onClose nor closeButtonProps provided', () => {
      const { queryByTestId } = render(
        <HeaderCenter title="Title" testID={CONTAINER_TEST_ID} />,
      );

      expect(queryByTestId(CLOSE_BUTTON_TEST_ID)).toBeNull();
    });
  });

  describe('props forwarding', () => {
    it('renders start accessory when onBack is provided', () => {
      const { getByTestId } = render(
        <HeaderCenter
          title="Title"
          onBack={jest.fn()}
          backButtonProps={{ testID: BACK_BUTTON_TEST_ID }}
          startAccessoryWrapperProps={{ testID: START_ACCESSORY_TEST_ID }}
        />,
      );

      expect(getByTestId(START_ACCESSORY_TEST_ID)).toBeTruthy();
    });

    it('forwards endButtonIconProps and adds close button', () => {
      const { getByTestId } = render(
        <HeaderCenter
          title="Title"
          endButtonIconProps={[
            { iconName: IconName.Search, onPress: jest.fn() },
          ]}
          onClose={jest.fn()}
          closeButtonProps={{ testID: CLOSE_BUTTON_TEST_ID }}
          endAccessoryWrapperProps={{ testID: END_ACCESSORY_TEST_ID }}
        />,
      );

      expect(getByTestId(END_ACCESSORY_TEST_ID)).toBeTruthy();
      expect(getByTestId(CLOSE_BUTTON_TEST_ID)).toBeTruthy();
    });

    it('accepts custom testID', () => {
      const { getByTestId } = render(
        <HeaderCenter title="Title" testID="custom-header" />,
      );

      expect(getByTestId('custom-header')).toBeTruthy();
    });
  });
});

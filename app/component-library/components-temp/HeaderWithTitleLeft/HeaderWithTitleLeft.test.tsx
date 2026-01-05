// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text, IconName } from '@metamask/design-system-react-native';

// Internal dependencies.
import HeaderWithTitleLeft from './HeaderWithTitleLeft';

const TEST_IDS = {
  CONTAINER: 'header-with-title-left-container',
  TITLE_SECTION: 'header-with-title-left-title-section',
  BACK_BUTTON: 'header-with-title-left-back-button',
  CLOSE_BUTTON: 'header-with-title-left-close-button',
  TITLE_LEFT: 'title-left',
  HEADER_BASE_END_ACCESSORY: 'header-base-end-accessory',
};

describe('HeaderWithTitleLeft', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders container with correct testID', () => {
      const { getByTestId } = render(
        <HeaderWithTitleLeft
          testID={TEST_IDS.CONTAINER}
          titleLeftProps={{ title: 'Test' }}
        />,
      );

      expect(getByTestId(TEST_IDS.CONTAINER)).toBeOnTheScreen();
    });

    it('renders title section when titleLeftProps provided', () => {
      const { getByTestId } = render(
        <HeaderWithTitleLeft
          titleSectionTestID={TEST_IDS.TITLE_SECTION}
          titleLeftProps={{ title: '$4.42' }}
        />,
      );

      expect(getByTestId(TEST_IDS.TITLE_SECTION)).toBeOnTheScreen();
    });

    it('renders TitleLeft with props when titleLeftProps provided', () => {
      const { getByText, getByTestId } = render(
        <HeaderWithTitleLeft
          titleLeftProps={{
            topLabel: 'Send',
            title: '$4.42',
            testID: TEST_IDS.TITLE_LEFT,
          }}
        />,
      );

      expect(getByText('Send')).toBeOnTheScreen();
      expect(getByText('$4.42')).toBeOnTheScreen();
      expect(getByTestId(TEST_IDS.TITLE_LEFT)).toBeOnTheScreen();
    });

    it('renders custom titleLeft node when provided', () => {
      const { getByText } = render(
        <HeaderWithTitleLeft titleLeft={<Text>Custom Title Section</Text>} />,
      );

      expect(getByText('Custom Title Section')).toBeOnTheScreen();
    });

    it('titleLeft takes priority over titleLeftProps', () => {
      const { getByText, queryByText } = render(
        <HeaderWithTitleLeft
          titleLeft={<Text>Custom Node</Text>}
          titleLeftProps={{ title: 'Props Title' }}
        />,
      );

      expect(getByText('Custom Node')).toBeOnTheScreen();
      expect(queryByText('Props Title')).toBeNull();
    });

    it('does not render title section when neither titleLeft nor titleLeftProps provided', () => {
      const { queryByTestId } = render(
        <HeaderWithTitleLeft
          onBack={jest.fn()}
          titleSectionTestID={TEST_IDS.TITLE_SECTION}
        />,
      );

      expect(queryByTestId(TEST_IDS.TITLE_SECTION)).toBeNull();
    });
  });

  describe('back button', () => {
    it('renders back button when onBack provided', () => {
      const { getByTestId } = render(
        <HeaderWithTitleLeft
          onBack={jest.fn()}
          backButtonProps={{ testID: TEST_IDS.BACK_BUTTON }}
          titleLeftProps={{ title: 'Test' }}
        />,
      );

      expect(getByTestId(TEST_IDS.BACK_BUTTON)).toBeOnTheScreen();
    });

    it('renders back button when backButtonProps provided', () => {
      const { getByTestId } = render(
        <HeaderWithTitleLeft
          backButtonProps={{ onPress: jest.fn(), testID: TEST_IDS.BACK_BUTTON }}
          titleLeftProps={{ title: 'Test' }}
        />,
      );

      expect(getByTestId(TEST_IDS.BACK_BUTTON)).toBeOnTheScreen();
    });

    it('calls onBack when back button pressed', () => {
      const onBack = jest.fn();
      const { getByTestId } = render(
        <HeaderWithTitleLeft
          onBack={onBack}
          backButtonProps={{ testID: TEST_IDS.BACK_BUTTON }}
          titleLeftProps={{ title: 'Test' }}
        />,
      );

      fireEvent.press(getByTestId(TEST_IDS.BACK_BUTTON));

      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('calls backButtonProps.onPress when back button pressed', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <HeaderWithTitleLeft
          backButtonProps={{ onPress, testID: TEST_IDS.BACK_BUTTON }}
          titleLeftProps={{ title: 'Test' }}
        />,
      );

      fireEvent.press(getByTestId(TEST_IDS.BACK_BUTTON));

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('backButtonProps.onPress takes priority over onBack', () => {
      const onBack = jest.fn();
      const onPress = jest.fn();
      const { getByTestId } = render(
        <HeaderWithTitleLeft
          onBack={onBack}
          backButtonProps={{ onPress, testID: TEST_IDS.BACK_BUTTON }}
          titleLeftProps={{ title: 'Test' }}
        />,
      );

      fireEvent.press(getByTestId(TEST_IDS.BACK_BUTTON));

      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onBack).not.toHaveBeenCalled();
    });

    it('does not render back button when neither onBack nor backButtonProps provided', () => {
      const { queryByLabelText } = render(
        <HeaderWithTitleLeft titleLeftProps={{ title: 'Test' }} />,
      );

      expect(queryByLabelText('Arrow Left')).toBeNull();
    });
  });

  describe('close button', () => {
    it('renders close button when onClose provided', () => {
      const { getByTestId } = render(
        <HeaderWithTitleLeft
          onClose={jest.fn()}
          closeButtonProps={{ testID: TEST_IDS.CLOSE_BUTTON }}
          titleLeftProps={{ title: 'Test' }}
        />,
      );

      expect(getByTestId(TEST_IDS.CLOSE_BUTTON)).toBeOnTheScreen();
    });

    it('renders close button when closeButtonProps provided', () => {
      const { getByTestId } = render(
        <HeaderWithTitleLeft
          closeButtonProps={{
            onPress: jest.fn(),
            testID: TEST_IDS.CLOSE_BUTTON,
          }}
          titleLeftProps={{ title: 'Test' }}
        />,
      );

      expect(getByTestId(TEST_IDS.CLOSE_BUTTON)).toBeOnTheScreen();
    });

    it('calls onClose when close button pressed', () => {
      const onClose = jest.fn();
      const { getByTestId } = render(
        <HeaderWithTitleLeft
          onClose={onClose}
          closeButtonProps={{ testID: TEST_IDS.CLOSE_BUTTON }}
          titleLeftProps={{ title: 'Test' }}
        />,
      );

      fireEvent.press(getByTestId(TEST_IDS.CLOSE_BUTTON));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls closeButtonProps.onPress when close button pressed', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <HeaderWithTitleLeft
          closeButtonProps={{ onPress, testID: TEST_IDS.CLOSE_BUTTON }}
          titleLeftProps={{ title: 'Test' }}
        />,
      );

      fireEvent.press(getByTestId(TEST_IDS.CLOSE_BUTTON));

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('closeButtonProps.onPress takes priority over onClose', () => {
      const onClose = jest.fn();
      const onPress = jest.fn();
      const { getByTestId } = render(
        <HeaderWithTitleLeft
          onClose={onClose}
          closeButtonProps={{ onPress, testID: TEST_IDS.CLOSE_BUTTON }}
          titleLeftProps={{ title: 'Test' }}
        />,
      );

      fireEvent.press(getByTestId(TEST_IDS.CLOSE_BUTTON));

      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not render close button when neither onClose nor closeButtonProps provided', () => {
      const { queryByLabelText } = render(
        <HeaderWithTitleLeft titleLeftProps={{ title: 'Test' }} />,
      );

      expect(queryByLabelText('Close')).toBeNull();
    });
  });

  describe('props forwarding', () => {
    it('forwards endButtonIconProps to HeaderBase', () => {
      const { getByTestId } = render(
        <HeaderWithTitleLeft
          onBack={jest.fn()}
          endButtonIconProps={[
            {
              iconName: IconName.Close,
              onPress: jest.fn(),
              testID: TEST_IDS.HEADER_BASE_END_ACCESSORY,
            },
          ]}
          titleLeftProps={{ title: 'Test' }}
        />,
      );

      expect(getByTestId(TEST_IDS.HEADER_BASE_END_ACCESSORY)).toBeOnTheScreen();
    });

    it('accepts custom testID', () => {
      const { getByTestId } = render(
        <HeaderWithTitleLeft
          testID="custom-header"
          titleLeftProps={{ title: 'Test' }}
        />,
      );

      expect(getByTestId('custom-header')).toBeOnTheScreen();
    });

    it('forwards startButtonIconProps directly when provided', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <HeaderWithTitleLeft
          startButtonIconProps={{
            iconName: IconName.Menu,
            onPress,
            testID: 'custom-start-button',
          }}
          titleLeftProps={{ title: 'Test' }}
        />,
      );

      expect(getByTestId('custom-start-button')).toBeOnTheScreen();
    });
  });
});

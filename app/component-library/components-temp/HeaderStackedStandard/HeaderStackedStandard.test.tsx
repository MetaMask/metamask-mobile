// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text, IconName } from '@metamask/design-system-react-native';

// Internal dependencies.
import HeaderStackedStandard from './HeaderStackedStandard';

const TEST_IDS = {
  CONTAINER: 'header-stacked-standard-container',
  TITLE_SECTION: 'header-stacked-standard-title-section',
  BACK_BUTTON: 'header-stacked-standard-back-button',
  CLOSE_BUTTON: 'header-stacked-standard-close-button',
  TITLE_STANDARD: 'title-standard',
  HEADER_BASE_END_ACCESSORY: 'header-base-end-accessory',
};

describe('HeaderStackedStandard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders container with correct testID', () => {
      const { getByTestId } = render(
        <HeaderStackedStandard
          testID={TEST_IDS.CONTAINER}
          titleStandardProps={{ title: 'Test' }}
        />,
      );

      expect(getByTestId(TEST_IDS.CONTAINER)).toBeOnTheScreen();
    });

    it('renders title section when titleStandardProps provided', () => {
      const { getByTestId } = render(
        <HeaderStackedStandard
          titleSectionTestID={TEST_IDS.TITLE_SECTION}
          titleStandardProps={{ title: '$4.42' }}
        />,
      );

      expect(getByTestId(TEST_IDS.TITLE_SECTION)).toBeOnTheScreen();
    });

    it('renders TitleStandard with props when titleStandardProps provided', () => {
      const { getByText, getByTestId } = render(
        <HeaderStackedStandard
          titleStandardProps={{
            topLabel: 'Send',
            title: '$4.42',
            testID: TEST_IDS.TITLE_STANDARD,
          }}
        />,
      );

      expect(getByText('Send')).toBeOnTheScreen();
      expect(getByText('$4.42')).toBeOnTheScreen();
      expect(getByTestId(TEST_IDS.TITLE_STANDARD)).toBeOnTheScreen();
    });

    it('renders custom titleStandard node when provided', () => {
      const { getByText } = render(
        <HeaderStackedStandard
          titleStandard={<Text>Custom Title Section</Text>}
        />,
      );

      expect(getByText('Custom Title Section')).toBeOnTheScreen();
    });

    it('titleStandard takes priority over titleStandardProps', () => {
      const { getByText, queryByText } = render(
        <HeaderStackedStandard
          titleStandard={<Text>Custom Node</Text>}
          titleStandardProps={{ title: 'Props Title' }}
        />,
      );

      expect(getByText('Custom Node')).toBeOnTheScreen();
      expect(queryByText('Props Title')).toBeNull();
    });

    it('does not render title section when neither titleStandard nor titleStandardProps provided', () => {
      const { queryByTestId } = render(
        <HeaderStackedStandard
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
        <HeaderStackedStandard
          onBack={jest.fn()}
          backButtonProps={{ testID: TEST_IDS.BACK_BUTTON }}
          titleStandardProps={{ title: 'Test' }}
        />,
      );

      expect(getByTestId(TEST_IDS.BACK_BUTTON)).toBeOnTheScreen();
    });

    it('renders back button when backButtonProps provided', () => {
      const { getByTestId } = render(
        <HeaderStackedStandard
          backButtonProps={{ onPress: jest.fn(), testID: TEST_IDS.BACK_BUTTON }}
          titleStandardProps={{ title: 'Test' }}
        />,
      );

      expect(getByTestId(TEST_IDS.BACK_BUTTON)).toBeOnTheScreen();
    });

    it('calls onBack when back button pressed', () => {
      const onBack = jest.fn();
      const { getByTestId } = render(
        <HeaderStackedStandard
          onBack={onBack}
          backButtonProps={{ testID: TEST_IDS.BACK_BUTTON }}
          titleStandardProps={{ title: 'Test' }}
        />,
      );

      fireEvent.press(getByTestId(TEST_IDS.BACK_BUTTON));

      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('calls backButtonProps.onPress when back button pressed', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <HeaderStackedStandard
          backButtonProps={{ onPress, testID: TEST_IDS.BACK_BUTTON }}
          titleStandardProps={{ title: 'Test' }}
        />,
      );

      fireEvent.press(getByTestId(TEST_IDS.BACK_BUTTON));

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('backButtonProps.onPress takes priority over onBack', () => {
      const onBack = jest.fn();
      const onPress = jest.fn();
      const { getByTestId } = render(
        <HeaderStackedStandard
          onBack={onBack}
          backButtonProps={{ onPress, testID: TEST_IDS.BACK_BUTTON }}
          titleStandardProps={{ title: 'Test' }}
        />,
      );

      fireEvent.press(getByTestId(TEST_IDS.BACK_BUTTON));

      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onBack).not.toHaveBeenCalled();
    });

    it('does not render back button when neither onBack nor backButtonProps provided', () => {
      const { queryByLabelText } = render(
        <HeaderStackedStandard titleStandardProps={{ title: 'Test' }} />,
      );

      expect(queryByLabelText('Arrow Left')).toBeNull();
    });
  });

  describe('close button', () => {
    it('renders close button when onClose provided', () => {
      const { getByTestId } = render(
        <HeaderStackedStandard
          onClose={jest.fn()}
          closeButtonProps={{ testID: TEST_IDS.CLOSE_BUTTON }}
          titleStandardProps={{ title: 'Test' }}
        />,
      );

      expect(getByTestId(TEST_IDS.CLOSE_BUTTON)).toBeOnTheScreen();
    });

    it('renders close button when closeButtonProps provided', () => {
      const { getByTestId } = render(
        <HeaderStackedStandard
          closeButtonProps={{
            onPress: jest.fn(),
            testID: TEST_IDS.CLOSE_BUTTON,
          }}
          titleStandardProps={{ title: 'Test' }}
        />,
      );

      expect(getByTestId(TEST_IDS.CLOSE_BUTTON)).toBeOnTheScreen();
    });

    it('calls onClose when close button pressed', () => {
      const onClose = jest.fn();
      const { getByTestId } = render(
        <HeaderStackedStandard
          onClose={onClose}
          closeButtonProps={{ testID: TEST_IDS.CLOSE_BUTTON }}
          titleStandardProps={{ title: 'Test' }}
        />,
      );

      fireEvent.press(getByTestId(TEST_IDS.CLOSE_BUTTON));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls closeButtonProps.onPress when close button pressed', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <HeaderStackedStandard
          closeButtonProps={{ onPress, testID: TEST_IDS.CLOSE_BUTTON }}
          titleStandardProps={{ title: 'Test' }}
        />,
      );

      fireEvent.press(getByTestId(TEST_IDS.CLOSE_BUTTON));

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('closeButtonProps.onPress takes priority over onClose', () => {
      const onClose = jest.fn();
      const onPress = jest.fn();
      const { getByTestId } = render(
        <HeaderStackedStandard
          onClose={onClose}
          closeButtonProps={{ onPress, testID: TEST_IDS.CLOSE_BUTTON }}
          titleStandardProps={{ title: 'Test' }}
        />,
      );

      fireEvent.press(getByTestId(TEST_IDS.CLOSE_BUTTON));

      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not render close button when neither onClose nor closeButtonProps provided', () => {
      const { queryByLabelText } = render(
        <HeaderStackedStandard titleStandardProps={{ title: 'Test' }} />,
      );

      expect(queryByLabelText('Close')).toBeNull();
    });
  });

  describe('props forwarding', () => {
    it('forwards endButtonIconProps to HeaderBase', () => {
      const { getByTestId } = render(
        <HeaderStackedStandard
          onBack={jest.fn()}
          endButtonIconProps={[
            {
              iconName: IconName.Close,
              onPress: jest.fn(),
              testID: TEST_IDS.HEADER_BASE_END_ACCESSORY,
            },
          ]}
          titleStandardProps={{ title: 'Test' }}
        />,
      );

      expect(getByTestId(TEST_IDS.HEADER_BASE_END_ACCESSORY)).toBeOnTheScreen();
    });

    it('accepts custom testID', () => {
      const { getByTestId } = render(
        <HeaderStackedStandard
          testID="custom-header"
          titleStandardProps={{ title: 'Test' }}
        />,
      );

      expect(getByTestId('custom-header')).toBeOnTheScreen();
    });

    it('forwards startButtonIconProps directly when provided', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <HeaderStackedStandard
          startButtonIconProps={{
            iconName: IconName.Menu,
            onPress,
            testID: 'custom-start-button',
          }}
          titleStandardProps={{ title: 'Test' }}
        />,
      );

      expect(getByTestId('custom-start-button')).toBeOnTheScreen();
    });
  });
});

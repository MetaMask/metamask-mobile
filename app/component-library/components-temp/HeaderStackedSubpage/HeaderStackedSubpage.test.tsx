// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text, IconName } from '@metamask/design-system-react-native';

// Internal dependencies.
import HeaderStackedSubpage from './HeaderStackedSubpage';

const TEST_IDS = {
  CONTAINER: 'header-stacked-subpage-container',
  TITLE_SECTION: 'header-stacked-subpage-title-section',
  BACK_BUTTON: 'header-stacked-subpage-back-button',
  CLOSE_BUTTON: 'header-stacked-subpage-close-button',
  TITLE_SUBPAGE: 'title-subpage',
  HEADER_BASE_END_ACCESSORY: 'header-base-end-accessory',
};

describe('HeaderStackedSubpage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders container with correct testID', () => {
      const { getByTestId } = render(
        <HeaderStackedSubpage
          testID={TEST_IDS.CONTAINER}
          titleSubpageProps={{ title: 'Test' }}
        />,
      );

      expect(getByTestId(TEST_IDS.CONTAINER)).toBeOnTheScreen();
    });

    it('renders title section when titleSubpageProps provided', () => {
      const { getByTestId } = render(
        <HeaderStackedSubpage
          titleSectionTestID={TEST_IDS.TITLE_SECTION}
          titleSubpageProps={{ title: '$4.42' }}
        />,
      );

      expect(getByTestId(TEST_IDS.TITLE_SECTION)).toBeOnTheScreen();
    });

    it('renders TitleSubpage with props when titleSubpageProps provided', () => {
      const { getByText, getByTestId } = render(
        <HeaderStackedSubpage
          titleSubpageProps={{
            title: 'Token Name',
            bottomLabel: '$1,234.56',
            testID: TEST_IDS.TITLE_SUBPAGE,
          }}
        />,
      );

      expect(getByText('Token Name')).toBeOnTheScreen();
      expect(getByText('$1,234.56')).toBeOnTheScreen();
      expect(getByTestId(TEST_IDS.TITLE_SUBPAGE)).toBeOnTheScreen();
    });

    it('renders custom titleSubpage node when provided', () => {
      const { getByText } = render(
        <HeaderStackedSubpage
          titleSubpage={<Text>Custom Title Section</Text>}
        />,
      );

      expect(getByText('Custom Title Section')).toBeOnTheScreen();
    });

    it('titleSubpage takes priority over titleSubpageProps', () => {
      const { getByText, queryByText } = render(
        <HeaderStackedSubpage
          titleSubpage={<Text>Custom Node</Text>}
          titleSubpageProps={{ title: 'Props Title' }}
        />,
      );

      expect(getByText('Custom Node')).toBeOnTheScreen();
      expect(queryByText('Props Title')).toBeNull();
    });

    it('does not render title section when neither titleSubpage nor titleSubpageProps provided', () => {
      const { queryByTestId } = render(
        <HeaderStackedSubpage
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
        <HeaderStackedSubpage
          onBack={jest.fn()}
          backButtonProps={{ testID: TEST_IDS.BACK_BUTTON }}
          titleSubpageProps={{ title: 'Test' }}
        />,
      );

      expect(getByTestId(TEST_IDS.BACK_BUTTON)).toBeOnTheScreen();
    });

    it('renders back button when backButtonProps provided', () => {
      const { getByTestId } = render(
        <HeaderStackedSubpage
          backButtonProps={{ onPress: jest.fn(), testID: TEST_IDS.BACK_BUTTON }}
          titleSubpageProps={{ title: 'Test' }}
        />,
      );

      expect(getByTestId(TEST_IDS.BACK_BUTTON)).toBeOnTheScreen();
    });

    it('calls onBack when back button pressed', () => {
      const onBack = jest.fn();
      const { getByTestId } = render(
        <HeaderStackedSubpage
          onBack={onBack}
          backButtonProps={{ testID: TEST_IDS.BACK_BUTTON }}
          titleSubpageProps={{ title: 'Test' }}
        />,
      );

      fireEvent.press(getByTestId(TEST_IDS.BACK_BUTTON));

      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('calls backButtonProps.onPress when back button pressed', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <HeaderStackedSubpage
          backButtonProps={{ onPress, testID: TEST_IDS.BACK_BUTTON }}
          titleSubpageProps={{ title: 'Test' }}
        />,
      );

      fireEvent.press(getByTestId(TEST_IDS.BACK_BUTTON));

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('backButtonProps.onPress takes priority over onBack', () => {
      const onBack = jest.fn();
      const onPress = jest.fn();
      const { getByTestId } = render(
        <HeaderStackedSubpage
          onBack={onBack}
          backButtonProps={{ onPress, testID: TEST_IDS.BACK_BUTTON }}
          titleSubpageProps={{ title: 'Test' }}
        />,
      );

      fireEvent.press(getByTestId(TEST_IDS.BACK_BUTTON));

      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onBack).not.toHaveBeenCalled();
    });

    it('does not render back button when neither onBack nor backButtonProps provided', () => {
      const { queryByLabelText } = render(
        <HeaderStackedSubpage titleSubpageProps={{ title: 'Test' }} />,
      );

      expect(queryByLabelText('Arrow Left')).toBeNull();
    });
  });

  describe('close button', () => {
    it('renders close button when onClose provided', () => {
      const { getByTestId } = render(
        <HeaderStackedSubpage
          onClose={jest.fn()}
          closeButtonProps={{ testID: TEST_IDS.CLOSE_BUTTON }}
          titleSubpageProps={{ title: 'Test' }}
        />,
      );

      expect(getByTestId(TEST_IDS.CLOSE_BUTTON)).toBeOnTheScreen();
    });

    it('renders close button when closeButtonProps provided', () => {
      const { getByTestId } = render(
        <HeaderStackedSubpage
          closeButtonProps={{
            onPress: jest.fn(),
            testID: TEST_IDS.CLOSE_BUTTON,
          }}
          titleSubpageProps={{ title: 'Test' }}
        />,
      );

      expect(getByTestId(TEST_IDS.CLOSE_BUTTON)).toBeOnTheScreen();
    });

    it('calls onClose when close button pressed', () => {
      const onClose = jest.fn();
      const { getByTestId } = render(
        <HeaderStackedSubpage
          onClose={onClose}
          closeButtonProps={{ testID: TEST_IDS.CLOSE_BUTTON }}
          titleSubpageProps={{ title: 'Test' }}
        />,
      );

      fireEvent.press(getByTestId(TEST_IDS.CLOSE_BUTTON));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls closeButtonProps.onPress when close button pressed', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <HeaderStackedSubpage
          closeButtonProps={{ onPress, testID: TEST_IDS.CLOSE_BUTTON }}
          titleSubpageProps={{ title: 'Test' }}
        />,
      );

      fireEvent.press(getByTestId(TEST_IDS.CLOSE_BUTTON));

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('closeButtonProps.onPress takes priority over onClose', () => {
      const onClose = jest.fn();
      const onPress = jest.fn();
      const { getByTestId } = render(
        <HeaderStackedSubpage
          onClose={onClose}
          closeButtonProps={{ onPress, testID: TEST_IDS.CLOSE_BUTTON }}
          titleSubpageProps={{ title: 'Test' }}
        />,
      );

      fireEvent.press(getByTestId(TEST_IDS.CLOSE_BUTTON));

      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not render close button when neither onClose nor closeButtonProps provided', () => {
      const { queryByLabelText } = render(
        <HeaderStackedSubpage titleSubpageProps={{ title: 'Test' }} />,
      );

      expect(queryByLabelText('Close')).toBeNull();
    });
  });

  describe('props forwarding', () => {
    it('forwards endButtonIconProps to HeaderBase', () => {
      const { getByTestId } = render(
        <HeaderStackedSubpage
          onBack={jest.fn()}
          endButtonIconProps={[
            {
              iconName: IconName.Close,
              onPress: jest.fn(),
              testID: TEST_IDS.HEADER_BASE_END_ACCESSORY,
            },
          ]}
          titleSubpageProps={{ title: 'Test' }}
        />,
      );

      expect(getByTestId(TEST_IDS.HEADER_BASE_END_ACCESSORY)).toBeOnTheScreen();
    });

    it('accepts custom testID', () => {
      const { getByTestId } = render(
        <HeaderStackedSubpage
          testID="custom-header"
          titleSubpageProps={{ title: 'Test' }}
        />,
      );

      expect(getByTestId('custom-header')).toBeOnTheScreen();
    });

    it('forwards startButtonIconProps directly when provided', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <HeaderStackedSubpage
          startButtonIconProps={{
            iconName: IconName.Menu,
            onPress,
            testID: 'custom-start-button',
          }}
          titleSubpageProps={{ title: 'Test' }}
        />,
      );

      expect(getByTestId('custom-start-button')).toBeOnTheScreen();
    });
  });
});

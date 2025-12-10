// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

// External dependencies.
import { IconName } from '@metamask/design-system-react-native';

// Internal dependencies.
import HeaderCenter from './HeaderCenter';
import { HeaderCenterTestIds } from './HeaderCenter.constants';
import { HeaderBaseTestIds } from '../HeaderBase/HeaderBase.constants';

describe('HeaderCenter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders with title', () => {
      const { getByText } = render(<HeaderCenter title="Test Title" />);

      expect(getByText('Test Title')).toBeTruthy();
    });

    it('renders title with correct testID', () => {
      const { getByTestId } = render(<HeaderCenter title="Test Title" />);

      expect(getByTestId(HeaderCenterTestIds.TITLE)).toBeTruthy();
    });

    it('renders container with correct testID', () => {
      const { getByTestId } = render(<HeaderCenter title="Test Title" />);

      expect(getByTestId(HeaderCenterTestIds.CONTAINER)).toBeTruthy();
    });

    it('renders custom children instead of title', () => {
      const { getByText, queryByTestId } = render(
        <HeaderCenter title="Ignored Title">
          <Text>Custom Content</Text>
        </HeaderCenter>,
      );

      expect(getByText('Custom Content')).toBeTruthy();
      expect(queryByTestId(HeaderCenterTestIds.TITLE)).toBeNull();
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

  describe('close button', () => {
    it('renders close button when onClose provided', () => {
      const { getByTestId } = render(
        <HeaderCenter title="Title" onClose={() => {}} />,
      );

      expect(getByTestId(HeaderCenterTestIds.CLOSE_BUTTON)).toBeTruthy();
    });

    it('renders close button when closeButtonProps provided', () => {
      const { getByTestId } = render(
        <HeaderCenter title="Title" closeButtonProps={{ onPress: () => {} }} />,
      );

      expect(getByTestId(HeaderCenterTestIds.CLOSE_BUTTON)).toBeTruthy();
    });

    it('calls onClose when close button pressed', () => {
      const onClose = jest.fn();
      const { getByTestId } = render(
        <HeaderCenter title="Title" onClose={onClose} />,
      );

      fireEvent.press(getByTestId(HeaderCenterTestIds.CLOSE_BUTTON));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls closeButtonProps.onPress when close button pressed', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <HeaderCenter title="Title" closeButtonProps={{ onPress }} />,
      );

      fireEvent.press(getByTestId(HeaderCenterTestIds.CLOSE_BUTTON));

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('uses closeButtonProps.onPress over onClose when both provided', () => {
      const onClose = jest.fn();
      const onPress = jest.fn();
      const { getByTestId } = render(
        <HeaderCenter
          title="Title"
          onClose={onClose}
          closeButtonProps={{ onPress }}
        />,
      );

      fireEvent.press(getByTestId(HeaderCenterTestIds.CLOSE_BUTTON));

      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not render close button when neither onClose nor closeButtonProps provided', () => {
      const { queryByTestId } = render(<HeaderCenter title="Title" />);

      expect(queryByTestId(HeaderCenterTestIds.CLOSE_BUTTON)).toBeNull();
    });
  });

  describe('props forwarding', () => {
    it('forwards startButtonIconProps to HeaderBase', () => {
      const { getByTestId } = render(
        <HeaderCenter
          title="Title"
          startButtonIconProps={{
            iconName: IconName.ArrowLeft,
            onPress: () => {},
          }}
        />,
      );

      expect(getByTestId(HeaderBaseTestIds.START_ACCESSORY)).toBeTruthy();
    });

    it('forwards endButtonIconProps and adds close button', () => {
      const { getByTestId } = render(
        <HeaderCenter
          title="Title"
          endButtonIconProps={[
            { iconName: IconName.Search, onPress: () => {} },
          ]}
          onClose={() => {}}
        />,
      );

      expect(getByTestId(HeaderBaseTestIds.END_ACCESSORY)).toBeTruthy();
      expect(getByTestId(HeaderCenterTestIds.CLOSE_BUTTON)).toBeTruthy();
    });

    it('accepts custom testID', () => {
      const { getByTestId } = render(
        <HeaderCenter title="Title" testID="custom-header" />,
      );

      expect(getByTestId('custom-header')).toBeTruthy();
    });
  });
});

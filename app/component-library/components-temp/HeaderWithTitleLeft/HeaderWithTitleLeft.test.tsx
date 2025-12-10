// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text, View } from 'react-native';

// Internal dependencies.
import HeaderWithTitleLeft from './HeaderWithTitleLeft';
import { HeaderWithTitleLeftTestIds } from './HeaderWithTitleLeft.constants';
import { TitleLeftTestIds } from '../TitleLeft/TitleLeft.constants';
import { HeaderBaseTestIds } from '../HeaderBase/HeaderBase.constants';

describe('HeaderWithTitleLeft', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders container with correct testID', () => {
      const { getByTestId } = render(
        <HeaderWithTitleLeft titleLeftProps={{ title: 'Test' }} />,
      );

      expect(getByTestId(HeaderWithTitleLeftTestIds.CONTAINER)).toBeTruthy();
    });

    it('renders HeaderBase section', () => {
      const { getByTestId } = render(
        <HeaderWithTitleLeft titleLeftProps={{ title: 'Test' }} />,
      );

      expect(getByTestId(HeaderWithTitleLeftTestIds.HEADER_BASE)).toBeTruthy();
    });

    it('renders title section when titleLeftProps provided', () => {
      const { getByTestId } = render(
        <HeaderWithTitleLeft titleLeftProps={{ title: '$4.42' }} />,
      );

      expect(getByTestId(HeaderWithTitleLeftTestIds.TITLE_SECTION)).toBeTruthy();
    });

    it('renders TitleLeft with props when titleLeftProps provided', () => {
      const { getByText, getByTestId } = render(
        <HeaderWithTitleLeft
          titleLeftProps={{
            topLabel: 'Send',
            title: '$4.42',
          }}
        />,
      );

      expect(getByText('Send')).toBeTruthy();
      expect(getByText('$4.42')).toBeTruthy();
      expect(getByTestId(TitleLeftTestIds.TITLE)).toBeTruthy();
    });

    it('renders custom titleLeft node when provided', () => {
      const { getByText } = render(
        <HeaderWithTitleLeft
          titleLeft={<Text>Custom Title Section</Text>}
        />,
      );

      expect(getByText('Custom Title Section')).toBeTruthy();
    });

    it('titleLeft takes priority over titleLeftProps', () => {
      const { getByText, queryByText } = render(
        <HeaderWithTitleLeft
          titleLeft={<Text>Custom Node</Text>}
          titleLeftProps={{ title: 'Props Title' }}
        />,
      );

      expect(getByText('Custom Node')).toBeTruthy();
      expect(queryByText('Props Title')).toBeNull();
    });

    it('does not render title section when neither titleLeft nor titleLeftProps provided', () => {
      const { queryByTestId } = render(
        <HeaderWithTitleLeft onBack={() => {}} />,
      );

      expect(queryByTestId(HeaderWithTitleLeftTestIds.TITLE_SECTION)).toBeNull();
    });
  });

  describe('back button', () => {
    it('renders back button when onBack provided', () => {
      const { getByTestId } = render(
        <HeaderWithTitleLeft
          onBack={() => {}}
          titleLeftProps={{ title: 'Test' }}
        />,
      );

      expect(getByTestId(HeaderWithTitleLeftTestIds.BACK_BUTTON)).toBeTruthy();
    });

    it('renders back button when backButtonProps provided', () => {
      const { getByTestId } = render(
        <HeaderWithTitleLeft
          backButtonProps={{ onPress: () => {} }}
          titleLeftProps={{ title: 'Test' }}
        />,
      );

      expect(getByTestId(HeaderWithTitleLeftTestIds.BACK_BUTTON)).toBeTruthy();
    });

    it('calls onBack when back button pressed', () => {
      const onBack = jest.fn();
      const { getByTestId } = render(
        <HeaderWithTitleLeft
          onBack={onBack}
          titleLeftProps={{ title: 'Test' }}
        />,
      );

      fireEvent.press(getByTestId(HeaderWithTitleLeftTestIds.BACK_BUTTON));

      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('calls backButtonProps.onPress when back button pressed', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <HeaderWithTitleLeft
          backButtonProps={{ onPress }}
          titleLeftProps={{ title: 'Test' }}
        />,
      );

      fireEvent.press(getByTestId(HeaderWithTitleLeftTestIds.BACK_BUTTON));

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('backButtonProps.onPress takes priority over onBack', () => {
      const onBack = jest.fn();
      const onPress = jest.fn();
      const { getByTestId } = render(
        <HeaderWithTitleLeft
          onBack={onBack}
          backButtonProps={{ onPress }}
          titleLeftProps={{ title: 'Test' }}
        />,
      );

      fireEvent.press(getByTestId(HeaderWithTitleLeftTestIds.BACK_BUTTON));

      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onBack).not.toHaveBeenCalled();
    });

    it('does not render back button when neither onBack nor backButtonProps provided', () => {
      const { queryByTestId } = render(
        <HeaderWithTitleLeft titleLeftProps={{ title: 'Test' }} />,
      );

      expect(queryByTestId(HeaderWithTitleLeftTestIds.BACK_BUTTON)).toBeNull();
    });
  });

  describe('props forwarding', () => {
    it('forwards endButtonIconProps to HeaderBase', () => {
      const { getByTestId } = render(
        <HeaderWithTitleLeft
          onBack={() => {}}
          endButtonIconProps={[
            { iconName: 'Close' as never, onPress: () => {} },
          ]}
          titleLeftProps={{ title: 'Test' }}
        />,
      );

      expect(getByTestId(HeaderBaseTestIds.END_ACCESSORY)).toBeTruthy();
    });

    it('accepts custom testID', () => {
      const { getByTestId } = render(
        <HeaderWithTitleLeft
          testID="custom-header"
          titleLeftProps={{ title: 'Test' }}
        />,
      );

      expect(getByTestId('custom-header')).toBeTruthy();
    });

    it('forwards startButtonIconProps directly when provided', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <HeaderWithTitleLeft
          startButtonIconProps={{
            iconName: 'Menu' as never,
            onPress,
            testID: 'custom-start-button',
          }}
          titleLeftProps={{ title: 'Test' }}
        />,
      );

      expect(getByTestId('custom-start-button')).toBeTruthy();
    });
  });
});


// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

// External dependencies.
import { IconName } from '@metamask/design-system-react-native';

// Internal dependencies.
import SectionHeader from './SectionHeader';

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: () => ({}) }),
}));

// ButtonIcon's built-in testID from the design system
const BUTTON_ICON_TEST_ID = 'button-icon';
const CONTAINER_TEST_ID = 'section-header-container';

describe('SectionHeader', () => {
  describe('rendering', () => {
    it('renders with a string title', () => {
      const { getByText } = render(<SectionHeader title="Tokens" />);

      expect(getByText('Tokens')).toBeOnTheScreen();
    });

    it('renders with a React node title', () => {
      const { getByTestId, getByText } = render(
        <SectionHeader
          title={<Text testID="custom-title">Custom Title</Text>}
        />,
      );

      expect(getByTestId('custom-title')).toBeOnTheScreen();
      expect(getByText('Custom Title')).toBeOnTheScreen();
    });

    it('renders with testID on the container', () => {
      const { getByTestId } = render(
        <SectionHeader title="Tokens" testID={CONTAINER_TEST_ID} />,
      );

      expect(getByTestId(CONTAINER_TEST_ID)).toBeOnTheScreen();
    });
  });

  describe('onPress', () => {
    it('does not render trailing icon when onPress is not provided', () => {
      const { queryByTestId } = render(<SectionHeader title="Tokens" />);

      expect(queryByTestId(BUTTON_ICON_TEST_ID)).toBeNull();
    });

    it('renders trailing icon when onPress is provided', () => {
      const { getByTestId } = render(
        <SectionHeader title="Tokens" onPress={jest.fn()} />,
      );

      expect(getByTestId(BUTTON_ICON_TEST_ID)).toBeOnTheScreen();
    });

    it('has button accessibilityRole when onPress is provided', () => {
      const { UNSAFE_getByProps } = render(
        <SectionHeader title="Tokens" onPress={jest.fn()} />,
      );

      expect(
        UNSAFE_getByProps({ accessibilityRole: 'button' }),
      ).toBeOnTheScreen();
    });

    it('sets the accessibilityLabel to the string title when pressable', () => {
      const { UNSAFE_getByProps } = render(
        <SectionHeader title="Tokens" onPress={jest.fn()} />,
      );

      expect(
        UNSAFE_getByProps({
          accessibilityRole: 'button',
          accessibilityLabel: 'Tokens',
        }),
      ).toBeOnTheScreen();
    });

    it('calls onPress when the header is pressed', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <SectionHeader title="Tokens" onPress={onPress} />,
      );

      fireEvent.press(getByText('Tokens'));

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('does not throw when pressed without an onPress prop', () => {
      const { getByText } = render(<SectionHeader title="Tokens" />);

      expect(() => fireEvent.press(getByText('Tokens'))).not.toThrow();
    });
  });

  describe('endAccessory', () => {
    it('renders endAccessory next to the title', () => {
      const { getByText } = render(
        <SectionHeader title="DeFi" endAccessory={<Text>Info</Text>} />,
      );

      expect(getByText('DeFi')).toBeOnTheScreen();
      expect(getByText('Info')).toBeOnTheScreen();
    });

    it('renders endAccessory without an onPress', () => {
      const { getByText } = render(
        <SectionHeader title="DeFi" endAccessory={<Text>Badge</Text>} />,
      );

      expect(getByText('Badge')).toBeOnTheScreen();
    });
  });

  describe('endIconName', () => {
    it('renders the trailing icon when onPress is provided', () => {
      const { getByTestId } = render(
        <SectionHeader
          title="NFTs"
          onPress={jest.fn()}
          endIconName={IconName.Arrow2Right}
        />,
      );

      expect(getByTestId(BUTTON_ICON_TEST_ID)).toBeOnTheScreen();
    });

    it('does not render the trailing icon when onPress is absent', () => {
      const { queryByTestId } = render(
        <SectionHeader title="NFTs" endIconName={IconName.Arrow2Right} />,
      );

      expect(queryByTestId(BUTTON_ICON_TEST_ID)).toBeNull();
    });
  });

  describe('full component', () => {
    it('renders title, endAccessory, and trailing icon together', () => {
      const onPress = jest.fn();
      const { getByText, getByTestId } = render(
        <SectionHeader
          title="Tokens"
          onPress={onPress}
          endAccessory={<Text>Badge</Text>}
          testID={CONTAINER_TEST_ID}
        />,
      );

      expect(getByText('Tokens')).toBeOnTheScreen();
      expect(getByText('Badge')).toBeOnTheScreen();
      expect(getByTestId(BUTTON_ICON_TEST_ID)).toBeOnTheScreen();
      expect(getByTestId(CONTAINER_TEST_ID)).toBeOnTheScreen();
    });
  });
});

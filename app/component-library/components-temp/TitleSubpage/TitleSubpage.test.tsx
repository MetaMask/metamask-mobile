// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

// Internal dependencies.
import TitleSubpage from './TitleSubpage';

const TEST_IDS = {
  CONTAINER: 'title-subpage-container',
  TITLE: 'title-subpage-title',
  BOTTOM_LABEL: 'title-subpage-bottom-label',
};

describe('TitleSubpage', () => {
  describe('rendering', () => {
    it('renders with title', () => {
      const { getByText } = render(<TitleSubpage title="Token Name" />);

      expect(getByText('Token Name')).toBeOnTheScreen();
    });

    it('renders container with testID when provided', () => {
      const { getByTestId } = render(
        <TitleSubpage title="Test" testID={TEST_IDS.CONTAINER} />,
      );

      expect(getByTestId(TEST_IDS.CONTAINER)).toBeOnTheScreen();
    });

    it('renders title with testID when provided via titleProps', () => {
      const { getByTestId } = render(
        <TitleSubpage
          title="Token Name"
          titleProps={{ testID: TEST_IDS.TITLE }}
        />,
      );

      expect(getByTestId(TEST_IDS.TITLE)).toBeOnTheScreen();
    });
  });

  describe('startAccessory', () => {
    it('renders startAccessory when provided', () => {
      const { getByText } = render(
        <TitleSubpage
          title="Token Name"
          startAccessory={<Text>Avatar</Text>}
        />,
      );

      expect(getByText('Avatar')).toBeOnTheScreen();
    });

    it('renders startAccessory alongside title', () => {
      const { getByText } = render(
        <TitleSubpage
          title="Token Name"
          startAccessory={<Text>Avatar</Text>}
        />,
      );

      expect(getByText('Avatar')).toBeOnTheScreen();
      expect(getByText('Token Name')).toBeOnTheScreen();
    });
  });

  describe('bottomLabel and bottomAccessory', () => {
    it('renders bottomLabel', () => {
      const { getByText } = render(
        <TitleSubpage title="Token Name" bottomLabel="$1,234.56" />,
      );

      expect(getByText('$1,234.56')).toBeOnTheScreen();
    });

    it('renders bottomLabel with testID when provided via bottomLabelProps', () => {
      const { getByTestId } = render(
        <TitleSubpage
          title="Token Name"
          bottomLabel="$1,234.56"
          bottomLabelProps={{ testID: TEST_IDS.BOTTOM_LABEL }}
        />,
      );

      expect(getByTestId(TEST_IDS.BOTTOM_LABEL)).toBeOnTheScreen();
    });

    it('renders bottomAccessory when no bottomLabel', () => {
      const { getByText } = render(
        <TitleSubpage
          title="Token Name"
          bottomAccessory={<Text>Custom Bottom</Text>}
        />,
      );

      expect(getByText('Custom Bottom')).toBeOnTheScreen();
    });

    it('bottomLabel takes priority over bottomAccessory', () => {
      const { getByText, queryByText } = render(
        <TitleSubpage
          title="Token Name"
          bottomLabel="Label Priority"
          bottomAccessory={<Text>Accessory</Text>}
        />,
      );

      expect(getByText('Label Priority')).toBeOnTheScreen();
      expect(queryByText('Accessory')).toBeNull();
    });
  });

  describe('titleAccessory', () => {
    it('renders titleAccessory next to title', () => {
      const { getByText } = render(
        <TitleSubpage title="Token Name" titleAccessory={<Text>Info</Text>} />,
      );

      expect(getByText('Token Name')).toBeOnTheScreen();
      expect(getByText('Info')).toBeOnTheScreen();
    });
  });

  describe('full component', () => {
    it('renders all elements together', () => {
      const { getByText } = render(
        <TitleSubpage
          startAccessory={<Text>Avatar</Text>}
          title="Token Name"
          titleAccessory={<Text>i</Text>}
          bottomLabel="$1,234.56"
        />,
      );

      expect(getByText('Avatar')).toBeOnTheScreen();
      expect(getByText('Token Name')).toBeOnTheScreen();
      expect(getByText('i')).toBeOnTheScreen();
      expect(getByText('$1,234.56')).toBeOnTheScreen();
    });
  });
});

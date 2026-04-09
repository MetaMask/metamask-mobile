// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

// Internal dependencies.
import TitleStandard from './TitleStandard';

const TEST_IDS = {
  CONTAINER: 'title-standard-container',
  TITLE: 'title-standard-title',
  TOP_LABEL: 'title-standard-top-label',
  BOTTOM_LABEL: 'title-standard-bottom-label',
};

describe('TitleStandard', () => {
  describe('rendering', () => {
    it('renders with title', () => {
      const { getByText } = render(<TitleStandard title="$4.42" />);

      expect(getByText('$4.42')).toBeOnTheScreen();
    });

    it('renders container with testID when provided', () => {
      const { getByTestId } = render(
        <TitleStandard title="Test" testID={TEST_IDS.CONTAINER} />,
      );

      expect(getByTestId(TEST_IDS.CONTAINER)).toBeOnTheScreen();
    });

    it('renders title with testID when provided via titleProps', () => {
      const { getByTestId } = render(
        <TitleStandard title="$4.42" titleProps={{ testID: TEST_IDS.TITLE }} />,
      );

      expect(getByTestId(TEST_IDS.TITLE)).toBeOnTheScreen();
    });
  });

  describe('topLabel and topAccessory', () => {
    it('renders topLabel', () => {
      const { getByText } = render(
        <TitleStandard title="$4.42" topLabel="Send" />,
      );

      expect(getByText('Send')).toBeOnTheScreen();
    });

    it('renders topLabel with testID when provided via topLabelProps', () => {
      const { getByTestId } = render(
        <TitleStandard
          title="$4.42"
          topLabel="Send"
          topLabelProps={{ testID: TEST_IDS.TOP_LABEL }}
        />,
      );

      expect(getByTestId(TEST_IDS.TOP_LABEL)).toBeOnTheScreen();
    });

    it('renders topAccessory when no topLabel', () => {
      const { getByText } = render(
        <TitleStandard title="$4.42" topAccessory={<Text>Custom Top</Text>} />,
      );

      expect(getByText('Custom Top')).toBeOnTheScreen();
    });

    it('topLabel takes priority over topAccessory', () => {
      const { getByText, queryByText } = render(
        <TitleStandard
          title="$4.42"
          topLabel="Label Priority"
          topAccessory={<Text>Accessory</Text>}
        />,
      );

      expect(getByText('Label Priority')).toBeOnTheScreen();
      expect(queryByText('Accessory')).toBeNull();
    });
  });

  describe('bottomLabel and bottomAccessory', () => {
    it('renders bottomLabel', () => {
      const { getByText } = render(
        <TitleStandard title="$4.42" bottomLabel="0.002 ETH" />,
      );

      expect(getByText('0.002 ETH')).toBeOnTheScreen();
    });

    it('renders bottomLabel with testID when provided via bottomLabelProps', () => {
      const { getByTestId } = render(
        <TitleStandard
          title="$4.42"
          bottomLabel="0.002 ETH"
          bottomLabelProps={{ testID: TEST_IDS.BOTTOM_LABEL }}
        />,
      );

      expect(getByTestId(TEST_IDS.BOTTOM_LABEL)).toBeOnTheScreen();
    });

    it('renders bottomAccessory when no bottomLabel', () => {
      const { getByText } = render(
        <TitleStandard
          title="$4.42"
          bottomAccessory={<Text>Custom Bottom</Text>}
        />,
      );

      expect(getByText('Custom Bottom')).toBeOnTheScreen();
    });

    it('bottomLabel takes priority over bottomAccessory', () => {
      const { getByText, queryByText } = render(
        <TitleStandard
          title="$4.42"
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
        <TitleStandard title="$4.42" titleAccessory={<Text>Info</Text>} />,
      );

      expect(getByText('$4.42')).toBeOnTheScreen();
      expect(getByText('Info')).toBeOnTheScreen();
    });
  });

  describe('full component', () => {
    it('renders all elements together', () => {
      const { getByText } = render(
        <TitleStandard
          topLabel="Send"
          title="$4.42"
          titleAccessory={<Text>i</Text>}
          bottomLabel="0.002 ETH"
        />,
      );

      expect(getByText('Send')).toBeOnTheScreen();
      expect(getByText('$4.42')).toBeOnTheScreen();
      expect(getByText('i')).toBeOnTheScreen();
      expect(getByText('0.002 ETH')).toBeOnTheScreen();
    });
  });
});

// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';
import { Text, View } from 'react-native';

// Internal dependencies.
import TitleLeft from './TitleLeft';

const TEST_IDS = {
  CONTAINER: 'title-left-container',
  TITLE: 'title-left-title',
  TOP_LABEL: 'title-left-top-label',
  BOTTOM_LABEL: 'title-left-bottom-label',
};

describe('TitleLeft', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders with title', () => {
      const { getByText } = render(<TitleLeft title="$4.42" />);

      expect(getByText('$4.42')).toBeTruthy();
    });

    it('renders container with testID when provided', () => {
      const { getByTestId } = render(
        <TitleLeft title="Test" testID={TEST_IDS.CONTAINER} />,
      );

      expect(getByTestId(TEST_IDS.CONTAINER)).toBeTruthy();
    });

    it('renders title with testID when provided via titleProps', () => {
      const { getByTestId } = render(
        <TitleLeft title="$4.42" titleProps={{ testID: TEST_IDS.TITLE }} />,
      );

      expect(getByTestId(TEST_IDS.TITLE)).toBeTruthy();
    });
  });

  describe('topLabel and topAccessory', () => {
    it('renders topLabel', () => {
      const { getByText } = render(<TitleLeft title="$4.42" topLabel="Send" />);

      expect(getByText('Send')).toBeTruthy();
    });

    it('renders topLabel with testID when provided via topLabelProps', () => {
      const { getByTestId } = render(
        <TitleLeft
          title="$4.42"
          topLabel="Send"
          topLabelProps={{ testID: TEST_IDS.TOP_LABEL }}
        />,
      );

      expect(getByTestId(TEST_IDS.TOP_LABEL)).toBeTruthy();
    });

    it('renders topAccessory when no topLabel', () => {
      const { getByText } = render(
        <TitleLeft title="$4.42" topAccessory={<Text>Custom Top</Text>} />,
      );

      expect(getByText('Custom Top')).toBeTruthy();
    });

    it('topLabel takes priority over topAccessory', () => {
      const { getByText, queryByText } = render(
        <TitleLeft
          title="$4.42"
          topLabel="Label Priority"
          topAccessory={<Text>Accessory</Text>}
        />,
      );

      expect(getByText('Label Priority')).toBeTruthy();
      expect(queryByText('Accessory')).toBeNull();
    });
  });

  describe('bottomLabel and bottomAccessory', () => {
    it('renders bottomLabel', () => {
      const { getByText } = render(
        <TitleLeft title="$4.42" bottomLabel="0.002 ETH" />,
      );

      expect(getByText('0.002 ETH')).toBeTruthy();
    });

    it('renders bottomLabel with testID when provided via bottomLabelProps', () => {
      const { getByTestId } = render(
        <TitleLeft
          title="$4.42"
          bottomLabel="0.002 ETH"
          bottomLabelProps={{ testID: TEST_IDS.BOTTOM_LABEL }}
        />,
      );

      expect(getByTestId(TEST_IDS.BOTTOM_LABEL)).toBeTruthy();
    });

    it('renders bottomAccessory when no bottomLabel', () => {
      const { getByText } = render(
        <TitleLeft
          title="$4.42"
          bottomAccessory={<Text>Custom Bottom</Text>}
        />,
      );

      expect(getByText('Custom Bottom')).toBeTruthy();
    });

    it('bottomLabel takes priority over bottomAccessory', () => {
      const { getByText, queryByText } = render(
        <TitleLeft
          title="$4.42"
          bottomLabel="Label Priority"
          bottomAccessory={<Text>Accessory</Text>}
        />,
      );

      expect(getByText('Label Priority')).toBeTruthy();
      expect(queryByText('Accessory')).toBeNull();
    });
  });

  describe('titleAccessory', () => {
    it('renders titleAccessory next to title', () => {
      const { getByText } = render(
        <TitleLeft title="$4.42" titleAccessory={<Text>Info</Text>} />,
      );

      expect(getByText('$4.42')).toBeTruthy();
      expect(getByText('Info')).toBeTruthy();
    });
  });

  describe('endAccessory', () => {
    it('renders endAccessory', () => {
      const { getByText } = render(
        <TitleLeft title="$4.42" endAccessory={<Text>NFT</Text>} />,
      );

      expect(getByText('NFT')).toBeTruthy();
    });
  });

  describe('full component', () => {
    it('renders all elements together', () => {
      const { getByText, getByTestId } = render(
        <TitleLeft
          topLabel="Send"
          title="$4.42"
          titleAccessory={<Text>i</Text>}
          bottomLabel="0.002 ETH"
          endAccessory={<View testID="nft-image" />}
        />,
      );

      expect(getByText('Send')).toBeTruthy();
      expect(getByText('$4.42')).toBeTruthy();
      expect(getByText('i')).toBeTruthy();
      expect(getByText('0.002 ETH')).toBeTruthy();
      expect(getByTestId('nft-image')).toBeTruthy();
    });
  });
});

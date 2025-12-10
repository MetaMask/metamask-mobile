// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';
import { Text, View } from 'react-native';

// Internal dependencies.
import TitleLeft from './TitleLeft';
import { TitleLeftTestIds } from './TitleLeft.constants';

describe('TitleLeft', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders with title', () => {
      const { getByText } = render(<TitleLeft title="$4.42" />);

      expect(getByText('$4.42')).toBeTruthy();
    });

    it('renders container with correct testID', () => {
      const { getByTestId } = render(<TitleLeft title="Test" />);

      expect(getByTestId(TitleLeftTestIds.CONTAINER)).toBeTruthy();
    });

    it('renders with custom testID', () => {
      const { getByTestId } = render(
        <TitleLeft title="Test" testID="custom-title-left" />,
      );

      expect(getByTestId('custom-title-left')).toBeTruthy();
    });

    it('renders title with correct testID', () => {
      const { getByTestId } = render(<TitleLeft title="$4.42" />);

      expect(getByTestId(TitleLeftTestIds.TITLE)).toBeTruthy();
    });
  });

  describe('topLabel and topAccessory', () => {
    it('renders topLabel', () => {
      const { getByText, getByTestId } = render(
        <TitleLeft title="$4.42" topLabel="Send" />,
      );

      expect(getByText('Send')).toBeTruthy();
      expect(getByTestId(TitleLeftTestIds.TOP_LABEL)).toBeTruthy();
      expect(getByTestId(TitleLeftTestIds.TOP_ROW)).toBeTruthy();
    });

    it('renders topAccessory when no topLabel', () => {
      const { getByText, getByTestId } = render(
        <TitleLeft
          title="$4.42"
          topAccessory={<Text>Custom Top</Text>}
        />,
      );

      expect(getByText('Custom Top')).toBeTruthy();
      expect(getByTestId(TitleLeftTestIds.TOP_ROW)).toBeTruthy();
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

    it('does not render top row when neither topLabel nor topAccessory provided', () => {
      const { queryByTestId } = render(<TitleLeft title="$4.42" />);

      expect(queryByTestId(TitleLeftTestIds.TOP_ROW)).toBeNull();
    });
  });

  describe('bottomLabel and bottomAccessory', () => {
    it('renders bottomLabel', () => {
      const { getByText, getByTestId } = render(
        <TitleLeft title="$4.42" bottomLabel="0.002 ETH" />,
      );

      expect(getByText('0.002 ETH')).toBeTruthy();
      expect(getByTestId(TitleLeftTestIds.BOTTOM_LABEL)).toBeTruthy();
      expect(getByTestId(TitleLeftTestIds.BOTTOM_ROW)).toBeTruthy();
    });

    it('renders bottomAccessory when no bottomLabel', () => {
      const { getByText, getByTestId } = render(
        <TitleLeft
          title="$4.42"
          bottomAccessory={<Text>Custom Bottom</Text>}
        />,
      );

      expect(getByText('Custom Bottom')).toBeTruthy();
      expect(getByTestId(TitleLeftTestIds.BOTTOM_ROW)).toBeTruthy();
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

    it('does not render bottom row when neither bottomLabel nor bottomAccessory provided', () => {
      const { queryByTestId } = render(<TitleLeft title="$4.42" />);

      expect(queryByTestId(TitleLeftTestIds.BOTTOM_ROW)).toBeNull();
    });
  });

  describe('titleAccessory', () => {
    it('renders titleAccessory next to title', () => {
      const { getByText, getByTestId } = render(
        <TitleLeft
          title="$4.42"
          titleAccessory={<Text>Info</Text>}
        />,
      );

      expect(getByText('$4.42')).toBeTruthy();
      expect(getByText('Info')).toBeTruthy();
      expect(getByTestId(TitleLeftTestIds.TITLE_ROW)).toBeTruthy();
    });
  });

  describe('endAccessory', () => {
    it('renders endAccessory', () => {
      const { getByText, getByTestId } = render(
        <TitleLeft
          title="$4.42"
          endAccessory={<Text>NFT</Text>}
        />,
      );

      expect(getByText('NFT')).toBeTruthy();
      expect(getByTestId(TitleLeftTestIds.END_ACCESSORY)).toBeTruthy();
    });

    it('does not render end accessory wrapper when not provided', () => {
      const { queryByTestId } = render(<TitleLeft title="$4.42" />);

      expect(queryByTestId(TitleLeftTestIds.END_ACCESSORY)).toBeNull();
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
      expect(getByTestId(TitleLeftTestIds.TOP_ROW)).toBeTruthy();
      expect(getByTestId(TitleLeftTestIds.TITLE_ROW)).toBeTruthy();
      expect(getByTestId(TitleLeftTestIds.BOTTOM_ROW)).toBeTruthy();
      expect(getByTestId(TitleLeftTestIds.END_ACCESSORY)).toBeTruthy();
    });
  });
});


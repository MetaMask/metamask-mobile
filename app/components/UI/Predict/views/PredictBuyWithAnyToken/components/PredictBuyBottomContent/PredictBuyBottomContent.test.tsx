import React from 'react';
import { Linking, View, Text } from 'react-native';
import { screen, fireEvent } from '@testing-library/react-native';
import PredictBuyBottomContent from './PredictBuyBottomContent';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';

jest.mock('../../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    if (key === 'predict.consent_sheet.disclaimer') {
      return 'Disclaimer text';
    }
    if (key === 'predict.consent_sheet.learn_more') {
      return 'Learn more';
    }
    return key;
  }),
}));

jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Linking: {
    openURL: jest.fn(),
  },
}));

describe('PredictBuyBottomContent', () => {
  const mockChildren = (
    <View testID="children-content">
      <Text>Children content</Text>
    </View>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders children content', () => {
      renderWithProvider(
        <PredictBuyBottomContent>{mockChildren}</PredictBuyBottomContent>,
      );

      expect(screen.getByTestId('children-content')).toBeOnTheScreen();
    });

    it('renders disclaimer text', () => {
      renderWithProvider(
        <PredictBuyBottomContent>{mockChildren}</PredictBuyBottomContent>,
      );

      expect(screen.getByText(/Disclaimer text/)).toBeOnTheScreen();
    });

    it('renders learn more link', () => {
      renderWithProvider(
        <PredictBuyBottomContent>{mockChildren}</PredictBuyBottomContent>,
      );

      expect(screen.getByText(/Learn more/)).toBeOnTheScreen();
    });

    it('opens Polymarket TOS URL when learn more is pressed', () => {
      renderWithProvider(
        <PredictBuyBottomContent>{mockChildren}</PredictBuyBottomContent>,
      );

      const learnMoreLink = screen.getByText(/Learn more/);
      fireEvent.press(learnMoreLink);

      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://polymarket.com/tos',
      );
    });
  });

  describe('edge cases', () => {
    it('handles multiple children elements', () => {
      const multipleChildren = (
        <>
          <View testID="child-1">
            <Text>Child 1</Text>
          </View>
          <View testID="child-2">
            <Text>Child 2</Text>
          </View>
        </>
      );

      renderWithProvider(
        <PredictBuyBottomContent>{multipleChildren}</PredictBuyBottomContent>,
      );

      expect(screen.getByTestId('child-1')).toBeOnTheScreen();
      expect(screen.getByTestId('child-2')).toBeOnTheScreen();
    });
  });

  describe('Linking behavior', () => {
    it('calls Linking.openURL with correct URL', () => {
      renderWithProvider(
        <PredictBuyBottomContent>{mockChildren}</PredictBuyBottomContent>,
      );

      const learnMoreLink = screen.getByText(/Learn more/);
      fireEvent.press(learnMoreLink);

      expect(Linking.openURL).toHaveBeenCalledTimes(1);
      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://polymarket.com/tos',
      );
    });

    it('opens URL only when learn more is pressed', () => {
      renderWithProvider(
        <PredictBuyBottomContent>{mockChildren}</PredictBuyBottomContent>,
      );

      expect(Linking.openURL).not.toHaveBeenCalled();
    });
  });
});

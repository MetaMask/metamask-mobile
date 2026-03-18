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

  describe('when isInputFocused is true', () => {
    it('returns null and does not render anything', () => {
      renderWithProvider(
        <PredictBuyBottomContent isInputFocused errorMessage={undefined}>
          {mockChildren}
        </PredictBuyBottomContent>,
      );

      expect(screen.queryByText(/Disclaimer text/)).not.toBeOnTheScreen();
      expect(screen.queryByTestId('children-content')).not.toBeOnTheScreen();
    });

    it('returns null even when errorMessage is provided', () => {
      renderWithProvider(
        <PredictBuyBottomContent isInputFocused errorMessage="Error message">
          {mockChildren}
        </PredictBuyBottomContent>,
      );

      expect(screen.queryByText(/Error message/)).not.toBeOnTheScreen();
      expect(screen.queryByText(/Disclaimer text/)).not.toBeOnTheScreen();
    });
  });

  describe('when isInputFocused is false', () => {
    it('renders children content', () => {
      renderWithProvider(
        <PredictBuyBottomContent
          isInputFocused={false}
          errorMessage={undefined}
        >
          {mockChildren}
        </PredictBuyBottomContent>,
      );

      expect(screen.getByTestId('children-content')).toBeOnTheScreen();
    });

    it('renders disclaimer text', () => {
      renderWithProvider(
        <PredictBuyBottomContent
          isInputFocused={false}
          errorMessage={undefined}
        >
          {mockChildren}
        </PredictBuyBottomContent>,
      );

      expect(screen.getByText(/Disclaimer text/)).toBeOnTheScreen();
    });

    it('renders learn more link', () => {
      renderWithProvider(
        <PredictBuyBottomContent
          isInputFocused={false}
          errorMessage={undefined}
        >
          {mockChildren}
        </PredictBuyBottomContent>,
      );

      expect(screen.getByText(/Learn more/)).toBeOnTheScreen();
    });

    it('opens Polymarket TOS URL when learn more is pressed', () => {
      renderWithProvider(
        <PredictBuyBottomContent
          isInputFocused={false}
          errorMessage={undefined}
        >
          {mockChildren}
        </PredictBuyBottomContent>,
      );

      const learnMoreLink = screen.getByText(/Learn more/);
      fireEvent.press(learnMoreLink);

      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://polymarket.com/tos',
      );
    });
  });

  describe('error message display', () => {
    it('displays error message when provided', () => {
      renderWithProvider(
        <PredictBuyBottomContent
          isInputFocused={false}
          errorMessage="Insufficient balance"
        >
          {mockChildren}
        </PredictBuyBottomContent>,
      );

      expect(screen.getByText(/Insufficient balance/)).toBeOnTheScreen();
    });

    it('does not display error message when not provided', () => {
      renderWithProvider(
        <PredictBuyBottomContent
          isInputFocused={false}
          errorMessage={undefined}
        >
          {mockChildren}
        </PredictBuyBottomContent>,
      );

      expect(screen.queryByText(/Insufficient balance/)).not.toBeOnTheScreen();
    });

    it('displays error message along with children and disclaimer', () => {
      renderWithProvider(
        <PredictBuyBottomContent
          isInputFocused={false}
          errorMessage="Network error"
        >
          {mockChildren}
        </PredictBuyBottomContent>,
      );

      expect(screen.getByText(/Network error/)).toBeOnTheScreen();
      expect(screen.getByTestId('children-content')).toBeOnTheScreen();
      expect(screen.getByText(/Disclaimer text/)).toBeOnTheScreen();
    });
  });

  describe('edge cases', () => {
    it('handles empty error message string', () => {
      renderWithProvider(
        <PredictBuyBottomContent isInputFocused={false} errorMessage="">
          {mockChildren}
        </PredictBuyBottomContent>,
      );

      expect(screen.getByTestId('children-content')).toBeOnTheScreen();
      expect(screen.getByText(/Disclaimer text/)).toBeOnTheScreen();
    });

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
        <PredictBuyBottomContent
          isInputFocused={false}
          errorMessage={undefined}
        >
          {multipleChildren}
        </PredictBuyBottomContent>,
      );

      expect(screen.getByTestId('child-1')).toBeOnTheScreen();
      expect(screen.getByTestId('child-2')).toBeOnTheScreen();
    });

    it('handles long error message text', () => {
      const longError =
        'This is a very long error message that explains in detail what went wrong with the transaction';

      renderWithProvider(
        <PredictBuyBottomContent
          isInputFocused={false}
          errorMessage={longError}
        >
          {mockChildren}
        </PredictBuyBottomContent>,
      );

      expect(screen.getByText(new RegExp(longError))).toBeOnTheScreen();
    });
  });

  describe('Linking behavior', () => {
    it('calls Linking.openURL with correct URL', () => {
      renderWithProvider(
        <PredictBuyBottomContent
          isInputFocused={false}
          errorMessage={undefined}
        >
          {mockChildren}
        </PredictBuyBottomContent>,
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
        <PredictBuyBottomContent
          isInputFocused={false}
          errorMessage={undefined}
        >
          {mockChildren}
        </PredictBuyBottomContent>,
      );

      expect(Linking.openURL).not.toHaveBeenCalled();
    });
  });
});

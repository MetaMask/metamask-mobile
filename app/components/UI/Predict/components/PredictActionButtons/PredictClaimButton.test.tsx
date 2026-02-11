import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import PredictClaimButton from './PredictClaimButton';
import renderWithProvider from '../../../../../util/test/renderWithProvider';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, string>) => {
    if (key === 'predict.claim_amount_text' && params?.amount) {
      return `Claim $${params.amount}`;
    }
    if (key === 'predict.claim_winnings_text') {
      return 'Claim winnings';
    }
    return key;
  }),
}));

const createDefaultProps = (overrides = {}) => ({
  amount: 25.5,
  onPress: jest.fn(),
  testID: 'claim-button',
  ...overrides,
});

describe('PredictClaimButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('with amount (ButtonHero variant)', () => {
    it('renders with formatted amount', () => {
      const props = createDefaultProps({ amount: 25.5 });

      renderWithProvider(<PredictClaimButton {...props} />);

      expect(screen.getByText('Claim $25.50')).toBeOnTheScreen();
    });

    it('renders with whole number amount', () => {
      const props = createDefaultProps({ amount: 100 });

      renderWithProvider(<PredictClaimButton {...props} />);

      expect(screen.getByText('Claim $100.00')).toBeOnTheScreen();
    });

    it('renders with zero amount', () => {
      const props = createDefaultProps({ amount: 0 });

      renderWithProvider(<PredictClaimButton {...props} />);

      expect(screen.getByText('Claim $0.00')).toBeOnTheScreen();
    });

    it('renders with small decimal amount', () => {
      const props = createDefaultProps({ amount: 0.01 });

      renderWithProvider(<PredictClaimButton {...props} />);

      expect(screen.getByText('Claim $0.01')).toBeOnTheScreen();
    });

    it('renders with large amount', () => {
      const props = createDefaultProps({ amount: 9999.99 });

      renderWithProvider(<PredictClaimButton {...props} />);

      expect(screen.getByText('Claim $9999.99')).toBeOnTheScreen();
    });

    it('rounds to two decimal places', () => {
      const props = createDefaultProps({ amount: 10.999 });

      renderWithProvider(<PredictClaimButton {...props} />);

      expect(screen.getByText('Claim $11.00')).toBeOnTheScreen();
    });
  });

  describe('without amount (Button Secondary variant)', () => {
    it('renders "Claim winnings" text', () => {
      const props = createDefaultProps({ amount: undefined });

      renderWithProvider(<PredictClaimButton {...props} />);

      expect(screen.getByText('Claim winnings')).toBeOnTheScreen();
    });

    it('renders with testID', () => {
      const props = createDefaultProps({
        amount: undefined,
        testID: 'custom-claim-button',
      });

      renderWithProvider(<PredictClaimButton {...props} />);

      expect(screen.getByTestId('custom-claim-button')).toBeOnTheScreen();
    });

    it('calls onPress when pressed', () => {
      const mockOnPress = jest.fn();
      const props = createDefaultProps({
        amount: undefined,
        onPress: mockOnPress,
      });

      renderWithProvider(<PredictClaimButton {...props} />);
      fireEvent.press(screen.getByText('Claim winnings'));

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('does not call onPress when disabled', () => {
      const mockOnPress = jest.fn();
      const props = createDefaultProps({
        amount: undefined,
        onPress: mockOnPress,
        disabled: true,
      });

      renderWithProvider(<PredictClaimButton {...props} />);
      fireEvent.press(screen.getByText('Claim winnings'));

      expect(mockOnPress).not.toHaveBeenCalled();
    });
  });

  describe('common behavior', () => {
    it('renders with testID', () => {
      const props = createDefaultProps({ testID: 'custom-claim-button' });

      renderWithProvider(<PredictClaimButton {...props} />);

      expect(screen.getByTestId('custom-claim-button')).toBeOnTheScreen();
    });

    it('renders with default testID when not provided', () => {
      const props = createDefaultProps();
      delete (props as Partial<typeof props>).testID;

      renderWithProvider(<PredictClaimButton {...props} />);

      expect(screen.getByTestId('predict-claim-button')).toBeOnTheScreen();
    });

    it('calls onPress when pressed', () => {
      const mockOnPress = jest.fn();
      const props = createDefaultProps({ onPress: mockOnPress });

      renderWithProvider(<PredictClaimButton {...props} />);
      fireEvent.press(screen.getByTestId('claim-button'));

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('does not call onPress when disabled', () => {
      const mockOnPress = jest.fn();
      const props = createDefaultProps({
        onPress: mockOnPress,
        disabled: true,
      });

      renderWithProvider(<PredictClaimButton {...props} />);
      fireEvent.press(screen.getByTestId('claim-button'));

      expect(mockOnPress).not.toHaveBeenCalled();
    });
  });
});

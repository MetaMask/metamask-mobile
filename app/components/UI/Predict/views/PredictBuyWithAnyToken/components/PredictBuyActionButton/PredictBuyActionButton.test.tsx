import React from 'react';
import { ActivityIndicator } from 'react-native';
import { screen, fireEvent } from '@testing-library/react-native';
import PredictBuyActionButton from './PredictBuyActionButton';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';

jest.mock('../../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const map: Record<string, string> = {
      'predict.order.placing_prediction': 'Placing prediction',
      'predict.order.confirm': 'Confirm',
      'predict.order.retry': 'Retry',
      'predict.payment.change_payment_method': 'Change Payment Method',
      'predict.payment.add_funds': 'Add Funds',
    };
    return map[key] ?? key;
  }),
}));

jest.mock('../../../../utils/format', () => ({
  formatCents: jest.fn((value: number) => `${value}¢`),
}));

jest.mock(
  '../../../../../../../component-library/components-temp/Buttons/ButtonHero',
  () => {
    const { View: RNView, Text: RNText } = jest.requireActual('react-native');
    return function MockButtonHero(props: Record<string, unknown>) {
      return (
        <RNView
          testID={props.testID as string}
          style={props.style}
          accessible
          accessibilityState={{ disabled: props.disabled as boolean }}
        >
          <RNText onPress={props.onPress as () => void}>
            {props.children as React.ReactNode}
          </RNText>
        </RNView>
      );
    };
  },
);

describe('PredictBuyActionButton', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when isLoading is true', () => {
    it('displays placing prediction text', () => {
      renderWithProvider(
        <PredictBuyActionButton
          isLoading
          onPress={mockOnPress}
          disabled={false}
          showReducedOpacity={false}
          outcomeTokenTitle="Yes"
          sharePrice={0.65}
        />,
      );

      expect(screen.getByText(/Placing prediction/)).toBeOnTheScreen();
    });

    it('displays ActivityIndicator', () => {
      const { UNSAFE_getByType } = renderWithProvider(
        <PredictBuyActionButton
          isLoading
          onPress={mockOnPress}
          disabled={false}
          showReducedOpacity={false}
          outcomeTokenTitle="Yes"
          sharePrice={0.65}
        />,
      );

      UNSAFE_getByType(ActivityIndicator);
    });

    it('renders button with disabled state', () => {
      renderWithProvider(
        <PredictBuyActionButton
          isLoading
          onPress={mockOnPress}
          disabled={false}
          showReducedOpacity={false}
          outcomeTokenTitle="Yes"
          sharePrice={0.65}
        />,
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('applies reduced opacity style', () => {
      renderWithProvider(
        <PredictBuyActionButton
          isLoading
          onPress={mockOnPress}
          disabled={false}
          showReducedOpacity={false}
          outcomeTokenTitle="Yes"
          sharePrice={0.65}
        />,
      );

      const button = screen.getByRole('button');
      expect(button.props.style).toEqual(
        expect.objectContaining({ opacity: 0.5 }),
      );
    });
  });

  describe('when isLoading is false', () => {
    it('renders ButtonHero component', () => {
      renderWithProvider(
        <PredictBuyActionButton
          isLoading={false}
          onPress={mockOnPress}
          disabled={false}
          showReducedOpacity={false}
          outcomeTokenTitle="Yes"
          sharePrice={0.65}
          testID="action-button"
        />,
      );

      expect(screen.getByTestId('action-button')).toBeOnTheScreen();
    });

    it('displays outcome token title and formatted share price', () => {
      renderWithProvider(
        <PredictBuyActionButton
          isLoading={false}
          onPress={mockOnPress}
          disabled={false}
          showReducedOpacity={false}
          outcomeTokenTitle="Yes"
          sharePrice={0.65}
        />,
      );

      expect(screen.getByText(/Yes/)).toBeOnTheScreen();
      expect(screen.getByText(/0\.65¢/)).toBeOnTheScreen();
    });

    it('displays separator between outcome and price', () => {
      renderWithProvider(
        <PredictBuyActionButton
          isLoading={false}
          onPress={mockOnPress}
          disabled={false}
          showReducedOpacity={false}
          outcomeTokenTitle="No"
          sharePrice={0.35}
        />,
      );

      expect(screen.getByText(/No · /)).toBeOnTheScreen();
    });

    it('respects disabled prop', () => {
      renderWithProvider(
        <PredictBuyActionButton
          isLoading={false}
          onPress={mockOnPress}
          disabled
          showReducedOpacity={false}
          outcomeTokenTitle="Yes"
          sharePrice={0.65}
          testID="action-button"
        />,
      );

      expect(screen.getByTestId('action-button')).toBeDisabled();
    });

    it('applies reduced opacity when showReducedOpacity is true', () => {
      renderWithProvider(
        <PredictBuyActionButton
          isLoading={false}
          onPress={mockOnPress}
          disabled={false}
          showReducedOpacity
          outcomeTokenTitle="Yes"
          sharePrice={0.65}
          testID="action-button"
        />,
      );

      const button = screen.getByTestId('action-button');
      expect(button.props.style).toEqual(
        expect.objectContaining({ opacity: 0.5 }),
      );
    });

    it('does not apply reduced opacity when showReducedOpacity is false', () => {
      renderWithProvider(
        <PredictBuyActionButton
          isLoading={false}
          onPress={mockOnPress}
          disabled={false}
          showReducedOpacity={false}
          outcomeTokenTitle="Yes"
          sharePrice={0.65}
          testID="action-button"
        />,
      );

      const button = screen.getByTestId('action-button');
      expect(button.props.style).not.toEqual(
        expect.objectContaining({ opacity: 0.5 }),
      );
    });

    it('calls onPress when button is pressed', () => {
      renderWithProvider(
        <PredictBuyActionButton
          isLoading={false}
          onPress={mockOnPress}
          disabled={false}
          showReducedOpacity={false}
          outcomeTokenTitle="Yes"
          sharePrice={0.65}
          testID="action-button"
        />,
      );

      const button = screen.getByTestId('action-button');
      fireEvent.press(button);

      expect(mockOnPress).toHaveBeenCalled();
    });
  });

  describe('when isSheetMode is true', () => {
    it('displays "Confirm" label instead of outcome and price', () => {
      renderWithProvider(
        <PredictBuyActionButton
          isLoading={false}
          onPress={mockOnPress}
          disabled={false}
          showReducedOpacity={false}
          outcomeTokenTitle="Yes"
          sharePrice={0.65}
          isSheetMode
        />,
      );

      expect(screen.getByText('Confirm')).toBeOnTheScreen();
      expect(screen.queryByText(/0\.65¢/)).toBeNull();
    });

    it('displays "Confirm" regardless of outcome', () => {
      renderWithProvider(
        <PredictBuyActionButton
          isLoading={false}
          onPress={mockOnPress}
          disabled={false}
          showReducedOpacity={false}
          outcomeTokenTitle="No"
          sharePrice={0.35}
          isSheetMode
        />,
      );

      expect(screen.getByText('Confirm')).toBeOnTheScreen();
      expect(screen.queryByText(/· /)).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('handles different outcome token titles', () => {
      renderWithProvider(
        <PredictBuyActionButton
          isLoading={false}
          onPress={mockOnPress}
          disabled={false}
          showReducedOpacity={false}
          outcomeTokenTitle="Maybe"
          sharePrice={0.5}
        />,
      );

      expect(screen.getByText(/Maybe/)).toBeOnTheScreen();
    });

    it('handles zero share price', () => {
      renderWithProvider(
        <PredictBuyActionButton
          isLoading={false}
          onPress={mockOnPress}
          disabled={false}
          showReducedOpacity={false}
          outcomeTokenTitle="Yes"
          sharePrice={0}
        />,
      );

      expect(screen.getByText(/0¢/)).toBeOnTheScreen();
    });

    it('handles high share price', () => {
      renderWithProvider(
        <PredictBuyActionButton
          isLoading={false}
          onPress={mockOnPress}
          disabled={false}
          showReducedOpacity={false}
          outcomeTokenTitle="Yes"
          sharePrice={99.99}
        />,
      );

      expect(screen.getByText(/99\.99¢/)).toBeOnTheScreen();
    });

    it('renders without testID when not provided', () => {
      renderWithProvider(
        <PredictBuyActionButton
          isLoading={false}
          onPress={mockOnPress}
          disabled={false}
          showReducedOpacity={false}
          outcomeTokenTitle="Yes"
          sharePrice={0.65}
        />,
      );

      expect(screen.getByText(/Yes/)).toBeOnTheScreen();
    });
  });

  describe('when isChangePaymentMode is true', () => {
    it('renders Change Payment Method label', () => {
      renderWithProvider(
        <PredictBuyActionButton
          isLoading={false}
          onPress={mockOnPress}
          disabled={false}
          showReducedOpacity={false}
          outcomeTokenTitle="Yes"
          sharePrice={0.65}
          isChangePaymentMode
          testID="action-button"
        />,
      );

      expect(screen.getByText('Change Payment Method')).toBeOnTheScreen();
    });

    it('does not render outcome or share price', () => {
      renderWithProvider(
        <PredictBuyActionButton
          isLoading={false}
          onPress={mockOnPress}
          disabled={false}
          showReducedOpacity={false}
          outcomeTokenTitle="Yes"
          sharePrice={0.65}
          isChangePaymentMode
        />,
      );

      expect(screen.queryByText(/0\.65¢/)).toBeNull();
      expect(screen.queryByText(/Yes · /)).toBeNull();
    });

    it('calls onPress when pressed', () => {
      renderWithProvider(
        <PredictBuyActionButton
          isLoading={false}
          onPress={mockOnPress}
          disabled={false}
          showReducedOpacity={false}
          outcomeTokenTitle="Yes"
          sharePrice={0.65}
          isChangePaymentMode
          testID="action-button"
        />,
      );

      fireEvent.press(screen.getByTestId('action-button'));

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('when isAddFundsMode is true', () => {
    it('renders Add Funds label', () => {
      renderWithProvider(
        <PredictBuyActionButton
          isLoading={false}
          onPress={mockOnPress}
          disabled={false}
          showReducedOpacity={false}
          outcomeTokenTitle="Yes"
          sharePrice={0.65}
          isAddFundsMode
          testID="action-button"
        />,
      );

      expect(screen.getByText('Add Funds')).toBeOnTheScreen();
    });

    it('does not render outcome or share price', () => {
      renderWithProvider(
        <PredictBuyActionButton
          isLoading={false}
          onPress={mockOnPress}
          disabled={false}
          showReducedOpacity={false}
          outcomeTokenTitle="Yes"
          sharePrice={0.65}
          isAddFundsMode
        />,
      );

      expect(screen.queryByText(/0\.65¢/)).toBeNull();
      expect(screen.queryByText(/Yes · /)).toBeNull();
    });

    it('calls onPress when pressed', () => {
      renderWithProvider(
        <PredictBuyActionButton
          isLoading={false}
          onPress={mockOnPress}
          disabled={false}
          showReducedOpacity={false}
          outcomeTokenTitle="Yes"
          sharePrice={0.65}
          isAddFundsMode
          testID="action-button"
        />,
      );

      fireEvent.press(screen.getByTestId('action-button'));

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('when isRetry is true', () => {
    it('renders Retry label instead of outcome title and price', () => {
      renderWithProvider(
        <PredictBuyActionButton
          isLoading={false}
          onPress={mockOnPress}
          disabled={false}
          showReducedOpacity={false}
          outcomeTokenTitle="Yes"
          sharePrice={0.65}
          isRetry
        />,
      );

      expect(screen.getByText('Retry')).toBeOnTheScreen();
      expect(screen.queryByText(/Yes/)).not.toBeOnTheScreen();
    });

    it('renders Retry label even when isSheetMode is also true', () => {
      renderWithProvider(
        <PredictBuyActionButton
          isLoading={false}
          onPress={mockOnPress}
          disabled={false}
          showReducedOpacity={false}
          outcomeTokenTitle="Yes"
          sharePrice={0.65}
          isSheetMode
          isRetry
        />,
      );

      expect(screen.getByText('Retry')).toBeOnTheScreen();
      expect(screen.queryByText('Confirm')).not.toBeOnTheScreen();
    });
  });
});

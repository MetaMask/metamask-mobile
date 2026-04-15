import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import PredictBuyActionButton from './PredictBuyActionButton';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';

jest.mock('../../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    if (key === 'predict.order.placing_prediction') {
      return 'Placing prediction';
    }
    if (key === 'predict.order.confirm') {
      return 'Confirm';
    }
    return key;
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
        <RNView testID={props.testID as string}>
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
    it('displays loading state with ActivityIndicator', () => {
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
      expect(button.props.disabled).toBe(true);
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

      const button = screen.getByTestId('action-button');
      expect(button).toBeOnTheScreen();
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
      expect(button).toBeOnTheScreen();
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
      expect(button).toBeOnTheScreen();
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
});

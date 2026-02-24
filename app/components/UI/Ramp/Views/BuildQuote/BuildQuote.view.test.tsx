import '../../../../../../tests/component-view/mocks';
import { renderBuildQuoteView } from '../../../../../../tests/component-view/renderers/ramps';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { BuildQuoteSelectors } from '../../Aggregator/Views/BuildQuote/BuildQuote.testIds';

describe('BuildQuote (Ramps V2)', () => {
  it('renders initial amount, payment method, and continue button from RampsController state', () => {
    const { getByTestId, getByText } = renderBuildQuoteView();

    // Amount input is present and shows the default amount
    expect(getByTestId(BuildQuoteSelectors.AMOUNT_INPUT)).toBeOnTheScreen();
    expect(getByText(/100/)).toBeOnTheScreen();

    // Selected payment method is shown in the pill
    expect(getByText('Debit or Credit Card')).toBeOnTheScreen();

    // Provider attribution is shown
    expect(getByText(/Transak/i)).toBeOnTheScreen();

    // Continue button is present (disabled pending a quote, but visible)
    expect(getByTestId(BuildQuoteSelectors.CONTINUE_BUTTON)).toBeOnTheScreen();
  });

  it('shows quick amount buttons after clearing the input to zero', async () => {
    const { getByTestId } = renderBuildQuoteView();

    // Delete all three digits of the default "100"
    const deleteButton = getByTestId(BuildQuoteSelectors.KEYPAD_DELETE_BUTTON);
    fireEvent.press(deleteButton);
    fireEvent.press(deleteButton);
    fireEvent.press(deleteButton);

    await waitFor(() => {
      expect(getByTestId('quick-amounts')).toBeOnTheScreen();
      expect(getByTestId('quick-amounts-button-50')).toBeOnTheScreen();
      expect(getByTestId('quick-amounts-button-100')).toBeOnTheScreen();
      expect(getByTestId('quick-amounts-button-200')).toBeOnTheScreen();
      expect(getByTestId('quick-amounts-button-400')).toBeOnTheScreen();
    });
  });

  it('updates the displayed amount when a quick amount is pressed', async () => {
    const { getByTestId } = renderBuildQuoteView();

    // Clear the default amount to reveal the quick amount buttons
    const deleteButton = getByTestId(BuildQuoteSelectors.KEYPAD_DELETE_BUTTON);
    fireEvent.press(deleteButton);
    fireEvent.press(deleteButton);
    fireEvent.press(deleteButton);

    await waitFor(() => {
      expect(getByTestId('quick-amounts-button-50')).toBeOnTheScreen();
    });

    fireEvent.press(getByTestId('quick-amounts-button-50'));

    await waitFor(() => {
      const amountInput = getByTestId(BuildQuoteSelectors.AMOUNT_INPUT);
      expect(amountInput).toHaveTextContent(/50/);
    });
  });
});

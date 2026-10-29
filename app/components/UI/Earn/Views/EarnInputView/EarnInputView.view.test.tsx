import '../../../../../../tests/component-view/mocks';
import { fireEvent } from '@testing-library/react-native';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { renderEarnInputView } from '../../../../../../tests/component-view/renderers/earn';
import { INPUT_DISPLAY_TEST_IDS } from '../../components/InputDisplay/InputDisplay.testIds';

describeForPlatforms('EarnInputView', () => {
  it('shows the 25% amount and lending cursor when stablecoin lending is enabled', async () => {
    const { findByRole, getByTestId, getByText } = renderEarnInputView({
      stablecoinLendingEnabled: true,
    });

    fireEvent.press(getByText('25%'));

    expect(await findByRole('button', { name: '0.375 ETH' })).toBeOnTheScreen();
    expect(getByTestId(INPUT_DISPLAY_TEST_IDS.AMOUNT_CURSOR)).toBeOnTheScreen();
  });

  it('hides the lending cursor when stablecoin lending is disabled', async () => {
    const { findByRole, getByText, queryByTestId } = renderEarnInputView({
      stablecoinLendingEnabled: false,
    });

    fireEvent.press(getByText('25%'));

    expect(await findByRole('button', { name: '0.375 ETH' })).toBeOnTheScreen();
    expect(
      queryByTestId(INPUT_DISPLAY_TEST_IDS.AMOUNT_CURSOR),
    ).not.toBeOnTheScreen();
  });
});

import { fireEvent, screen } from '@testing-library/react-native';

export class BridgeViewRobot {
  get sourceInput() {
    return screen.getByTestId('source-token-area-input');
  }

  get continueButton() {
    return screen.getByTestId('bridge-confirm-button');
  }

  async typeAmount(amount: string) {
    for (const ch of amount.split('')) {
      const key = ch;
      fireEvent.press(screen.getByText(key));
    }
  }

  tapSourceToken() {
    const tokenButton = screen.getByText('ETH');
    fireEvent.press(tokenButton);
  }

  tapDestTokenArea() {
    const destArea = screen.getByText('Swap to');
    fireEvent.press(destArea);
  }

  tapSwitchTokens() {
    fireEvent.press(screen.getByTestId('arrow-button'));
  }

  tapContinue() {
    fireEvent.press(this.continueButton);
  }

  expectAmountDisplayed(expected: string) {
    expect(this.sourceInput.props.value).toBe(expected);
  }

  expectFiatText(valueText: string) {
    expect(screen.getByText(valueText)).toBeTruthy();
  }

  expectSelectAmount() {
    expect(screen.getByText('Select amount')).toBeTruthy();
  }

  expectFetchingQuote() {
    expect(screen.getByText('Fetching quote')).toBeTruthy();
  }

  expectInsufficientFunds() {
    expect(screen.getByText('Insufficient funds')).toBeTruthy();
  }

  expectContinueEnabled() {
    expect(this.continueButton.props.disabled).toBeFalsy();
  }

  expectContinueDisabled() {
    expect(this.continueButton.props.disabled).toBeTruthy();
  }

  expectErrorBannerVisible() {
    expect(screen.queryByTestId('banneralert')).toBeTruthy();
  }

  expectErrorBannerHidden() {
    expect(screen.queryByTestId('banneralert')).toBeNull();
  }

  closeErrorBanner() {
    const close = screen.getByTestId('banner-close-button-icon');
    fireEvent.press(close);
  }
}

export const bridgeViewRobot = () => new BridgeViewRobot();

import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';

/**
 * Page Object for the Send Redesign Flow
 * Used when the sendRedesign feature flag is enabled
 */
class SendRedesignView {
  get assetSearchField(): DetoxElement {
    return Matchers.getElementByID('textfieldsearch');
  }

  get tokensSection(): DetoxElement {
    return Matchers.getElementByText('Tokens');
  }

  get nftsSection(): DetoxElement {
    return Matchers.getElementByText('NFTs');
  }

  // Recipient page selectors
  get recipientAddressInput(): DetoxElement {
    return Matchers.getElementByID('textfield');
  }

  get pasteButton(): DetoxElement {
    return Matchers.getElementByText('Paste');
  }

  get clearButton(): DetoxElement {
    return Matchers.getElementByText('Clear');
  }

  get reviewButton(): DetoxElement {
    return Matchers.getElementByID('review-button-send');
  }

  get toAddressWarningBanner(): DetoxElement {
    return Matchers.getElementByID('to-address-warning-banner');
  }

  // Asset selection page (if needed)
  get assetSelectionPage(): DetoxElement {
    // This would need to be filled in once asset selection selectors are identified
    return Matchers.getElementByText('Select Asset');
  }

  // Amount page selectors
  get amountInput(): DetoxElement {
    return Matchers.getElementByID('send_amount');
  }

  get continueButton(): DetoxElement {
    return Matchers.getElementByText('Continue');
  }

  get nextButton(): DetoxElement {
    return Matchers.getElementByText('Next');
  }

  // Actions for asset selection page
  async searchForAsset(query: string): Promise<void> {
    await Gestures.tap(this.assetSearchField, {
      elemDescription: 'tap asset search field',
    });
    await Gestures.replaceText(this.assetSearchField, query, {
      elemDescription: `search for asset: ${query}`,
    });
  }

  async selectTokenBySymbol(tokenSymbol: string): Promise<void> {
    const token = Matchers.getElementByText(tokenSymbol);
    await Gestures.tap(token, {
      elemDescription: `select token: ${tokenSymbol}`,
    });
  }

  async selectTokenByName(tokenName: string): Promise<void> {
    const token = Matchers.getElementByText(tokenName);
    await Gestures.tap(token, {
      elemDescription: `select token: ${tokenName}`,
    });
  }

  // Actions for amount page
  async enterAmount(amount: string): Promise<void> {
    await Gestures.tap(this.amountInput, {
      elemDescription: 'tap amount input field',
    });
    await Gestures.replaceText(this.amountInput, amount, {
      elemDescription: `enter amount: ${amount}`,
    });
  }

  async tapContinueButton(): Promise<void> {
    await Gestures.tap(this.continueButton, {
      elemDescription: 'tap continue button',
    });
  }

  async tapNextButton(): Promise<void> {
    await Gestures.tap(this.nextButton, {
      elemDescription: 'tap next button',
    });
  }

  // Actions for recipient page
  async tapRecipientAddressInput(): Promise<void> {
    await Gestures.tap(this.recipientAddressInput, {
      elemDescription: 'tap recipient address input field',
    });
  }

  async inputRecipientAddress(address: string): Promise<void> {
    await Gestures.replaceText(this.recipientAddressInput, address, {
      elemDescription: `input recipient address: ${address}`,
    });
  }

  async tapPasteButton(): Promise<void> {
    await Gestures.tap(this.pasteButton, {
      elemDescription: 'tap paste button',
    });
  }

  async tapClearButton(): Promise<void> {
    await Gestures.tap(this.clearButton, {
      elemDescription: 'tap clear button',
    });
  }

  async tapReviewButton(): Promise<void> {
    await Gestures.tap(this.reviewButton, {
      elemDescription: 'tap review button',
    });
  }

  async selectContactFromList(contactName: string): Promise<void> {
    const contact = Matchers.getElementByText(contactName);
    await Gestures.tap(contact, {
      elemDescription: `select contact: ${contactName}`,
    });
  }

  async selectContactByAddress(address: string): Promise<void> {
    const contact = Matchers.getElementByID(`recipient-${address}`);
    await Gestures.tap(contact, {
      elemDescription: `select contact with address: ${address}`,
    });
  }

  async selectAccountFromList(accountName: string): Promise<void> {
    const account = Matchers.getElementByText(accountName);
    await Gestures.tap(account, {
      elemDescription: `select account: ${accountName}`,
    });
  }
}

export default new SendRedesignView();

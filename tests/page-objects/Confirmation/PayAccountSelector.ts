import {
  Assertions,
  Gestures,
  Matchers,
  type AppiumElement,
} from '../../framework';

const ACCOUNT_SELECTOR_IDS = {
  PILL: 'account-selector-pill',
  BOTTOM_SHEET: 'account-selector-bottom-sheet',
} as const;

/** Page object for the pay-from account selector on pay confirmations. */
class PayAccountSelector {
  get accountPill(): Promise<AppiumElement> {
    return Matchers.getElementByID(ACCOUNT_SELECTOR_IDS.PILL);
  }

  get bottomSheet(): Promise<AppiumElement> {
    return Matchers.getElementByID(ACCOUNT_SELECTOR_IDS.BOTTOM_SHEET);
  }

  async tapPill(): Promise<void> {
    await Gestures.waitAndTap(this.accountPill, {
      elemDescription: 'Pay-from account pill',
    });
  }

  async expectSheetVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(
      Matchers.getElementByText('Select account'),
      {
        description: 'Account selector sheet should be visible',
        timeout: 15000,
      },
    );
  }

  async tapAccountByName(name: string): Promise<void> {
    await Gestures.waitAndTap(Matchers.getElementByText(name), {
      elemDescription: `Account selector row "${name}"`,
      timeout: 15000,
    });
  }

  async verifyAccountSelected(name: string): Promise<void> {
    await Assertions.expectElementToBeVisible(Matchers.getElementByText(name), {
      description: `Pay-from account "${name}" should be selected`,
      timeout: 15000,
    });
  }
}

export default new PayAccountSelector();

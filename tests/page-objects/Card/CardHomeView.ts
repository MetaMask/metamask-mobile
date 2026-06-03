import Matchers from '../../framework/Matchers';
import { CardHomeSelectors } from '../../../app/components/UI/Card/Views/CardHome/CardHome.testIds';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class CardHomeView {
  get tryAgainButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(CardHomeSelectors.TRY_AGAIN_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(CardHomeSelectors.TRY_AGAIN_BUTTON),
    });
  }

  get privacyToggleButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(CardHomeSelectors.PRIVACY_TOGGLE_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          CardHomeSelectors.PRIVACY_TOGGLE_BUTTON,
        ),
    });
  }

  get addFundsButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(CardHomeSelectors.ADD_FUNDS_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(CardHomeSelectors.ADD_FUNDS_BUTTON),
    });
  }

  get addFundsBottomSheet(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(CardHomeSelectors.ADD_FUNDS_BOTTOM_SHEET),
      appium: () =>
        PlaywrightMatchers.getElementById(
          CardHomeSelectors.ADD_FUNDS_BOTTOM_SHEET,
        ),
    });
  }

  get addFundsBottomSheetDepositOption(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          CardHomeSelectors.ADD_FUNDS_BOTTOM_SHEET_DEPOSIT_OPTION,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          CardHomeSelectors.ADD_FUNDS_BOTTOM_SHEET_DEPOSIT_OPTION,
        ),
    });
  }

  get addFundsBottomSheetSwapOption(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          CardHomeSelectors.ADD_FUNDS_BOTTOM_SHEET_SWAP_OPTION,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          CardHomeSelectors.ADD_FUNDS_BOTTOM_SHEET_SWAP_OPTION,
        ),
    });
  }

  get cardViewTitle(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(CardHomeSelectors.CARD_VIEW_TITLE),
      appium: () =>
        PlaywrightMatchers.getElementById(CardHomeSelectors.CARD_VIEW_TITLE),
    });
  }

  get swapScreenSourceTokenArea(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID('source-token-area'),
      appium: () => PlaywrightMatchers.getElementById('source-token-area'),
    });
  }

  async tapTryAgainButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.tryAgainButton, {
      elemDescription: 'Try Again Button in Card Home View',
    });
  }

  async tapPrivacyToggleButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.privacyToggleButton, {
      elemDescription: 'Privacy Toggle Button in Card Home View',
    });
  }

  async tapAddFundsButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.addFundsButton, {
      elemDescription: 'Add Funds Button in Card Home View',
    });
  }

  async tapAddFundsBottomSheetDepositOption(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.addFundsBottomSheetDepositOption, {
      elemDescription:
        'Add Funds Bottom Sheet Deposit Option in Card Home View',
    });
  }

  async tapAddFundsBottomSheetSwapOption(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.addFundsBottomSheetSwapOption, {
      elemDescription: 'Add Funds Bottom Sheet Swap Option in Card Home View',
    });
  }
}

export default new CardHomeView();

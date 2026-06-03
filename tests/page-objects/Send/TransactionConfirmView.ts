// TODO: This file references legacy confirmation UI that was removed.
// The TransactionConfirmView.testIds file no longer exists.
// This e2e page object needs to be updated to use redesigned confirmation testIds
// or deleted if the functionality is no longer tested.

import Matchers from '../../framework/Matchers';
import { ConfirmationTopSheetSelectorsIDs } from '../../../app/components/Views/confirmations/ConfirmationView.testIds';
import {
  EditGasViewSelectorsText,
  EditGasViewSelectorsIDs,
} from '../../../app/components/Views/confirmations/legacy/components/EditGasView.testIds';
// import {
//   TransactionConfirmViewSelectorsIDs,
//   TransactionConfirmViewSelectorsText,
// } from '../../../app/components/Views/confirmations/legacy/components/Confirm/TransactionConfirmView.testIds';
import RowComponents from '../Browser/Confirmations/RowComponents';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

// Temporary placeholders to prevent TypeScript errors
const TransactionConfirmViewSelectorsIDs = {
  CONFIRM_TRANSACTION_BUTTON_ID: 'confirm-transaction-button',
  CONFIRM_TXN_AMOUNT: 'confirm-transaction-amount',
  TRANSACTION_VIEW_CONTAINER_ID: 'transaction-view-container',
};

const TransactionConfirmViewSelectorsText = {
  CANCEL_BUTTON: 'Cancel',
  CONFIRM: 'Confirm',
};

class TransactionConfirmationView {
  get confirmButton(): DetoxElement {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(
          TransactionConfirmViewSelectorsIDs.CONFIRM_TRANSACTION_BUTTON_ID,
        )
      : Matchers.getElementByLabel(
          TransactionConfirmViewSelectorsIDs.CONFIRM_TRANSACTION_BUTTON_ID,
        );
  }

  get cancelButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          TransactionConfirmViewSelectorsText.CANCEL_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          TransactionConfirmViewSelectorsText.CANCEL_BUTTON,
        ),
    });
  }

  get maxGasFee(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          EditGasViewSelectorsIDs.MAX_PRIORITY_FEE_INPUT_TEST_ID,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          EditGasViewSelectorsIDs.MAX_PRIORITY_FEE_INPUT_TEST_ID,
        ),
    });
  }

  get editPriorityFeeSheetContainer(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          EditGasViewSelectorsIDs.EDIT_PRIORITY_SCREEN_TEST_ID,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          EditGasViewSelectorsIDs.EDIT_PRIORITY_SCREEN_TEST_ID,
        ),
    });
  }

  get transactionAmount(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          TransactionConfirmViewSelectorsIDs.CONFIRM_TXN_AMOUNT,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          TransactionConfirmViewSelectorsIDs.CONFIRM_TXN_AMOUNT,
        ),
    });
  }

  get estimatedGasLink(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(EditGasViewSelectorsIDs.ESTIMATED_FEE_TEST_ID),
      appium: () =>
        PlaywrightMatchers.getElementById(
          EditGasViewSelectorsIDs.ESTIMATED_FEE_TEST_ID,
        ),
    });
  }

  get transactionViewContainer(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          TransactionConfirmViewSelectorsIDs.TRANSACTION_VIEW_CONTAINER_ID,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          TransactionConfirmViewSelectorsIDs.TRANSACTION_VIEW_CONTAINER_ID,
        ),
    });
  }
  get LowPriorityText(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText(EditGasViewSelectorsText.LOW),
      appium: () =>
        PlaywrightMatchers.getElementByText(EditGasViewSelectorsText.LOW),
    });
  }
  get MarketPriorityText(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText(EditGasViewSelectorsText.MARKET),
      appium: () =>
        PlaywrightMatchers.getElementByText(EditGasViewSelectorsText.MARKET),
    });
  }
  get AggressivePriorityText(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(EditGasViewSelectorsText.AGGRESSIVE),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          EditGasViewSelectorsText.AGGRESSIVE,
        ),
    });
  }
  get EditPrioritySaveButtonText(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(EditGasViewSelectorsText.SAVE_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          EditGasViewSelectorsText.SAVE_BUTTON,
        ),
    });
  }
  get EditPriorityAdvancedOptionsText(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(EditGasViewSelectorsText.ADVANCE_OPTIONS),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          EditGasViewSelectorsText.ADVANCE_OPTIONS,
        ),
    });
  }

  get editPriorityLegacyModal(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(EditGasViewSelectorsIDs.LEGACY_CONTAINER),
      appium: () =>
        PlaywrightMatchers.getElementById(
          EditGasViewSelectorsIDs.LEGACY_CONTAINER,
        ),
    });
  }

  get securityAlertBanner(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ConfirmationTopSheetSelectorsIDs.SECURITY_ALERT_BANNER,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConfirmationTopSheetSelectorsIDs.SECURITY_ALERT_BANNER,
        ),
    });
  }

  get securityAlertResponseFailedBanner(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ConfirmationTopSheetSelectorsIDs.SECURITY_ALERT_RESPONSE_FAILED_BANNER,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConfirmationTopSheetSelectorsIDs.SECURITY_ALERT_RESPONSE_FAILED_BANNER,
        ),
    });
  }

  async tapConfirmButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.confirmButton, {
      elemDescription: 'Confirm Button in Transaction Confirmation View',
    });
  }

  async tapCancelButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.cancelButton, {
      elemDescription: 'Cancel Button in Transaction Confirmation View',
    });
  }

  async tapEstimatedGasLink(): Promise<void> {
    await UnifiedGestures.swipe(this.transactionAmount, 'up', {
      speed: 'fast',
    });
    await UnifiedGestures.tap(this.estimatedGasLink, {
      elemDescription: 'Estimated Gas Link in Transaction Confirmation View',
      checkStability: true,
    });
  }

  async tapLowPriorityGasOption(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.LowPriorityText, {
      elemDescription:
        'Low Priority Gas Option in Transaction Confirmation View',
    });
  }
  async tapMarketPriorityGasOption(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.MarketPriorityText, {
      elemDescription:
        'Market Priority Gas Option in Transaction Confirmation View',
    });
  }
  async tapAggressivePriorityGasOption(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.AggressivePriorityText, {
      elemDescription:
        'Aggressive Priority Gas Option in Transaction Confirmation View',
    });
  }

  async tapMaxPriorityFeeSaveButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.EditPrioritySaveButtonText, {
      elemDescription:
        'Edit Priority Save Button in Transaction Confirmation View',
    });
  }
  async tapAdvancedOptionsPriorityGasOption(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.EditPriorityAdvancedOptionsText, {
      elemDescription: 'Advanced Options Priority Gas Option',
    });
  }

  async tapGasFeeTokenPill(): Promise<void> {
    await UnifiedGestures.waitAndTap(RowComponents.NetworkFeeGasFeeTokenPill, {
      elemDescription: 'Gas Fee Token Pill in Confirmation View',
    });
  }

  async tapAdvancedDetails(): Promise<void> {
    await UnifiedGestures.waitAndTap(RowComponents.AdvancedDetails, {
      elemDescription: 'Advanced details in Confirmation View',
    });
  }
}

export default new TransactionConfirmationView();

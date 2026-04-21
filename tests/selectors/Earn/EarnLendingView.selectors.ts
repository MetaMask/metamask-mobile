import enContent from '../../../locales/languages/en.json';
import { EARN_LENDING_BALANCE_TEST_IDS } from '../../../app/components/UI/Earn/components/EarnLendingBalance';
import {
  CONFIRMATION_FOOTER_TEST_ID,
  CONFIRMATION_FOOTER_BUTTON_TEST_IDS,
} from '../../../app/components/UI/Earn/Views/EarnLendingDepositConfirmationView/components/ConfirmationFooter';
import { DEPOSIT_DETAILS_SECTION_TEST_ID } from '../../../app/components/UI/Earn/Views/EarnLendingDepositConfirmationView/components/DepositInfoSection';
import { DEPOSIT_RECEIVE_SECTION_TEST_ID } from '../../../app/components/UI/Earn/Views/EarnLendingDepositConfirmationView/components/DepositReceiveSection';
import { PROGRESS_STEPPER_TEST_IDS } from '../../../app/components/UI/Earn/Views/EarnLendingDepositConfirmationView/components/ProgressStepper';

export const EarnLendingViewSelectorsIDs = {
  WITHDRAW_BUTTON: EARN_LENDING_BALANCE_TEST_IDS.WITHDRAW_BUTTON,
  DEPOSIT_BUTTON: EARN_LENDING_BALANCE_TEST_IDS.DEPOSIT_BUTTON,
  CONFIRMATION_FOOTER: CONFIRMATION_FOOTER_TEST_ID,
  CONFIRM_BUTTON: CONFIRMATION_FOOTER_BUTTON_TEST_IDS.CONFIRM_BUTTON,
  CANCEL_BUTTON: CONFIRMATION_FOOTER_BUTTON_TEST_IDS.CANCEL_BUTTON,
  DEPOSIT_INFO_SECTION: DEPOSIT_DETAILS_SECTION_TEST_ID,
  DEPOSIT_RECEIVE_SECTION: DEPOSIT_RECEIVE_SECTION_TEST_ID,
  PROGRESS_BAR: PROGRESS_STEPPER_TEST_IDS.PROGRESS_BAR,
  REVIEW_BUTTON: 'review-button',
};

export const EarnLendingViewSelectorsText = {
  SUPPLY: enContent.earn.supply,
  WITHDRAWAL_TIME: enContent.earn.withdrawal_time,
  CONFIRM: enContent.earn.confirm,
};

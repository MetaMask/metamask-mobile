import MoneyHomeView from '../page-objects/Money/MoneyHomeView';
import MoneyAddMoneySheet from '../page-objects/Money/MoneyAddMoneySheet';
import TabBarComponent from '../page-objects/wallet/TabBarComponent';
import VbaKycStatusView from '../page-objects/Ramps/VbaKycStatusView';
import Utilities from '../framework/Utilities';
import type { VbaKycRequestTracker } from '../api-mocking/mock-responses/ramps/vba-kyc-mocks';

export type VbaEntryPoint =
  | 'money-home-kyc-card'
  | 'add-money-bank-account'
  | 'money-home-details';

export const VBA_ENTRY_POINTS: readonly VbaEntryPoint[] = [
  'money-home-kyc-card',
  'add-money-bank-account',
  'money-home-details',
];

export const openMoneyHome = async (): Promise<void> => {
  await TabBarComponent.tapMoney();
  await MoneyHomeView.expectMoneyHomeVisible();
};

export const openVbaFromEntryPoint = async (
  entryPoint: VbaEntryPoint,
): Promise<void> => {
  if (entryPoint === 'money-home-kyc-card') {
    await MoneyHomeView.tapVbaKycDecisionCardCta();
    return;
  }
  if (entryPoint === 'add-money-bank-account') {
    await MoneyHomeView.tapAdd();
    await MoneyAddMoneySheet.expectVisible();
    await MoneyAddMoneySheet.tapBankAccount();
    return;
  }
  await MoneyHomeView.tapDetails();
};

export const leaveVbaStatusToMoneyHome = async (): Promise<void> => {
  await VbaKycStatusView.tapBack();
  await MoneyHomeView.expectMoneyHomeVisible();
};

export const waitForSumSubTokenRequest = async (
  tracker: VbaKycRequestTracker,
): Promise<void> => {
  await Utilities.executeWithRetry(
    async () => {
      if (tracker.journeyRequests < 1) {
        throw new Error('SumSub applicant token has not been requested yet');
      }
    },
    {
      timeout: 60_000,
      description: 'SumSub applicant token requested after Try again',
    },
  );
};

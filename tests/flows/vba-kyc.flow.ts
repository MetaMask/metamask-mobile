import type { Mockttp } from 'mockttp';
import MoneyHomeView from '../page-objects/Money/MoneyHomeView';
import MoneyAddMoneySheet from '../page-objects/Money/MoneyAddMoneySheet';
import TabBarComponent from '../page-objects/wallet/TabBarComponent';
import VbaKycStatusView from '../page-objects/Ramps/VbaKycStatusView';
import { collectSeenProxiedRequests } from '../api-mocking/helpers/mockHelpers';
import {
  isVbaKycJourneyRequest,
  isVbaKycSessionCreateRequest,
} from '../api-mocking/mock-responses/ramps/vba-kyc-mocks';

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

export const countVbaKycProviderRequests = async (
  mockServer: Mockttp,
): Promise<{ journey: number; sessionCreate: number }> => {
  const seen = await collectSeenProxiedRequests(mockServer);
  return {
    journey: seen.filter(isVbaKycJourneyRequest).length,
    sessionCreate: seen.filter(isVbaKycSessionCreateRequest).length,
  };
};

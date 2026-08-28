import { useRef } from 'react';
import { useSelector } from 'react-redux';
import {
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { PaymentOverride } from '@metamask/transaction-pay-controller';
import { RootState } from '../../../../../reducers';
import { selectPaymentOverrideByTransactionId } from '../../../../../selectors/transactionPayController';
import { useIsPerpsBalanceSelected } from '../../../../UI/Perps/hooks/useIsPerpsBalanceSelected';
import { selectPredictSelectedPaymentToken } from '../../../../UI/Predict/selectors/predictController';
import { useIsMoneyAccountFlagDefault } from './useIsMoneyAccountFlagDefault';
import { useTransactionPayFiatPayment } from './useTransactionPayData';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { PayWithSectionId } from '../../components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet.types';
import { useSectionTracking } from './useSectionTracking';
import { useTransactionPayingAccount } from '../transactions/useTransactionPayingAccount';
import { getAddressAccountType } from '../../../../../util/address';
import {
  normalizeOnboardingCompletedAccountType,
  OnboardingCompletedAccountType,
} from '../../../../../util/analytics/onboardingCompletedAnalytics';
import { useTransactionAccountOverride } from '../transactions/useTransactionAccountOverride';
import { getMemoizedInternalAccountByAddress } from '../../../../../selectors/accountsController';
import { KeyringType } from '@metamask/keyring-api/v2';

export const CRYPTO_PAY_SECTION_ID = 'crypto';

const SOFTWARE_ACCOUNT_TYPES = new Set<string>([
  OnboardingCompletedAccountType.Metamask,
  OnboardingCompletedAccountType.Imported,
]);

export type { SectionTrackingResult as PaySectionSourceMetrics } from './useSectionTracking';

export function usePaySectionSourceMetrics(hasPayToken: boolean) {
  const transactionMeta = useTransactionMetadataRequest();
  const transactionId = transactionMeta?.id ?? '';

  const paymentOverride = useSelector((state: RootState) =>
    selectPaymentOverrideByTransactionId(state, transactionId),
  );
  const isPerpsBalanceSelected = useIsPerpsBalanceSelected();
  const predictSelectedPaymentToken = useSelector(
    selectPredictSelectedPaymentToken,
  );
  const isPredictBalanceSelected = predictSelectedPaymentToken === null;
  const fiatPayment = useTransactionPayFiatPayment();
  const hasFiatPaymentSelected = Boolean(fiatPayment?.selectedPaymentMethodId);
  const isDefaultMoneyAccount = useIsMoneyAccountFlagDefault();
  const payingAccount = useTransactionPayingAccount();
  const payingAccountKeyringType = useSelector((state: RootState) =>
    payingAccount
      ? getMemoizedInternalAccountByAddress(state, payingAccount)?.metadata
          .keyring.type
      : undefined,
  );
  const cryptoAccountType = getCryptoAccountType(
    payingAccount,
    payingAccountKeyringType,
  );
  const accountOverride = useTransactionAccountOverride();

  const isPerpsDepositAndOrder = hasTransactionType(transactionMeta, [
    TransactionType.perpsDepositAndOrder,
  ]);
  const isPredictDepositAndOrder = hasTransactionType(transactionMeta, [
    TransactionType.predictDepositAndOrder,
  ]);
  const isMoneyAccountDeposit = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountDeposit,
  ]);
  const isPayingAccountReady =
    !isMoneyAccountDeposit || Boolean(accountOverride);

  // Track whether any payment override has been applied
  const overrideAppliedRef = useRef(false);
  if (paymentOverride !== undefined) {
    overrideAppliedRef.current = true;
  }

  const isMoneyAccountActive =
    paymentOverride === PaymentOverride.MoneyAccount ||
    (isDefaultMoneyAccount && !overrideAppliedRef.current);

  const currentSection = getActiveSectionId({
    isMoneyAccountActive,
    isPerpsBalanceSelected: isPerpsDepositAndOrder && isPerpsBalanceSelected,
    isPredictBalanceSelected:
      isPredictDepositAndOrder && isPredictBalanceSelected,
    hasFiatPaymentSelected,
    cryptoAccountType,
  });

  return useSectionTracking(
    currentSection,
    hasPayToken && isPayingAccountReady,
  );
}

function getActiveSectionId({
  isMoneyAccountActive,
  isPerpsBalanceSelected,
  isPredictBalanceSelected,
  hasFiatPaymentSelected,
  cryptoAccountType,
}: {
  isMoneyAccountActive: boolean;
  isPerpsBalanceSelected: boolean;
  isPredictBalanceSelected: boolean;
  hasFiatPaymentSelected: boolean;
  cryptoAccountType: PayWithSectionId;
}): PayWithSectionId {
  if (isMoneyAccountActive) return 'money-account';
  if (isPerpsBalanceSelected) return 'perps';
  if (isPredictBalanceSelected) return 'predict';
  if (hasFiatPaymentSelected) return 'bank-card';
  return cryptoAccountType;
}

function getCryptoAccountType(
  address: string | undefined,
  keyringType: string | undefined,
): PayWithSectionId {
  const accountTypeFromKeyring = getAccountTypeFromKeyring(keyringType);
  if (accountTypeFromKeyring) {
    return accountTypeFromKeyring;
  }

  if (!address) {
    return CRYPTO_PAY_SECTION_ID;
  }

  try {
    const accountType = getAddressAccountType(address);
    const normalizedAccountType = accountType.toLowerCase();

    return (
      normalizeOnboardingCompletedAccountType(
        SOFTWARE_ACCOUNT_TYPES.has(normalizedAccountType)
          ? normalizedAccountType
          : accountType,
      ) ?? CRYPTO_PAY_SECTION_ID
    );
  } catch {
    return CRYPTO_PAY_SECTION_ID;
  }
}

function getAccountTypeFromKeyring(
  keyringType: string | undefined,
): OnboardingCompletedAccountType | undefined {
  const normalizedKeyringType = keyringType?.toLowerCase();
  if (!normalizedKeyringType) {
    return undefined;
  }

  if (
    normalizedKeyringType === KeyringType.Hd ||
    normalizedKeyringType === 'hd key tree'
  ) {
    return OnboardingCompletedAccountType.Metamask;
  }

  if (
    normalizedKeyringType === KeyringType.PrivateKey ||
    normalizedKeyringType === 'simple key pair'
  ) {
    return OnboardingCompletedAccountType.Imported;
  }

  if (
    normalizedKeyringType === KeyringType.Snap ||
    normalizedKeyringType.includes('snap keyring')
  ) {
    return OnboardingCompletedAccountType.Snap;
  }

  if (normalizedKeyringType.includes(KeyringType.Ledger)) {
    return OnboardingCompletedAccountType.Ledger;
  }

  if (normalizedKeyringType.includes(KeyringType.Trezor)) {
    return OnboardingCompletedAccountType.Trezor;
  }

  if (normalizedKeyringType.includes(KeyringType.Lattice)) {
    return OnboardingCompletedAccountType.Lattice;
  }

  if (
    normalizedKeyringType.includes(KeyringType.Qr) ||
    normalizedKeyringType.includes(KeyringType.OneKey)
  ) {
    return OnboardingCompletedAccountType.QrHardware;
  }

  return undefined;
}

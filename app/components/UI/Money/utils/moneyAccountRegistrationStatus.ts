import type { IntentEntry, UpgradeEntry } from '@metamask/chomp-api-service';
import type { MoneyAccountUpgradeStatus } from '@metamask/money-account-upgrade-controller';

export type ChompSignalResult<Data> =
  | { status: 'success'; data: Data }
  | { status: 'error'; error: Error };

export interface MoneyAccountChompSignals {
  isAddressAssociated: ChompSignalResult<boolean>;
  upgrades: ChompSignalResult<UpgradeEntry[]>;
  intents: ChompSignalResult<IntentEntry[]>;
}

export enum RegistrationSignalStatus {
  Complete = 'complete',
  Pending = 'pending',
  Missing = 'missing',
  Unknown = 'unknown',
}

export enum MoneyAccountRegistrationSummary {
  Registered = 'registered',
  Pending = 'pending',
  Incomplete = 'incomplete',
  Unknown = 'unknown',
}

export const getAssociationStatus = (
  result: ChompSignalResult<boolean>,
): RegistrationSignalStatus => {
  if (result.status === 'error') {
    return RegistrationSignalStatus.Unknown;
  }
  return result.data
    ? RegistrationSignalStatus.Complete
    : RegistrationSignalStatus.Missing;
};

export const getUpgradeStatus = (
  result: ChompSignalResult<UpgradeEntry[]>,
): RegistrationSignalStatus => {
  if (result.status === 'error') {
    return RegistrationSignalStatus.Unknown;
  }
  if (result.data.length === 0) {
    return RegistrationSignalStatus.Missing;
  }
  return result.data.some((upgrade) => upgrade.status === 'pending')
    ? RegistrationSignalStatus.Pending
    : RegistrationSignalStatus.Complete;
};

export const getIntentsStatus = (
  result: ChompSignalResult<IntentEntry[]>,
): RegistrationSignalStatus => {
  if (result.status === 'error') {
    return RegistrationSignalStatus.Unknown;
  }
  return result.data.some((intent) => intent.status === 'active')
    ? RegistrationSignalStatus.Complete
    : RegistrationSignalStatus.Missing;
};

export const getLocalUpgradeStatus = (
  record: MoneyAccountUpgradeStatus | undefined,
): RegistrationSignalStatus =>
  record ? RegistrationSignalStatus.Complete : RegistrationSignalStatus.Missing;

export const getRegistrationSummary = (
  statuses: RegistrationSignalStatus[],
): MoneyAccountRegistrationSummary => {
  if (statuses.includes(RegistrationSignalStatus.Missing)) {
    return MoneyAccountRegistrationSummary.Incomplete;
  }
  if (statuses.includes(RegistrationSignalStatus.Pending)) {
    return MoneyAccountRegistrationSummary.Pending;
  }
  if (statuses.includes(RegistrationSignalStatus.Unknown)) {
    return MoneyAccountRegistrationSummary.Unknown;
  }
  return MoneyAccountRegistrationSummary.Registered;
};

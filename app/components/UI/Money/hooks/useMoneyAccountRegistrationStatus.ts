import { useCallback, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { isStrictHexString } from '@metamask/utils';
import {
  forceUpgradeMoneyAccount,
  type ForceUpgradeResult,
} from '../../../../actions/money';
import {
  selectPrimaryMoneyAccount,
  selectMoneyAccountUpgradedAccounts,
} from '../../../../selectors/moneyAccountController';
import { selectIsUnlocked } from '../../../../selectors/keyringController';

export type MoneyAccountRegistrationStatus =
  | 'registered'
  | 'not_registered'
  | 'unavailable';
export const useMoneyAccountRegistrationStatus = () => {
  const account = useSelector(selectPrimaryMoneyAccount);
  const isUnlocked = useSelector(selectIsUnlocked);
  const upgradedAccounts = useSelector(selectMoneyAccountUpgradedAccounts);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryResult, setRetryResult] = useState<ForceUpgradeResult>();
  const retrying = useRef(false);
  const address = account?.address;
  const valid = Boolean(isUnlocked && address && isStrictHexString(address));
  const validAddress = valid ? (address as `0x${string}`) : undefined;
  const record = validAddress
    ? upgradedAccounts[validAddress.toLowerCase() as `0x${string}`]
    : undefined;
  const retry = useCallback(async (): Promise<
    ForceUpgradeResult | undefined
  > => {
    if (!validAddress || retrying.current) return undefined;
    retrying.current = true;
    setIsRetrying(true);
    try {
      const result = await forceUpgradeMoneyAccount(validAddress);
      setRetryResult(result);
      return result;
    } finally {
      retrying.current = false;
      setIsRetrying(false);
    }
  }, [validAddress]);
  return {
    address,
    status: valid ? (record ? 'registered' : 'not_registered') : 'unavailable',
    completedAt: record?.completedAt,
    isRetrying,
    retryResult,
    retry,
  };
};

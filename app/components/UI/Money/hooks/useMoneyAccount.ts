import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectMoneyAccountAddress } from '../../../../selectors/keyringController';
import {
  selectSelectedAccountGroup,
  selectWalletByAccount,
} from '../../../../selectors/multichainAccounts/accountTreeController';
import { AccountWalletType } from '@metamask/account-api';
import Logger from '../../../../util/Logger';

export interface UseMoneyAccountResult {
  /**
   * The address of the Money account if one has been created, otherwise null.
   */
  moneyAccountAddress: string | null;

  /**
   * The entropy source (HD keyring ID) of the currently selected account group,
   * or null if one cannot be resolved.
   */
  entropySource: string | null;

  /**
   * Creates a Money account derived from the current HD keyring.
   */
  createMoneyAccount: () => Promise<void>;
}

/**
 * Hook that exposes Money account state and actions.
 *
 * @returns Money account address, entropy source, and createMoneyAccount action.
 */
export const useMoneyAccount = (): UseMoneyAccountResult => {
  const moneyAccountAddress = useSelector(selectMoneyAccountAddress);
  const selectedAccountGroup = useSelector(selectSelectedAccountGroup);
  const getWalletByAccount = useSelector(selectWalletByAccount);

  const entropySource = useMemo(() => {
    const firstAccountId = selectedAccountGroup?.accounts?.[0];
    if (!firstAccountId) return null;
    const wallet = getWalletByAccount(firstAccountId);
    if (wallet?.type !== AccountWalletType.Entropy) return null;
    return wallet.metadata.entropy.id;
  }, [selectedAccountGroup, getWalletByAccount]);

  const createMoneyAccount = useCallback(async () => {
    if (!entropySource) {
      Logger.log('[MoneyAccount] No entropySource available, aborting');
      return;
    }
    try {
      const result =
        await Engine.context.MoneyAccountService.createMoneyAccount(
          entropySource,
        );
      Logger.log('[MoneyAccount] createMoneyAccount result', result);
    } catch (e) {
      Logger.error(e as Error, '[MoneyAccount] createMoneyAccount failed');
    }
  }, [entropySource]);

  return {
    moneyAccountAddress,
    entropySource,
    createMoneyAccount,
  };
};

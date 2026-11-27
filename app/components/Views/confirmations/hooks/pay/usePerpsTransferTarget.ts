import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { TransactionType } from '@metamask/transaction-controller';

import { selectSelectedInternalAccountAddress } from '../../../../../selectors/accountsController';
import {
  selectPerpsAccountState,
  selectPerpsBalances,
} from '../../../../UI/Perps/selectors/perpsController';
import { selectPerpsLighterProviderEnabledFlag } from '../../../../UI/Perps/selectors/featureFlags';
import { formatPerpsBalance } from '../../../../UI/Perps/utils/formatUtils';
import { isLighterProviderEnabled } from '../../../../UI/Perps/utils/lighterFeatureFlags';
import { useLighterTotalBalance } from '../../temp-lighter/useLighterWithdrawableBalance';
import {
  getPerpsWithdrawType,
  type PerpsProviderSelection,
} from '../../utils/perps-lighter-transaction-type';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

/**
 * Perps provider the open Perps withdraw can move its funds to, i.e. the
 * provider that is not the From side. Undefined outside a Perps withdraw and
 * while the Lighter provider is off.
 */
export function usePerpsTransferTarget(): PerpsProviderSelection | undefined {
  const transactionMeta = useTransactionMetadataRequest();
  const providerFlagEnabled = useSelector(
    selectPerpsLighterProviderEnabledFlag,
  );
  const withdrawType = getPerpsWithdrawType(transactionMeta);

  if (!withdrawType || !isLighterProviderEnabled() || !providerFlagEnabled) {
    return undefined;
  }

  return withdrawType === TransactionType.perpsLighterWithdraw
    ? 'hyperliquid'
    : 'lighter';
}

/**
 * Perps provider the open Perps deposit can be paid from, i.e. the provider
 * that is not receiving the funds. Undefined outside a Perps deposit and while
 * the Lighter provider is off.
 */
export function usePerpsTransferSource(): PerpsProviderSelection | undefined {
  const transactionMeta = useTransactionMetadataRequest();
  const providerFlagEnabled = useSelector(
    selectPerpsLighterProviderEnabledFlag,
  );

  if (!isLighterProviderEnabled() || !providerFlagEnabled) {
    return undefined;
  }

  switch (transactionMeta?.type) {
    case TransactionType.perpsDeposit:
      return 'lighter';
    case TransactionType.perpsLighterDeposit:
      return 'hyperliquid';
    default:
      return undefined;
  }
}

/**
 * Total balance of a Perps provider, read from controller state so it also
 * works where `PerpsStreamProvider` is not mounted.
 *
 * @param provider - Provider to read, or undefined to read nothing.
 * @returns Formatted balance, or undefined when `provider` is undefined.
 */
export function usePerpsTransferBalance(
  provider: PerpsProviderSelection | undefined,
): string | undefined {
  const accountState = useSelector(selectPerpsAccountState);
  const perpsBalances = useSelector(selectPerpsBalances);
  const address = useSelector(selectSelectedInternalAccountAddress);
  const controllerLighterBalance = perpsBalances.lighter?.totalBalance;
  // TEMPORARY FALLBACK, same as `usePerpsProviderBalance`: the controller only
  // fills `perpsBalances` for Lighter in aggregated mode.
  const fallbackLighterBalance = useLighterTotalBalance(
    address,
    provider === 'lighter' && controllerLighterBalance === undefined,
  );

  return useMemo(() => {
    if (provider === 'hyperliquid') {
      return formatPerpsBalance(accountState?.totalBalance);
    }

    if (provider === 'lighter') {
      return formatPerpsBalance(
        controllerLighterBalance ?? fallbackLighterBalance,
      );
    }

    return undefined;
  }, [
    accountState?.totalBalance,
    controllerLighterBalance,
    fallbackLighterBalance,
    provider,
  ]);
}

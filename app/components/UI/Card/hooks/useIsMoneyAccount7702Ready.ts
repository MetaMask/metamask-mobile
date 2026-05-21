import { useSelector } from 'react-redux';
import type { Hex } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { useAsyncResult } from '../../../hooks/useAsyncResult';

/**
 * Returns whether the primary money account is EIP-7702-upgraded on the
 * money-account vault chain (Monad). `undefined` while the check is in
 * flight, `true` once the TransactionController confirms support for the
 * configured chain, `false` if the chain entry is missing or not supported.
 *
 * Used by `useMoneyAccountCardLinkage.canLink` to gate the money-account CTA
 * in the SpendingLimit screen: linking through MM Pay sponsorship requires
 * the relay to be able to redeem the delegation on the user's behalf, which
 * is only possible after the account has been upgraded.
 */
export function useIsMoneyAccount7702Ready(): boolean | undefined {
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
  const vaultConfig = useSelector(selectMoneyAccountVaultConfig);

  const address = primaryMoneyAccount?.address as Hex | undefined;
  const chainId = vaultConfig?.chainId as Hex | undefined;

  const { pending, value } = useAsyncResult(async () => {
    if (!address || !chainId) return false;
    const result =
      await Engine.context.TransactionController.isAtomicBatchSupported({
        address,
        chainIds: [chainId],
      });
    const entry = result.find((e) => e.chainId === chainId);
    return Boolean(entry?.isSupported);
  }, [address, chainId]);

  if (pending) return undefined;
  return value;
}

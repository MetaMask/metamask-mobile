import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { isTransactionPayWithdraw } from '../../utils/transaction';
import { usePayPostQuoteConfig } from './usePayPostQuoteConfig';
import {
  buildAllowlistTokens,
  BuildAllowlistDeps,
} from '../../utils/transaction-pay';
import { selectERC20TokensByChain } from '../../../../../selectors/tokenListController';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../../selectors/networkController';
import { AssetType } from '../../types/token';

/**
 * Returns a token filter for withdraw transactions, following the same pattern
 * as `usePerpsBalanceTokenFilter` and `useMusdConversionTokens`.
 *
 * When the resolved post-quote config has a `tokens` allowlist, builds the
 * token list from that allowlist — using the user's held tokens when available
 * and falling back to the token catalog (or network config for native tokens)
 * for tokens not yet held.
 */
export function useWithdrawTokenFilter(): (tokens: AssetType[]) => AssetType[] {
  const transactionMeta = useTransactionMetadataRequest();
  const isWithdraw = isTransactionPayWithdraw(transactionMeta);
  const { tokens: allowlist } = usePayPostQuoteConfig();
  const tokensChainsCache = useSelector(selectERC20TokensByChain);
  const networkConfigs = useSelector(selectEvmNetworkConfigurationsByChainId);

  const deps: BuildAllowlistDeps = useMemo(
    () => ({ tokensChainsCache, networkConfigs }),
    [tokensChainsCache, networkConfigs],
  );

  return useCallback(
    (tokens: AssetType[]): AssetType[] => {
      if (!isWithdraw || !allowlist) {
        return tokens;
      }

      return buildAllowlistTokens(tokens, allowlist, deps);
    },
    [isWithdraw, allowlist, deps],
  );
}

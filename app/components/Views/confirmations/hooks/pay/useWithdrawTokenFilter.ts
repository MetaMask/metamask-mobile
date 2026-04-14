import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { isNativeAddress } from '@metamask/bridge-controller';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import {
  getPostQuoteTransactionType,
  isTransactionPayWithdraw,
} from '../../utils/transaction';
import { selectPayQuoteConfig } from '../../../../../selectors/featureFlagController/confirmations';
import { useSendTokens } from '../send/useSendTokens';
import { AssetType } from '../../types/token';
import { RootState } from '../../../../../reducers';

/**
 * Returns a token filter for withdraw transactions, following the same pattern
 * as `usePerpsBalanceTokenFilter` and `useMusdConversionTokens`.
 *
 * Uses `includeAllTokens` to pull from the full token catalog so that
 * allowlisted tokens appear even when the user has zero balance.
 */
export function useWithdrawTokenFilter(): (tokens: AssetType[]) => AssetType[] {
  const transactionMeta = useTransactionMetadataRequest();
  const isWithdraw = isTransactionPayWithdraw(transactionMeta);
  const transactionType = getPostQuoteTransactionType(transactionMeta);
  const config = useSelector((state: RootState) =>
    selectPayQuoteConfig(state, transactionType),
  );
  const allowlist = config.tokens;
  const shouldLoadFullTokenCatalog = isWithdraw && Boolean(allowlist);

  const tokenFilter = useMemo(() => {
    if (!allowlist) {
      return undefined;
    }
    const lookup = buildAllowlistLookup(allowlist);
    return (chainId: string, address: string) =>
      lookup.get(chainId.toLowerCase())?.has(address.toLowerCase()) ?? false;
  }, [allowlist]);

  const allTokens = useSendTokens({
    includeNoBalance: shouldLoadFullTokenCatalog,
    includeAllTokens: shouldLoadFullTokenCatalog,
    tokenFilter,
  });

  return useCallback(
    (tokens: AssetType[]): AssetType[] => {
      if (!isWithdraw || !shouldLoadFullTokenCatalog) {
        return tokens;
      }
      return allTokens;
    },
    [isWithdraw, shouldLoadFullTokenCatalog, allTokens],
  );
}

/**
 * Pre-computes a Map<chainId, Set<address>> from the allowlist for O(1) lookups.
 * Expands zero-address entries to also include the chain-specific native address.
 */
function buildAllowlistLookup(
  allowlist: Record<Hex, Hex[]>,
): Map<string, Set<string>> {
  const lookup = new Map<string, Set<string>>();

  for (const [chainId, addresses] of Object.entries(allowlist)) {
    const lowerChainId = chainId.toLowerCase();
    const addressSet = new Set<string>();

    for (const addr of addresses) {
      const lowerAddr = addr.toLowerCase();
      addressSet.add(lowerAddr);

      if (isNativeAddress(lowerAddr)) {
        const nativeAddr = getNativeTokenAddress(lowerChainId as Hex);
        addressSet.add(nativeAddr.toLowerCase());
      }
    }

    lookup.set(lowerChainId, addressSet);
  }

  return lookup;
}

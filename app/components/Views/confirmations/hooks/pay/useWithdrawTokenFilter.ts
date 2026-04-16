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

export function useWithdrawTokenFilter(): (tokens: AssetType[]) => AssetType[] {
  const transactionMeta = useTransactionMetadataRequest();
  const isWithdraw = isTransactionPayWithdraw(transactionMeta);
  const transactionType = getPostQuoteTransactionType(transactionMeta);
  const config = useSelector((state: RootState) =>
    selectPayQuoteConfig(state, transactionType),
  );
  const allowlist = config.tokens;
  const shouldEnrich = isWithdraw && Boolean(allowlist);

  const tokenFilter = useMemo(() => {
    if (!allowlist) {
      return undefined;
    }
    const lookup = buildAllowlistLookup(allowlist);
    return (chainId: string, address: string) =>
      lookup.get(chainId.toLowerCase())?.has(address.toLowerCase()) ?? false;
  }, [allowlist]);

  const enrichTokenRequests = useMemo(() => {
    if (!shouldEnrich || !allowlist) return [];
    return Object.entries(allowlist).flatMap(([chainId, addresses]) =>
      addresses
        .filter((addr) => !isNativeAddress(addr.toLowerCase()))
        .map((addr) => ({
          chainId: chainId as Hex,
          address: addr,
        })),
    );
  }, [shouldEnrich, allowlist]);

  const walletTokens = useSendTokens({
    includeNoBalance: shouldEnrich,
    tokenFilter,
    enrichTokenRequests,
  });

  return useCallback(
    (tokens: AssetType[]): AssetType[] => {
      if (!isWithdraw || !shouldEnrich) {
        return tokens;
      }
      return walletTokens;
    },
    [isWithdraw, shouldEnrich, walletTokens],
  );
}

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

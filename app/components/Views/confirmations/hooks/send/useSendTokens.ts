import { useMemo } from 'react';
import { AssetType } from '../../types/token';
import { useAccountTokens, EnrichTokenRequest } from './useAccountTokens';
import { useSendType } from './useSendType';

export function useSendTokens({
  includeNoBalance = false,
  tokenFilter,
  enrichTokenRequests,
}: {
  includeNoBalance?: boolean;
  tokenFilter?: (chainId: string, address: string) => boolean;
  enrichTokenRequests?: EnrichTokenRequest[];
} = {}): AssetType[] {
  const {
    isPredefinedTron,
    isPredefinedBitcoin,
    isPredefinedSolana,
    isPredefinedEvm,
  } = useSendType();
  const allTokens = useAccountTokens({
    includeNoBalance,
    tokenFilter,
    enrichTokenRequests,
  });

  return useMemo(() => {
    const accountTypeMap: Record<string, boolean> = {
      eip155: !!isPredefinedEvm,
      solana: !!isPredefinedSolana,
      tron: !!isPredefinedTron,
      bip122: !!isPredefinedBitcoin,
    };

    const matchedAccountType = Object.entries(accountTypeMap).find(
      ([, isType]) => isType,
    )?.[0];

    if (!matchedAccountType) {
      return allTokens;
    }

    return allTokens.filter((token) =>
      token.accountType?.includes(matchedAccountType),
    );
  }, [
    allTokens,
    isPredefinedEvm,
    isPredefinedSolana,
    isPredefinedTron,
    isPredefinedBitcoin,
  ]);
}

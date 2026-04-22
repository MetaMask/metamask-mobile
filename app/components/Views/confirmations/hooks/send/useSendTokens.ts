import { useMemo } from 'react';
import { AssetType } from '../../types/token';
import { useAccountTokens } from './useAccountTokens';
import { useSendType } from './useSendType';

export function useSendTokens({
  includeNoBalance = false,
  includeAllTokens = false,
  tokenFilter,
}: {
  includeNoBalance?: boolean;
  includeAllTokens?: boolean;
  tokenFilter?: (chainId: string, address: string) => boolean;
} = {}): AssetType[] {
  const {
    isPredefinedTron,
    isPredefinedBitcoin,
    isPredefinedSolana,
    isPredefinedEvm,
  } = useSendType();
  const allTokens = useAccountTokens({
    includeNoBalance,
    includeAllTokens,
    tokenFilter,
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

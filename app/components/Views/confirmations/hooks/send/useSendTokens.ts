import { useMemo } from 'react';
import { AssetType } from '../../types/token';
import { useAccountTokens } from './useAccountTokens';
import { useSendType } from './useSendType';

export function useSendTokens({
  includeNoBalance = false,
}: {
  includeNoBalance?: boolean;
} = {}): AssetType[] {
  const { isEvmSendType, isSolanaSendType, isTronSendType, isBitcoinSendType } =
    useSendType();
  const allTokens = useAccountTokens({ includeNoBalance });

  return useMemo(() => {
    const accountTypeMap: Record<string, boolean> = {
      eip155: !!isEvmSendType,
      solana: !!isSolanaSendType,
      tron: !!isTronSendType,
      bip122: !!isBitcoinSendType,
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
    isEvmSendType,
    isSolanaSendType,
    isTronSendType,
    isBitcoinSendType,
  ]);
}

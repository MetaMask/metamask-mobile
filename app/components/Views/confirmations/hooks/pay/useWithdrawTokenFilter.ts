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
  const allTokens = useSendTokens({
    includeNoBalance: true,
    includeAllTokens: true,
  });

  const allowlist = config.tokens;

  const filtered = useMemo(() => {
    if (!allowlist) {
      return undefined;
    }
    return allTokens.filter((token) => isAllowlisted(token, allowlist));
  }, [allTokens, allowlist]);

  return useCallback(
    (tokens: AssetType[]): AssetType[] => {
      if (!isWithdraw || !filtered) {
        return tokens;
      }
      return filtered;
    },
    [isWithdraw, filtered],
  );
}

function isAllowlisted(
  token: AssetType,
  allowlist: Record<Hex, Hex[]>,
): boolean {
  const chainId = token.chainId?.toLowerCase() as Hex | undefined;
  if (!chainId) {
    return false;
  }

  const allowlistKey = Object.keys(allowlist).find(
    (key) => key.toLowerCase() === chainId,
  ) as Hex | undefined;
  const addresses = allowlistKey ? allowlist[allowlistKey] : undefined;
  if (!addresses) {
    return false;
  }

  const tokenAddr = token.address?.toLowerCase();
  return addresses.some((allowed) => {
    const allowedLower = allowed.toLowerCase();
    if (tokenAddr === allowedLower) {
      return true;
    }
    // Allowlist may use 0x000…000 for native tokens while the token list
    // uses the chain-specific native address (e.g. 0x…1010 on Polygon).
    if (isNativeAddress(allowedLower)) {
      const nativeAddr = getNativeTokenAddress(chainId);
      return tokenAddr === nativeAddr.toLowerCase();
    }
    return false;
  });
}

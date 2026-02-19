import { useMemo } from 'react';
import { BridgeToken } from '../../types';
import { MINIMUM_DISPLAY_THRESHOLD } from '../../../../../util/number';
import { formatAmountWithLocaleSeparators } from '../../utils/formatAmountWithLocaleSeparators';
import parseAmount from '../../../../../util/parseAmount';

export const useTokenInputAreaFormattedBalance = (
  tokenBalance?: string,
  token?: BridgeToken,
) =>
  useMemo(() => {
    if (!token?.symbol || !tokenBalance) {
      return;
    }

    const value = parseFloat(tokenBalance);

    if (value < MINIMUM_DISPLAY_THRESHOLD && value > 0) {
      return `< ${MINIMUM_DISPLAY_THRESHOLD}`;
    }

    const parsedTotalBalance = parseAmount(tokenBalance, 5);

    if (!parsedTotalBalance) {
      // Guard against corrupted parsing. Should never be reachable
      // except in cases where parseAmount has a bug.
      // Return the whole token balance amount without formatting
      // rather than empty balance.
      return tokenBalance + ' ' + token.symbol;
    }

    return (
      formatAmountWithLocaleSeparators(parsedTotalBalance) + ' ' + token.symbol
    );
  }, [token?.symbol, tokenBalance]);

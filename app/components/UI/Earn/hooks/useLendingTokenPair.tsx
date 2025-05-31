import { isEmpty } from 'lodash';
import { TokenI } from '../../Tokens/types';
import {
  LENDING_TOKEN_TO_RECEIPT_TOKEN_MAP,
  RECEIPT_TOKEN_TO_LENDING_TOKEN_MAP,
  SUPPORTED_LENDING_TOKENS,
} from '../utils';
import { EarnTokenDetails, useEarnTokenDetails } from './useEarnTokenDetails';
import useEarnTokens from './useEarnTokens';

// Pair = Lending token and its related receipt token (e.g. USDC and AETHUSDC)
// Potential improvement: Consider memoizing pairs to avoid unnecessary recalculating.
// Will wait to see if we use this after earn-controller lending state is integrated.
const useLendingTokenPair = (
  token: TokenI,
): {
  lendingToken: Partial<EarnTokenDetails>;
  receiptToken: Partial<EarnTokenDetails>;
} => {
  const { getTokenWithBalanceAndApr } = useEarnTokenDetails();

  const result = { lendingToken: {}, receiptToken: {} };

  const lendingTokens = useEarnTokens({
    includeLendingTokens: true,
  });

  const receiptTokens = useEarnTokens({ includeReceiptTokens: true });

  if (!token || isEmpty(token) || !token?.chainId) return result;

  const isLendingToken = SUPPORTED_LENDING_TOKENS.has(token?.symbol);

  if (isLendingToken) {
    const relatedReceiptTokenSymbol =
      LENDING_TOKEN_TO_RECEIPT_TOKEN_MAP[token.chainId][token.symbol];
    const relatedReceiptToken = receiptTokens.find(
      (receiptToken) =>
        receiptToken.symbol === relatedReceiptTokenSymbol &&
        receiptToken.chainId === token.chainId,
    );

    if (!relatedReceiptToken) return result;

    result.lendingToken = getTokenWithBalanceAndApr(token);
    result.receiptToken = getTokenWithBalanceAndApr(relatedReceiptToken);

    return result;
  }

  // Find lending token relating to passed in receipt token.
  const relatedLendingTokenSymbol =
    RECEIPT_TOKEN_TO_LENDING_TOKEN_MAP?.[token.chainId]?.[token.symbol];

  if (!relatedLendingTokenSymbol) return result;

  const relatedLendingToken = lendingTokens.find(
    (lendingToken) =>
      lendingToken.symbol === relatedLendingTokenSymbol &&
      lendingToken.chainId === token.chainId,
  );

  if (!relatedLendingToken) return result;

  result.lendingToken = getTokenWithBalanceAndApr(relatedLendingToken);
  result.receiptToken = getTokenWithBalanceAndApr(token);

  return result;
};

export default useLendingTokenPair;

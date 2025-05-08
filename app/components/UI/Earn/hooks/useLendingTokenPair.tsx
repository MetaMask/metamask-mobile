import { TokenI } from '../../Tokens/types';
import {
  LENDING_TOKEN_TO_RECEIPT_TOKEN_MAP,
  RECEIPT_TOKEN_TO_LENDING_TOKEN_MAP,
  SUPPORTED_LENDING_TOKENS,
} from '../utils';
import { useEarnTokenDetails } from './useEarnTokenDetails';
import useEarnTokens from './useEarnTokens';

// Pair = Lending token and its related receipt token (e.g. USDC and AETHUSDC)
// Potential improvement: Consider memoizing pairs to avoid unnecessary recalculating.
// Will wait to see if we use this after earn-controller state is pulled.
const useLendingTokenPair = (token: TokenI) => {
  const { getTokenWithBalanceAndApr } = useEarnTokenDetails();

  const result = { lendingToken: {}, receiptToken: {} };

  const isLendingToken = SUPPORTED_LENDING_TOKENS.has(token.symbol);

  const lendingTokens = useEarnTokens({
    includeLendingTokens: true,
  });

  const receiptTokens = useEarnTokens({ includeReceiptTokens: true });

  if (!token?.chainId) return result;

  if (isLendingToken) {
    const relatedReceiptTokenSymbol =
      LENDING_TOKEN_TO_RECEIPT_TOKEN_MAP[token.chainId][token.symbol];
    const relatedReceiptToken = receiptTokens.find(
      (receiptToken) => receiptToken.symbol === relatedReceiptTokenSymbol,
    );

    if (!relatedReceiptToken) return result;

    result.lendingToken = getTokenWithBalanceAndApr(token);
    result.receiptToken = getTokenWithBalanceAndApr(relatedReceiptToken);

    return result;
  }

  // Find matching token for receipt token
  const relatedLendingTokenSymbol =
    RECEIPT_TOKEN_TO_LENDING_TOKEN_MAP[token.chainId][token.symbol];
  const relatedLendingToken = lendingTokens.find(
    (receiptToken) => receiptToken.symbol === relatedLendingTokenSymbol,
  );

  if (!relatedLendingToken) return result;

  result.lendingToken = getTokenWithBalanceAndApr(relatedLendingToken);
  result.receiptToken = getTokenWithBalanceAndApr(token);

  return result;
};

export default useLendingTokenPair;

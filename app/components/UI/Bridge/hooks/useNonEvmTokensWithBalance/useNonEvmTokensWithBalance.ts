import { useSelector } from 'react-redux';
import { RootState } from '../../../../../reducers';
import { selectMultichainTokenListForAccountIdAnyChain } from '../../../../../selectors/multichain';
import { useNonEvmAccountIds } from '../useNonEvmAccountIds';
import { useMemo } from 'react';

/**
 * Hook to get non-EVM tokens from all non-EVM accounts
 * @returns Combined array of tokens from all non-EVM accounts
 */
export const useNonEvmTokensWithBalance = () => {
  const nonEvmAccountIds = useNonEvmAccountIds();
  const nonEvmTokens = useSelector(
    useMemo(
      () => (state: RootState) => {
        const tokens: ReturnType<
          typeof selectMultichainTokenListForAccountIdAnyChain
        > = [];
        for (const accountId of nonEvmAccountIds) {
          const tokensForAccountId =
            selectMultichainTokenListForAccountIdAnyChain(state, accountId);
          tokens.push(...tokensForAccountId);
        }
        return tokens;
      },
      [nonEvmAccountIds],
    ),
  );

  return nonEvmTokens;
};

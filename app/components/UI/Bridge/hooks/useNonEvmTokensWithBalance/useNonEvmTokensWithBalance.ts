import { useSelector, shallowEqual } from 'react-redux';
import { RootState } from '../../../../../reducers';
import { selectMultichainTokenListForAccountAnyChain } from '../../../../../selectors/multichain';
import { useNonEvmAccounts } from '../useNonEvmAccounts';
import { useMemo } from 'react';

/**
 * Hook to get non-EVM tokens from all non-EVM accounts
 * @returns Combined array of tokens from all non-EVM accounts
 */
export const useNonEvmTokensWithBalance = (hasShallowEqual = false) => {
  const nonEvmAccounts = useNonEvmAccounts();
  const nonEvmTokens = useSelector(
    useMemo(
      () => (state: RootState) => {
        const tokens: ReturnType<
          typeof selectMultichainTokenListForAccountAnyChain
        > = [];
        for (const account of nonEvmAccounts) {
          const tokensForAccount = selectMultichainTokenListForAccountAnyChain(
            state,
            account,
          );
          tokens.push(...tokensForAccount);
        }
        return tokens;
      },
      [nonEvmAccounts],
    ),
    hasShallowEqual ? shallowEqual : undefined,
  );

  return nonEvmTokens;
};

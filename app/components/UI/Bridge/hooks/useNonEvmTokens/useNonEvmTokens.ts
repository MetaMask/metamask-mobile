import { useSelector } from 'react-redux';
import { RootState } from '../../../../../reducers';
import { selectMultichainTokenListForAccountIdAnyChain } from '../../../../../selectors/multichain';
import { useNonEvmAccountIds } from '../useNonEvmAccountIds';

/**
 * Hook to get non-EVM tokens from all non-EVM accounts
 * @returns Combined array of tokens from all non-EVM accounts
 */
export const useNonEvmTokens = () => {
  const nonEvmAccountIds = useNonEvmAccountIds();
  const nonEvmTokens = useSelector((state: RootState) => {
    const tokens: ReturnType<
      typeof selectMultichainTokenListForAccountIdAnyChain
    > = [];
    for (const accountId of nonEvmAccountIds) {
      const tokensForAccountId = selectMultichainTokenListForAccountIdAnyChain(
        state,
        accountId,
      );
      tokens.push(...tokensForAccountId);
    }
    return tokens;
  });

  return nonEvmTokens;
};

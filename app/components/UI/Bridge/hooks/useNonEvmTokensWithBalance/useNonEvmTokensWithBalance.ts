import { useSelector } from 'react-redux';
import { RootState } from '../../../../../reducers';
import { selectMultichainTokenListForAccountsAnyChain } from '../../../../../selectors/multichain';
import { useNonEvmAccounts } from '../useNonEvmAccounts';

/**
 * Hook to get non-EVM tokens from all non-EVM accounts
 * @returns Combined array of tokens from all non-EVM accounts
 */
export const useNonEvmTokensWithBalance = () => {
  const nonEvmAccounts = useNonEvmAccounts();

  const nonEvmTokens = useSelector((state: RootState) =>
    selectMultichainTokenListForAccountsAnyChain(state, nonEvmAccounts),
  );

  return nonEvmTokens;
};

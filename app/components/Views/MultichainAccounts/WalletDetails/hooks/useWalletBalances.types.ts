import { MultichainBalancesData } from '../../../../hooks/useMultichainBalances/useMultichainBalances.types';

export interface UseWalletBalancesHook {
  formattedWalletTotalBalance: string | undefined;
  multichainBalancesForAllAccounts: Record<string, MultichainBalancesData>;
}

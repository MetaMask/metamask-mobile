export interface UseWalletBalancesHook {
  formattedWalletTotalBalance: string | undefined;
  multichainBalancesForAllAccounts: Record<string, string>;
}

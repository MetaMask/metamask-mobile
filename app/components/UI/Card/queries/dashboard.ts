export const dashboardKeys = {
  all: () => ['card', 'dashboard'] as const,
  delegationSettings: () =>
    [...dashboardKeys.all(), 'delegationSettings'] as const,
  externalWalletDetails: () =>
    [...dashboardKeys.all(), 'externalWalletDetails'] as const,
  cardDetails: () => [...dashboardKeys.all(), 'cardDetails'] as const,
  kycStatus: () => [...dashboardKeys.all(), 'kycStatus'] as const,
  priorityTokenOnChain: (address: string) =>
    [...dashboardKeys.all(), 'priorityToken', 'onChain', address] as const,
  latestAllowance: (
    tokenAddress: string,
    delegationContract: string,
    walletAddress: string,
    caipChainId: string,
    decimals: number,
  ) =>
    [
      ...dashboardKeys.all(),
      'latestAllowance',
      tokenAddress,
      delegationContract,
      walletAddress,
      caipChainId,
      decimals,
    ] as const,
  registrationSettings: () =>
    [...dashboardKeys.all(), 'registrationSettings'] as const,
  registrationStatus: (onboardingId: string) =>
    [...dashboardKeys.all(), 'registrationStatus', onboardingId] as const,
  consentSet: (onboardingId: string) =>
    [...dashboardKeys.all(), 'consentSet', onboardingId] as const,
};

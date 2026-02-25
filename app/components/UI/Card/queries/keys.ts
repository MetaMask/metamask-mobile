export const cardKeys = {
  all: () => ['card'] as const,
  delegationSettings: () => [...cardKeys.all(), 'delegationSettings'] as const,
  externalWalletDetails: () =>
    [...cardKeys.all(), 'externalWalletDetails'] as const,
  cardDetails: () => [...cardKeys.all(), 'cardDetails'] as const,
  kycStatus: () => [...cardKeys.all(), 'kycStatus'] as const,
  priorityTokenOnChain: (address: string) =>
    [...cardKeys.all(), 'priorityToken', 'onChain', address] as const,
  latestAllowance: (tokenAddress: string, delegationContract: string) =>
    [
      ...cardKeys.all(),
      'latestAllowance',
      tokenAddress,
      delegationContract,
    ] as const,
  registrationSettings: () =>
    [...cardKeys.all(), 'registrationSettings'] as const,
  registrationStatus: (onboardingId: string) =>
    [...cardKeys.all(), 'registrationStatus', onboardingId] as const,
};

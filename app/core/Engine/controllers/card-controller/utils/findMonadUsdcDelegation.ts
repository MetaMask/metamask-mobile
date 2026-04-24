import type {
  DelegationSettingsNetwork,
  DelegationSettingsResponse,
} from '../../../../../components/UI/Card/types';

/**
 * Resolves Monad mainnet USDC token and delegation contract from chain config.
 */
export function findMonadUsdcDelegation(
  settings: DelegationSettingsResponse | null | undefined,
): {
  tokenAddress: string;
  delegationContract: string;
  decimals: number;
  caipChainId: string;
} | null {
  if (!settings?.networks?.length) {
    return null;
  }
  const network = settings.networks.find(
    (n: DelegationSettingsNetwork) => n.network?.toLowerCase() === 'monad',
  );
  if (!network?.delegationContract) {
    return null;
  }
  const token =
    network.tokens?.usdc ??
    network.tokens?.USDC ??
    network.tokens?.[
      Object.keys(network.tokens).find((k) => k.toLowerCase() === 'usdc') ?? ''
    ];

  if (!token?.address) {
    return null;
  }

  const caipChainId = network.chainId?.startsWith('eip155:')
    ? network.chainId
    : `eip155:${network.chainId}`;

  return {
    tokenAddress: token.address,
    delegationContract: network.delegationContract,
    decimals: token.decimals,
    caipChainId,
  };
}

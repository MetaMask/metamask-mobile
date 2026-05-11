import type { CaipChainId } from '@metamask/utils';
import { SolScope } from '@metamask/keyring-api';
import {
  CardFundingToken,
  DelegationSettingsResponse,
  FundingStatus,
} from '../../../../../components/UI/Card/types';

const MONEY_ACCOUNT_CARD_NETWORK = 'monad';
const MONEY_ACCOUNT_CARD_TOKEN_SYMBOL = 'USDC';

function getCaipChainId(
  network: DelegationSettingsResponse['networks'][0],
): CaipChainId {
  if (network.network === 'solana') {
    return SolScope.Mainnet as CaipChainId;
  }
  const chainIdStr = network.chainId;
  const numericChainId = chainIdStr.startsWith('0x')
    ? parseInt(chainIdStr, 16)
    : parseInt(chainIdStr, 10);
  return `eip155:${numericChainId}` as CaipChainId;
}

interface MoneyAccountCardRequirementsParams {
  isMoneyAccountEnabled: boolean;
  vaultConfig: unknown;
  moneyAccountAddress?: string | null;
}

export const hasMoneyAccountCardRequirements = ({
  isMoneyAccountEnabled,
  vaultConfig,
  moneyAccountAddress,
}: MoneyAccountCardRequirementsParams): boolean =>
  Boolean(isMoneyAccountEnabled && vaultConfig && moneyAccountAddress);

export const resolveMoneyAccountCardToken = (
  delegationSettings: DelegationSettingsResponse | null | undefined,
): CardFundingToken | null => {
  const network = delegationSettings?.networks?.find(
    (item) =>
      item.network?.toLowerCase() === MONEY_ACCOUNT_CARD_NETWORK &&
      item.delegationContract,
  );

  if (!network) {
    return null;
  }

  const token = Object.values(network.tokens ?? {}).find(
    (item) =>
      item.symbol?.toUpperCase() === MONEY_ACCOUNT_CARD_TOKEN_SYMBOL &&
      item.address,
  );

  if (!token) {
    return null;
  }

  return {
    address: token.address,
    symbol: MONEY_ACCOUNT_CARD_TOKEN_SYMBOL,
    name: MONEY_ACCOUNT_CARD_TOKEN_SYMBOL,
    decimals: token.decimals,
    caipChainId: getCaipChainId(network),
    walletAddress: undefined,
    fundingStatus: FundingStatus.NotEnabled,
    spendableBalance: '0',
    delegationContract: network.delegationContract,
    priority: undefined,
    stagingTokenAddress:
      network.environment !== 'production' ? token.address : undefined,
  };
};

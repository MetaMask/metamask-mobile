import {
  CardFundingToken,
  DelegationSettingsResponse,
  FundingStatus,
} from '../../../../../components/UI/Card/types';

const MONEY_ACCOUNT_CARD_NETWORK = 'monad';
const MONEY_ACCOUNT_CARD_TOKEN_SYMBOL = 'USDC';

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
    caipChainId: 'eip155:143',
    walletAddress: undefined,
    fundingStatus: FundingStatus.NotEnabled,
    spendableBalance: '0',
    delegationContract: network.delegationContract,
    priority: undefined,
    stagingTokenAddress:
      network.environment !== 'production' ? token.address : undefined,
  };
};

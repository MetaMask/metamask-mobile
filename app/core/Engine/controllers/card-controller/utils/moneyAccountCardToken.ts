import {
  CardFundingToken,
  DelegationSettingsResponse,
  FundingStatus,
} from '../types';
import { getCaipChainId, normalizeSymbol } from './buildTokenList';

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
    symbol: normalizeSymbol(token.symbol),
    name: normalizeSymbol(token.symbol),
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

import {
  CardFundingToken,
  DelegationSettingsResponse,
  FundingStatus,
} from '../../../../../components/UI/Card/types';
import {
  getVedaTokenConfig,
  isVedaToken,
  MONEY_ACCOUNT_DELEGATION_TOKEN_KEY,
  MONEY_ACCOUNT_DISPLAY_SYMBOL,
  type VedaTokenConfig,
} from '../../../../../components/UI/Card/util/vedaToken';

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
  const vedaConfig = getVedaTokenConfig(delegationSettings);
  if (!vedaConfig) {
    return null;
  }

  return {
    address: vedaConfig.address,
    symbol: MONEY_ACCOUNT_DELEGATION_TOKEN_KEY,
    name: MONEY_ACCOUNT_DELEGATION_TOKEN_KEY,
    decimals: vedaConfig.decimals,
    caipChainId: vedaConfig.caipChainId,
    walletAddress: undefined,
    fundingStatus: FundingStatus.NotEnabled,
    spendableBalance: '0',
    delegationContract: vedaConfig.delegationContract,
    priority: undefined,
    stagingTokenAddress: undefined,
    displaySymbol: MONEY_ACCOUNT_DISPLAY_SYMBOL,
  };
};

interface MoneyAccountDelegatedForCardParams {
  fundingTokens: CardFundingToken[];
  moneyAccountAddress?: string | null;
  vedaConfig: VedaTokenConfig | null;
}

export const isMoneyAccountDelegatedForCard = ({
  fundingTokens,
  moneyAccountAddress,
  vedaConfig,
}: MoneyAccountDelegatedForCardParams): boolean => {
  if (!moneyAccountAddress || !vedaConfig) {
    return false;
  }
  const target = moneyAccountAddress.toLowerCase();
  return fundingTokens.some(
    (token) =>
      token.walletAddress?.toLowerCase() === target &&
      isVedaToken(token, vedaConfig) &&
      token.fundingStatus !== FundingStatus.NotEnabled,
  );
};

export const isAnyMoneyAccountDelegatedForCard = ({
  fundingTokens,
  vedaConfig,
}: {
  fundingTokens: CardFundingToken[];
  vedaConfig: VedaTokenConfig | null;
}): boolean =>
  Boolean(vedaConfig) &&
  fundingTokens.some(
    (token) =>
      isVedaToken(token, vedaConfig) &&
      token.fundingStatus !== FundingStatus.NotEnabled,
  );

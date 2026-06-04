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

/**
 * Resolves the Veda token used as the funding target for the Money
 * Account ↔ Card delegation transaction. Reads the token directly from
 * the `tokens.veda` entry of the Monad delegation-settings network so
 * the contract address is environment-correct without any hardcoding.
 */
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

/**
 * Returns `true` when the Money Account address has a Veda funding row
 * whose allowance is not `NotEnabled`. The signal lives in
 * `cardHomeData.fundingAssets` (sourced from `/v1/wallet/external`) —
 * once Baanx indexes the on-chain approval, the wallet appears in the
 * funding list with `enabled` or `limited` status.
 */
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

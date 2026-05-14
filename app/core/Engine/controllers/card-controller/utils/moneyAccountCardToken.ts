import {
  CardFundingToken,
  DelegationSettingsResponse,
  FundingStatus,
} from '../../../../../components/UI/Card/types';

const MONEY_ACCOUNT_CARD_NETWORK = 'monad';
const MONEY_ACCOUNT_CARD_TOKEN_SYMBOL = 'USDC';
const MONEY_ACCOUNT_CARD_CAIP_CHAIN_ID = 'eip155:143';

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
    caipChainId: MONEY_ACCOUNT_CARD_CAIP_CHAIN_ID,
    walletAddress: undefined,
    fundingStatus: FundingStatus.NotEnabled,
    spendableBalance: '0',
    delegationContract: network.delegationContract,
    priority: undefined,
    stagingTokenAddress:
      network.environment !== 'production' ? token.address : undefined,
  };
};

interface MoneyAccountDelegatedForCardParams {
  fundingTokens: CardFundingToken[];
  moneyAccountAddress?: string | null;
}

/**
 * Returns `true` when the Money Account address has a card funding row on
 * Monad / USDC whose allowance is not `NotEnabled`. The signal lives in
 * `cardHomeData.fundingAssets` (sourced from `/v1/wallet/external`) because
 * CardController itself does not persist a per-address "linked" flag — once
 * the Baanx backend indexes the on-chain approval, the wallet appears in the
 * funding list with `enabled` or `limited` status.
 */
export const isMoneyAccountDelegatedForCard = ({
  fundingTokens,
  moneyAccountAddress,
}: MoneyAccountDelegatedForCardParams): boolean => {
  if (!moneyAccountAddress) {
    return false;
  }
  const target = moneyAccountAddress.toLowerCase();
  return fundingTokens.some(
    (token) =>
      token.walletAddress?.toLowerCase() === target &&
      token.caipChainId === MONEY_ACCOUNT_CARD_CAIP_CHAIN_ID &&
      token.symbol?.toUpperCase() === MONEY_ACCOUNT_CARD_TOKEN_SYMBOL &&
      token.fundingStatus !== FundingStatus.NotEnabled,
  );
};

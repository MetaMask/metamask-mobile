import type { CaipChainId } from '@metamask/utils';
import { cardNetworkInfos } from '../constants';
import {
  FundingStatus,
  type CardFundingToken,
  type CardNetwork,
  type CardWalletExternalPriorityResponse,
} from '../types';
import { isMoneyAccountEntry } from './isMoneyAccountEntry';
import {
  MONEY_ACCOUNT_DELEGATION_NETWORK,
  type VedaTokenConfig,
} from './vedaToken';

export const networkToCaipChainId = (
  network?: string,
): CaipChainId | undefined =>
  network ? cardNetworkInfos[network as CardNetwork]?.caipChainId : undefined;

export const resolveReceivingPriorityEntry = (
  priorities: CardWalletExternalPriorityResponse[],
  network?: string,
): CardWalletExternalPriorityResponse | undefined =>
  priorities
    .filter((p) => (!network || p.network === network) && p.address)
    .sort((a, b) => a.priority - b.priority)[0];

export const isMoneyAccountPriorityEntry = (
  entry: CardWalletExternalPriorityResponse | undefined,
  vedaConfig: VedaTokenConfig | null,
): boolean =>
  !!entry &&
  isMoneyAccountEntry(
    {
      caipChainId: networkToCaipChainId(entry.network),
      symbol: entry.currency,
    },
    vedaConfig,
  );

/**
 * Resolves where a redemption lands, which is not the same as the top-ranked
 * linked wallet:
 * - Monad redemptions always go to the Money Account vault wallet, so only the
 * VEDA entry qualifies — an EVM wallet that happens to rank higher on Monad
 * is not a valid destination.
 * - Solana wallets cannot receive redemptions, so a Solana-only user has none.
 */
export const resolveRedeemReceivingEntry = ({
  priorities,
  network,
  vedaConfig,
}: {
  priorities: CardWalletExternalPriorityResponse[];
  network?: string;
  vedaConfig: VedaTokenConfig | null;
}): CardWalletExternalPriorityResponse | undefined => {
  if (!network || network === 'solana') {
    return undefined;
  }

  const ranked = priorities
    .filter((entry) => entry.network === network && entry.address)
    .sort((a, b) => a.priority - b.priority);

  if (network === MONEY_ACCOUNT_DELEGATION_NETWORK) {
    return ranked.find((entry) =>
      isMoneyAccountPriorityEntry(entry, vedaConfig),
    );
  }

  return ranked[0];
};

export const hasApprovedFundingFor = (
  fundingTokens: CardFundingToken[],
  caipChainId?: CaipChainId,
  symbol?: string,
): boolean => {
  if (!caipChainId || !symbol) {
    return false;
  }
  const target = symbol.toUpperCase();
  return fundingTokens.some(
    (token) =>
      token.caipChainId === caipChainId &&
      token.symbol?.toUpperCase() === target &&
      token.fundingStatus !== FundingStatus.NotEnabled,
  );
};

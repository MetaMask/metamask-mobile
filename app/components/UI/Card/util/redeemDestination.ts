import type { CaipChainId } from '@metamask/utils';
import { cardNetworkInfos } from '../constants';
import {
  FundingStatus,
  type CardFundingToken,
  type CardNetwork,
  type CardWalletExternalPriorityResponse,
} from '../types';
import { isMoneyAccountEntry } from './isMoneyAccountEntry';
import type { VedaTokenConfig } from './vedaToken';

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

import type { Hex } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { store } from '../../../../store';
import { getTokensControllerAllTokens } from '../../../../selectors/assets/assets-migration';
import type { CardFundingToken } from '../types';
import { safeFormatChainIdToHex } from './safeFormatChainIdToHex';
import { isEvmChain } from '../constants';

export async function ensureCardFundingTokensImported(
  tokens: (CardFundingToken | null | undefined)[],
  ensureNetworkExists: (caipChainId: string) => Promise<string>,
): Promise<void> {
  const seen = new Set<string>();

  for (const token of tokens) {
    if (
      !token?.address ||
      token.decimals == null ||
      !token.symbol ||
      !token.caipChainId ||
      !isEvmChain(token.caipChainId)
    ) {
      continue;
    }

    const hexChainId = safeFormatChainIdToHex(token.caipChainId) as Hex;
    const dedupeKey = `${hexChainId}-${token.address.toLowerCase()}`;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);

    const allTokens = getTokensControllerAllTokens(store.getState());
    const accountTokens = Object.values(allTokens?.[hexChainId] ?? {}).flat();
    const alreadyTracked = accountTokens.some(
      (t) => t.address?.toLowerCase() === token.address?.toLowerCase(),
    );
    if (alreadyTracked) {
      continue;
    }

    try {
      const networkClientId = await ensureNetworkExists(token.caipChainId);
      await Engine.context.TokensController.addToken({
        address: token.address,
        decimals: token.decimals,
        name: token.name ?? token.symbol,
        symbol: token.symbol,
        networkClientId,
      });
    } catch (error) {
      Logger.error(error as Error, {
        tags: { feature: 'card' },
        context: {
          name: 'ensureCardFundingTokensImported',
          data: { chainId: hexChainId, address: token.address },
        },
      });
    }
  }
}

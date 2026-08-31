import type { Hex } from '@metamask/utils';

import Engine from '../../../../core/Engine';
import { MUSD_TOKEN, MUSD_TOKEN_ADDRESS_BY_CHAIN } from '../constants/musd';
import { getTokensControllerAllTokens } from '../../../../selectors/assets/assets-migration';
import { store } from '../../../../store';

/**
 * Ensures the mUSD token is registered in TokensController for the given chain.
 *
 * Balances and token metadata are only tracked for tokens present in the
 * registry, so first-time users would otherwise see no mUSD entry at all.
 */
export async function ensureMusdTokenRegistered({
  chainId,
  networkClientId,
}: {
  chainId: Hex;
  networkClientId: string;
}): Promise<void> {
  const musdTokenAddress = MUSD_TOKEN_ADDRESS_BY_CHAIN[chainId];
  if (!musdTokenAddress) {
    return;
  }

  const allTokens = getTokensControllerAllTokens(store.getState());
  const accountTokens = Object.values(allTokens[chainId] ?? {}).flat();
  const hasMusdToken = accountTokens.some(
    (t) => t.address.toLowerCase() === musdTokenAddress.toLowerCase(),
  );

  if (!hasMusdToken) {
    await Engine.context.TokensController.addToken({
      address: musdTokenAddress,
      decimals: MUSD_TOKEN.decimals,
      name: MUSD_TOKEN.name,
      symbol: MUSD_TOKEN.symbol,
      networkClientId,
    });
  }
}

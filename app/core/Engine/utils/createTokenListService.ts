import {
  TokenListService,
  type TokenListMap,
} from '@metamask/assets-controllers';
import type { Hex } from '@metamask/utils';
import { isTokenApiChainSupported } from '../../../util/tokenApi/supportedNetworks';

/**
 * Shared TokenListService instance that skips `/tokens/{chainId}` requests for
 * networks absent from Token API `/v2/supportedNetworks` (e.g. Sepolia).
 */
export function createTokenListService(): TokenListService {
  const inner = new TokenListService();

  return {
    async fetchTokensByChainId(chainId: Hex): Promise<TokenListMap> {
      if (!(await isTokenApiChainSupported(chainId))) {
        return {};
      }

      return inner.fetchTokensByChainId(chainId);
    },
    destroy(): void {
      inner.destroy();
    },
  } as TokenListService;
}

import { useState, useEffect } from 'react';
import { handleFetch } from '@metamask/controller-utils';
import { NameType } from '../../UI/Name/Name.types';
import { UseDisplayNameRequest } from './useDisplayName';
import { Hex } from '@metamask/utils';

export interface TokenAsset {
  assetId: string;
  decimals: number;
  iconUrl: string;
  name: string;
  symbol: string;
}

const TOKEN_API_V3_BASE_URL = 'https://tokens.api.cx.metamask.io/v3';

// Module-level cache and in-flight deduplication so multiple hook instances
// (e.g. one per address row on a confirmation screen) share a single HTTP request.
const tokenCache: Record<string, TokenAsset> = {};
const inFlight = new Map<string, Promise<TokenAsset[]>>();

export function fetchTokenAssets(assetIds: string[]): Promise<TokenAsset[]> {
  const key = assetIds.join(',');

  const existing = inFlight.get(key);
  if (existing) {
    return existing;
  }

  if (assetIds.every((id) => tokenCache[id])) {
    return Promise.resolve(assetIds.map((id) => tokenCache[id]));
  }

  const params = new URLSearchParams({
    assetIds: assetIds.join(','),
    includeIconUrl: 'true',
  });

  const promise = (async () => {
    try {
      const data: TokenAsset[] = await handleFetch(
        `${TOKEN_API_V3_BASE_URL}/assets?${params}`,
      );
      data.forEach((t) => {
        tokenCache[t.assetId] = t;
      });
      return data;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise);
  return promise;
}

export function buildAssetId(value: string, variation: Hex): string {
  return `eip155:${parseInt(variation, 16)}/erc20:${value.toLowerCase()}`;
}

export function useERC20Tokens(requests: UseDisplayNameRequest[]) {
  const [tokensByAssetId, setTokensByAssetId] = useState<
    Record<string, TokenAsset>
  >(() =>
    Object.fromEntries(
      requests
        .filter(({ type, value }) => type === NameType.EthereumAddress && value)
        .map(({ value, variation }) =>
          buildAssetId(value as string, variation as Hex),
        )
        .filter((id) => tokenCache[id])
        .map((id) => [id, tokenCache[id]]),
    ),
  );

  const assetIds = requests
    .filter(({ type, value }) => type === NameType.EthereumAddress && value)
    .map(({ value, variation }) =>
      buildAssetId(value as string, variation as Hex),
    );

  const assetIdsKey = assetIds.join(',');

  useEffect(() => {
    if (!assetIdsKey) return;

    let cancelled = false;

    (async () => {
      try {
        const data = await fetchTokenAssets(assetIdsKey.split(','));
        if (!cancelled) {
          setTokensByAssetId((prev) => ({
            ...prev,
            ...Object.fromEntries(data.map((t) => [t.assetId, t])),
          }));
        }
      } catch {
        // silently ignore fetch errors
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [assetIdsKey]);

  return requests.map(({ preferContractSymbol, type, value, variation }) => {
    if (type !== NameType.EthereumAddress || !value) {
      return undefined;
    }

    const token =
      tokensByAssetId[buildAssetId(value as string, variation as Hex)];
    const name =
      preferContractSymbol && token?.symbol ? token.symbol : token?.name;

    return {
      name,
      image: token?.iconUrl,
      symbol: token?.symbol,
      decimals: token?.decimals,
    };
  });
}

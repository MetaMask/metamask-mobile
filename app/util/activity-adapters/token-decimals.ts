/**
 * Resolves missing `decimals`/`symbol` on EVM Activity token amounts.
 *
 * The Accounts API's `valueTransfers[].amount` (and decoded local transfer
 * amounts) are always raw base units, while `decimal`/`symbol` are backend
 * enrichment that can be absent — transiently for freshly indexed
 * transactions, permanently for tokens whose `decimals()` the indexer cannot
 * read. Rendering such an amount unscaled inflates it by the token's full
 * precision and the same number reaches fiat, so decimals are backfilled from
 * on-device token metadata.
 *
 * This only ever adds metadata. Amounts that stay unscalable keep their
 * `amount` and are marked with their `assetType` so the display/fiat layer
 * (`getHumanReadableTokenAmount`) suppresses them — later enrichment passes
 * that fetch decimals from the tokens API (e.g. spending caps) can still
 * recover them.
 *
 * Mobile delta over the shared `@metamask/client-utils` mappers — upstream
 * once those expose a host-metadata hook. TMCU-1303.
 */
import {
  isCaipAssetType,
  parseCaipAssetType,
  type CaipChainId,
} from '@metamask/utils';
import { getMaybeHexChainId } from '../bridge';
import {
  mobileActivityAdapterEnvironment,
  type ActivityAdapterEnvironment,
} from './adapters/environment';
import { getKnownTokenMetadata } from './adapters/helpers';
import type { ActivityListItem, TokenAmount } from './types';

const EVM_NATIVE_DECIMALS = 18;

/** Every `TokenAmount` slot on the `ActivityItem` data union. */
const TOKEN_AMOUNT_KEYS = [
  'token',
  'paymentToken',
  'sourceToken',
  'destinationToken',
] as const;

export interface KnownToken {
  address?: string;
  symbol?: string;
  decimals?: number;
}

/** Shape of TokensController `allTokens`: chain id → account → tokens. */
export type KnownTokensByChainAndAccount = Record<
  string,
  Record<string, KnownToken[] | undefined> | undefined
>;

function isNativeTokenAmount(token: TokenAmount): boolean {
  return (
    token.assetType === 'native' ||
    Boolean(token.assetId?.includes('/slip44:')) ||
    Boolean(token.assetId?.includes('/native:'))
  );
}

/**
 * The ERC-20 contract address an amount is denominated in, or `undefined` when
 * the asset is not a fungible EVM token. NFTs are excluded: an ERC-1155 amount
 * is a token count, not base units, so it must never be rescaled.
 */
function getErc20Address(token: TokenAmount): string | undefined {
  if (
    token.assetType === 'erc721' ||
    token.assetType === 'erc1155' ||
    !token.assetId ||
    !isCaipAssetType(token.assetId)
  ) {
    return undefined;
  }

  try {
    const { assetNamespace, assetReference } = parseCaipAssetType(
      token.assetId,
    );
    return assetNamespace === 'erc20' ? assetReference : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Looks a token up in TokensController state across every account on the
 * chain — the subject account is whoever the Activity list is showing, and an
 * immutable `decimals()` is the same for all of them.
 */
function findKnownToken(
  knownTokens: KnownTokensByChainAndAccount | undefined,
  chainId: string,
  contractAddress: string,
): KnownToken | undefined {
  const hexChainId = getMaybeHexChainId(chainId)?.toLowerCase();
  if (!hexChainId || !knownTokens) {
    return undefined;
  }

  const accounts = knownTokens[hexChainId];
  if (!accounts) {
    return undefined;
  }

  const target = contractAddress.toLowerCase();
  for (const tokens of Object.values(accounts)) {
    const match = tokens?.find(
      (token) => token.address?.toLowerCase() === target,
    );
    if (match?.decimals !== undefined) {
      return match;
    }
  }

  return undefined;
}

function resolveTokenAmount(
  token: TokenAmount,
  chainId: CaipChainId,
  knownTokens: KnownTokensByChainAndAccount | undefined,
  environment: ActivityAdapterEnvironment,
): TokenAmount {
  if (token.amount === undefined) {
    return token;
  }

  if (isNativeTokenAmount(token)) {
    if (token.decimals !== undefined) {
      return token;
    }
    const nativeAsset = environment.getNativeAssetForChainId(chainId);
    return {
      ...token,
      decimals: nativeAsset?.decimals ?? EVM_NATIVE_DECIMALS,
      ...(token.symbol || !nativeAsset?.symbol
        ? {}
        : { symbol: nativeAsset.symbol }),
    };
  }

  const contractAddress = getErc20Address(token);
  if (!contractAddress) {
    return token;
  }

  const knownToken =
    findKnownToken(knownTokens, chainId, contractAddress) ??
    getKnownTokenMetadata(chainId, contractAddress, environment);

  const decimals = token.decimals ?? knownToken?.decimals;
  const symbol = token.symbol ?? knownToken?.symbol;

  // The local mapper leaves `assetType` unset, so stamp it for the amounts we
  // have positively identified as ERC-20. That is what lets the display layer
  // tell "base units of an unknown scale" apart from an already-human amount.
  const assetType = token.assetType ?? 'erc20';

  if (
    decimals === token.decimals &&
    symbol === token.symbol &&
    assetType === token.assetType
  ) {
    return token;
  }

  return {
    ...token,
    assetType,
    ...(decimals === undefined ? {} : { decimals }),
    ...(symbol ? { symbol } : {}),
  };
}

/**
 * Builds a normalizer for EVM Activity items, backed by the user's imported
 * tokens and the adapters' static token metadata.
 *
 * Only for items whose amounts are raw base units — the EVM mappers
 * (`mapApiTransaction`, `mapLocalTransaction`). Ramp and keyring items carry
 * already-human amounts and deliberately omit `decimals`, so running them
 * through this would rescale a correct amount into a wrong one.
 *
 * @param knownTokens - TokensController `allTokens`.
 * @param environment - Adapter host bindings, for native and static metadata.
 * @returns A mapper that returns the item unchanged when nothing was missing,
 * so memoized consumers keep their references.
 */
export function createActivityTokenNormalizer(
  knownTokens: KnownTokensByChainAndAccount | undefined,
  environment: ActivityAdapterEnvironment = mobileActivityAdapterEnvironment,
): (item: ActivityListItem) => ActivityListItem {
  return (item) => {
    const data = item.data as Record<string, unknown> | undefined;
    if (!data) {
      return item;
    }

    let resolvedTokens: Record<string, TokenAmount> | undefined;

    for (const key of TOKEN_AMOUNT_KEYS) {
      const token = data[key];
      if (!token || typeof token !== 'object' || !('direction' in token)) {
        continue;
      }

      const resolved = resolveTokenAmount(
        token as TokenAmount,
        item.chainId,
        knownTokens,
        environment,
      );
      if (resolved !== token) {
        resolvedTokens = { ...resolvedTokens, [key]: resolved };
      }
    }

    if (!resolvedTokens) {
      return item;
    }

    return {
      ...item,
      data: { ...data, ...resolvedTokens },
    } as ActivityListItem;
  };
}

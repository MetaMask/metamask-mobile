/**
 * Backfills missing `decimals` on activity token amounts. EVM mapper outputs
 * (`@metamask/client-utils`) carry raw base-unit amounts, and the Accounts
 * API's `decimal` enrichment can be absent — rendering the amount unscaled
 * inflates it by the token's full precision. Mobile-side normalization until
 * decimals resolution is upstreamed into the shared mappers.
 */
import { isCaipAssetType, parseCaipAssetType } from '@metamask/utils';
import type { ActivityListItem, TokenAmount } from '../types';
import {
  mobileActivityAdapterEnvironment,
  type ActivityAdapterEnvironment,
} from './environment';

const EVM_NATIVE_DECIMALS = 18;

const TOKEN_AMOUNT_KEYS = [
  'token',
  'sourceToken',
  'destinationToken',
  'paymentToken',
] as const;

function getErc20Address(assetId: TokenAmount['assetId']): string | undefined {
  if (!assetId || !isCaipAssetType(assetId)) {
    return undefined;
  }
  try {
    const { assetNamespace, assetReference } = parseCaipAssetType(assetId);
    return assetNamespace === 'erc20' ? assetReference : undefined;
  } catch {
    return undefined;
  }
}

function isNativeTokenAmount(token: TokenAmount): boolean {
  return (
    token.assetType === 'native' ||
    Boolean(token.assetId?.includes('/slip44:')) ||
    Boolean(token.assetId?.includes('/native:'))
  );
}

function resolveTokenAmountDecimals(
  token: TokenAmount,
  chainId: string,
  environment: ActivityAdapterEnvironment,
): TokenAmount {
  if (
    token.decimals !== undefined ||
    token.amount === undefined ||
    token.assetType === 'erc721' ||
    token.assetType === 'erc1155'
  ) {
    return token;
  }

  if (isNativeTokenAmount(token)) {
    return { ...token, decimals: EVM_NATIVE_DECIMALS };
  }

  const address = getErc20Address(token.assetId);
  const decimals = address
    ? environment.getKnownTokenDecimals?.(chainId, address)
    : undefined;

  if (decimals !== undefined) {
    return { ...token, decimals };
  }

  // Unknown decimals: omit the raw base-unit amount rather than render it unscaled.
  const failClosed = { ...token };
  delete failClosed.amount;
  return failClosed;
}

/**
 * Resolves missing `decimals` on an item's token amounts from the host's
 * imported/detected tokens (native defaults to 18); amounts that remain
 * unscalable are omitted so no inflated value (or fiat derived from it) is
 * rendered.
 */
export function normalizeActivityItemTokenDecimals(
  item: ActivityListItem,
  environment: ActivityAdapterEnvironment = mobileActivityAdapterEnvironment,
): ActivityListItem {
  const data = item.data as Record<string, unknown> | undefined;
  if (!data || typeof data !== 'object') {
    return item;
  }

  let changed = false;
  const updates: Partial<
    Record<(typeof TOKEN_AMOUNT_KEYS)[number], TokenAmount>
  > = {};

  for (const key of TOKEN_AMOUNT_KEYS) {
    const value = data[key];
    if (value && typeof value === 'object' && 'direction' in value) {
      const token = value as TokenAmount;
      const resolved = resolveTokenAmountDecimals(
        token,
        item.chainId,
        environment,
      );
      if (resolved !== token) {
        updates[key] = resolved;
        changed = true;
      }
    }
  }

  if (!changed) {
    return item;
  }

  return { ...item, data: { ...data, ...updates } } as ActivityListItem;
}

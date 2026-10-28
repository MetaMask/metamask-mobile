import { parseCaipAssetType, type CaipAssetType } from '@metamask/utils';
import Logger from '../../../../../../util/Logger';

const parseFailuresLogged = new Set<string>();

export const resetComparableAssetKeyLogForTests = (): void => {
  parseFailuresLogged.clear();
};

const tryParse = (assetId: string) => {
  try {
    return parseCaipAssetType(assetId as CaipAssetType);
  } catch {
    return undefined;
  }
};

/**
 * Lowercases only the namespace and asset-namespace segments.
 * Chain reference and asset reference stay byte-exact.
 */
const lowercaseNamespaceSegments = (assetId: string): string | undefined => {
  const slash = assetId.indexOf('/');
  if (slash <= 0) {
    return undefined;
  }
  const chain = assetId.slice(0, slash);
  const asset = assetId.slice(slash + 1);
  const chainColon = chain.indexOf(':');
  const assetColon = asset.indexOf(':');
  if (chainColon <= 0 || assetColon <= 0) {
    return undefined;
  }
  return `${chain.slice(0, chainColon).toLowerCase()}:${chain.slice(chainColon + 1)}/${asset.slice(0, assetColon).toLowerCase()}:${asset.slice(assetColon + 1)}`;
};

const decimalChainReference = (reference: string): string | undefined => {
  if (!reference.startsWith('0x') && !reference.startsWith('0X')) {
    return reference;
  }
  try {
    return BigInt(reference).toString(10);
  } catch {
    return undefined;
  }
};

/**
 * Replaces a hex EVM chain reference with decimal so `eip155:0x1` can be
 * parsed when the first attempt rejects it, then compared with `eip155:1`.
 */
const decimalizeEvmChainReference = (assetId: string): string | undefined => {
  const slash = assetId.indexOf('/');
  if (slash <= 0) {
    return undefined;
  }
  const chain = assetId.slice(0, slash);
  const chainColon = chain.indexOf(':');
  if (chainColon <= 0) {
    return undefined;
  }
  const namespace = chain.slice(0, chainColon);
  if (namespace.toLowerCase() !== 'eip155') {
    return undefined;
  }
  const reference = chain.slice(chainColon + 1);
  const decimal = decimalChainReference(reference);
  if (!decimal || decimal === reference) {
    return undefined;
  }
  return `${namespace}:${decimal}${assetId.slice(slash)}`;
};

const logUnparsedAssetId = (assetId: string): void => {
  if (parseFailuresLogged.has(assetId)) {
    return;
  }
  parseFailuresLogged.add(assetId);
  Logger.log(`toComparableAssetKey: unable to parse asset id ${assetId}`);
};

/**
 * Stable comparison key for a CAIP-19 asset id.
 *
 * EVM chain references collapse to decimal and addresses are lowercased.
 * Non-EVM chain and asset references stay byte-exact (base58 is case-sensitive).
 * Returns undefined when the id cannot be parsed. Failures are logged once.
 */
export const toComparableAssetKey = (assetId: string): string | undefined => {
  const namespaced = lowercaseNamespaceSegments(assetId) ?? assetId;
  const decimalized = decimalizeEvmChainReference(namespaced) ?? namespaced;
  const parsed =
    tryParse(assetId) ??
    (namespaced === assetId ? undefined : tryParse(namespaced)) ??
    (decimalized === assetId || decimalized === namespaced
      ? undefined
      : tryParse(decimalized));

  if (!parsed) {
    logUnparsedAssetId(assetId);
    return undefined;
  }

  const { chain, assetNamespace, assetReference } = parsed;
  if (chain.namespace === 'eip155') {
    const reference = decimalChainReference(chain.reference);
    if (!reference) {
      logUnparsedAssetId(assetId);
      return undefined;
    }
    return `eip155:${reference}/${assetNamespace.toLowerCase()}:${assetReference.toLowerCase()}`;
  }

  return `${chain.namespace}:${chain.reference}/${assetNamespace}:${assetReference}`;
};

export const chainIdFromComparableKey = (
  comparableKey: string,
): string | undefined => {
  const slash = comparableKey.indexOf('/');
  if (slash <= 0) {
    return undefined;
  }
  return comparableKey.slice(0, slash);
};

export const assetReferenceFromComparableKey = (
  comparableKey: string,
): string | undefined => {
  const slash = comparableKey.indexOf('/');
  if (slash <= 0) {
    return undefined;
  }
  const asset = comparableKey.slice(slash + 1);
  const colon = asset.indexOf(':');
  if (colon <= 0) {
    return undefined;
  }
  return asset.slice(colon + 1);
};

export const assetNamespaceFromComparableKey = (
  comparableKey: string,
): string | undefined => {
  const slash = comparableKey.indexOf('/');
  if (slash <= 0) {
    return undefined;
  }
  const asset = comparableKey.slice(slash + 1);
  const colon = asset.indexOf(':');
  if (colon <= 0) {
    return undefined;
  }
  return asset.slice(0, colon);
};

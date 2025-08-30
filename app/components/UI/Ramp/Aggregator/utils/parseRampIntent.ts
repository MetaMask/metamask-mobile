import {
  RampIntent,
  parseLegacyCurrencyFormat,
  parseCAIP19AssetId,
} from '../types';

export default function parseRampIntent(
  pathParams: Record<string, string | undefined>,
): RampIntent | undefined {
  const rampIntent: RampIntent = {
    address: pathParams.address,
    chainId: pathParams.chainId,
    amount: pathParams.amount,
    currency: pathParams.currency,
    assetId: pathParams.assetId,
  };

  // Handle legacy format where chainId contains assetId
  if (!rampIntent.assetId && rampIntent.chainId?.includes('/')) {
    rampIntent.assetId = rampIntent.chainId;
  }

  // Extract chainId from assetId if not already set, or if chainId contains assetId
  if (
    rampIntent.assetId &&
    (!rampIntent.chainId || rampIntent.chainId?.includes('/'))
  ) {
    const parsed = parseCAIP19AssetId(rampIntent.assetId);
    if (parsed) {
      if (parsed.namespace === 'eip155') {
        // For EVM networks, use CAIP-2 format: eip155:1
        rampIntent.chainId = `eip155:${parsed.chainId}`;
      } else {
        // For non-EVM networks, use the full CAIP format
        rampIntent.chainId = `${parsed.namespace}:${parsed.chainId}`;
      }

      // Remove address if assetId is present to avoid conflicts
      delete rampIntent.address;
    }
  }

  // Handle legacy currency format
  if (rampIntent.currency) {
    const legacyFormat = parseLegacyCurrencyFormat(rampIntent.currency);
    if (legacyFormat) {
      rampIntent.chainId = legacyFormat.chainId;
      rampIntent.address = legacyFormat.address;
      rampIntent.currency = 'usd';
    }
  }

  if (
    !rampIntent.address &&
    !rampIntent.chainId &&
    !rampIntent.amount &&
    !rampIntent.currency &&
    !rampIntent.assetId
  ) {
    return undefined;
  }

  if (rampIntent.address && !rampIntent.chainId && !rampIntent.assetId) {
    rampIntent.chainId = '1';
  }

  Object.keys(rampIntent).forEach(
    (key) =>
      rampIntent[key as keyof RampIntent] === undefined &&
      delete rampIntent[key as keyof RampIntent],
  );

  return rampIntent;
}

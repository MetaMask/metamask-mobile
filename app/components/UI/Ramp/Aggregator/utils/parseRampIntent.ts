import {
  RampIntent,
  parseLegacyCurrencyFormat,
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

  if (!rampIntent.assetId && rampIntent.chainId?.includes('/')) {
    rampIntent.assetId = rampIntent.chainId;
  }

  if (rampIntent.currency) {
    const legacyFormat = parseLegacyCurrencyFormat(rampIntent.currency);
    if (legacyFormat) {
      rampIntent.chainId = legacyFormat.chainId;
      rampIntent.address = legacyFormat.address;
      rampIntent.currency = undefined;
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

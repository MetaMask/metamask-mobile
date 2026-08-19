/**
 * Case-insensitive check whether a provider supports a given asset.
 * Provider supportedCryptoCurrencies keys are lowercase (from API),
 * but token assetIds may be checksummed (mixed case).
 */
export function providerSupportsAsset(
  provider: { supportedCryptoCurrencies?: Record<string, boolean> },
  assetId: string,
): boolean {
  const map = provider.supportedCryptoCurrencies;
  if (!map) return false;
  return map[assetId] === true || map[assetId.toLowerCase()] === true;
}

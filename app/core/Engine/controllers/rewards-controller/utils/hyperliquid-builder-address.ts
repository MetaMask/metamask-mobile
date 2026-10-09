export const DEFAULT_HYPERLIQUID_MAINNET_BUILDER_ADDRESS =
  '0xe95a5e31904e005066614247d309e00d8ad753aa';

/**
 * Returns the same mainnet builder address configured for the Perps client.
 * Core uses the default above when Mobile passes an empty override.
 */
export function getHyperliquidMainnetBuilderAddress(): string {
  return (
    process.env.MM_PERPS_HL_BUILDER_ADDRESS_MAINNET ||
    DEFAULT_HYPERLIQUID_MAINNET_BUILDER_ADDRESS
  );
}

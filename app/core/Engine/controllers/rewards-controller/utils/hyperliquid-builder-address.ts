import { BUILDER_FEE_CONFIG } from '@metamask/perps-controller';

/**
 * Returns the same mainnet builder address configured for the Perps client.
 * Core uses the controller default when Mobile passes an empty override.
 */
export function getHyperliquidMainnetBuilderAddress(): string {
  return (
    process.env.MM_PERPS_HL_BUILDER_ADDRESS_MAINNET ||
    BUILDER_FEE_CONFIG.MainnetBuilder
  );
}

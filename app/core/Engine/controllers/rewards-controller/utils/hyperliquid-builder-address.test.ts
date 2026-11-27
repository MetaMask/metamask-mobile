import { getHyperliquidMainnetBuilderAddress } from './hyperliquid-builder-address';
import { BUILDER_FEE_CONFIG } from '@metamask/perps-controller';

describe('getHyperliquidMainnetBuilderAddress', () => {
  const SAVED = process.env.MM_PERPS_HL_BUILDER_ADDRESS_MAINNET;

  afterEach(() => {
    if (SAVED === undefined) {
      delete process.env.MM_PERPS_HL_BUILDER_ADDRESS_MAINNET;
    } else {
      process.env.MM_PERPS_HL_BUILDER_ADDRESS_MAINNET = SAVED;
    }
  });

  it('returns the Core default when no override is set', () => {
    delete process.env.MM_PERPS_HL_BUILDER_ADDRESS_MAINNET;

    expect(getHyperliquidMainnetBuilderAddress()).toBe(
      BUILDER_FEE_CONFIG.MainnetBuilder,
    );
  });

  it('returns the override when one is set', () => {
    process.env.MM_PERPS_HL_BUILDER_ADDRESS_MAINNET =
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

    expect(getHyperliquidMainnetBuilderAddress()).toBe(
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );
  });
});

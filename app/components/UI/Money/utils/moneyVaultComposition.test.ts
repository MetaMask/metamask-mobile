import type { VaultCompositionComponent } from '../types/moneyVaultComposition';
import {
  formatVaultCompositionLabel,
  formatVaultCompositionProtocolName,
  getVaultCompositionPrimaryAssetSymbol,
} from './moneyVaultComposition';

const createComponent = (
  overrides: Partial<VaultCompositionComponent> = {},
): VaultCompositionComponent => ({
  component_key: 'direct_idle_musd',
  label: 'Idle mUSD',
  protocol: 'liquidity_buffer',
  assets: [{ asset_symbol: 'mUSD', amount: '1', value_usd: '1' }],
  allocation_value_usd: '1',
  allocation_fraction: '1',
  organic_supply_apy: '0',
  incentive_apr: null,
  estimated_total_annual_rate: null,
  weighted_organic_apy_contribution: '0',
  weighted_incentive_apr_contribution: null,
  campaign_ends_at: null,
  source_links: [],
  ...overrides,
});

describe('formatVaultCompositionLabel', () => {
  it('formats Aave protocol versions', () => {
    expect(
      formatVaultCompositionLabel(
        createComponent({
          protocol: 'aave_v3',
          assets: [{ asset_symbol: 'mUSD', amount: '1', value_usd: '1' }],
        }),
      ),
    ).toBe('Aave v3 · mUSD');
  });

  it('formats Morpho protocol versions', () => {
    expect(
      formatVaultCompositionLabel(
        createComponent({
          protocol: 'morpho_v2',
          assets: [{ asset_symbol: 'USDC', amount: '1', value_usd: '1' }],
        }),
      ),
    ).toBe('Morpho v2 · USDC');
  });

  it('formats liquidity buffer as cash reserve', () => {
    expect(formatVaultCompositionLabel(createComponent())).toBe(
      'Cash reserve · mUSD',
    );
  });

  it('formats new protocol identifiers dynamically', () => {
    expect(
      formatVaultCompositionLabel(
        createComponent({
          protocol: 'compound_v3' as VaultCompositionComponent['protocol'],
          assets: [{ asset_symbol: 'USDC', amount: '1', value_usd: '1' }],
        }),
      ),
    ).toBe('Compound v3 · USDC');
  });

  it('uses only the first asset', () => {
    expect(
      formatVaultCompositionLabel(
        createComponent({
          protocol: 'aave_v3',
          assets: [
            { asset_symbol: 'mUSD', amount: '1', value_usd: '1' },
            { asset_symbol: 'USDC', amount: '1', value_usd: '1' },
          ],
        }),
      ),
    ).toBe('Aave v3 · mUSD');
  });

  it('throws when the component has no asset symbol', () => {
    expect(() =>
      formatVaultCompositionLabel(createComponent({ assets: [] })),
    ).toThrow(
      'Cannot format vault composition component without an asset symbol',
    );
  });
});

describe('vault composition label helpers', () => {
  it('returns the first asset symbol', () => {
    const component = createComponent({
      assets: [
        { asset_symbol: 'mUSD', amount: '1', value_usd: '1' },
        { asset_symbol: 'USDC', amount: '1', value_usd: '1' },
      ],
    });

    const result = getVaultCompositionPrimaryAssetSymbol(component);

    expect(result).toBe('mUSD');
  });

  it('formats liquidity buffer as cash reserve', () => {
    const result = formatVaultCompositionProtocolName('liquidity_buffer');

    expect(result).toBe('Cash reserve');
  });

  it('formats protocol versions with readable casing', () => {
    const result = formatVaultCompositionProtocolName('morpho_v2');

    expect(result).toBe('Morpho v2');
  });

  it('throws when the primary asset is missing', () => {
    expect(() =>
      getVaultCompositionPrimaryAssetSymbol(createComponent({ assets: [] })),
    ).toThrow(
      'Cannot format vault composition component without an asset symbol',
    );
  });
});

import type { VaultCompositionComponent } from '../types/moneyVaultComposition';
import { formatVaultCompositionLabel } from './moneyVaultComposition';

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

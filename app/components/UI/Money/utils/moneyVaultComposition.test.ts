import { createVaultCompositionComponent } from '../__fixtures__/moneyVaultComposition';
import type { VaultCompositionComponent } from '../types/moneyVaultComposition';
import {
  formatVaultCompositionLabel,
  formatVaultCompositionProtocolName,
  getVaultCompositionBarWidth,
  getVaultCompositionPrimaryAssetSymbol,
} from './moneyVaultComposition';

describe('formatVaultCompositionLabel', () => {
  it('formats Aave protocol versions', () => {
    expect(
      formatVaultCompositionLabel(
        createVaultCompositionComponent({
          protocol: 'aave_v3',
          assets: [{ asset_symbol: 'mUSD', amount: '1', value_usd: '1' }],
        }),
      ),
    ).toBe('Aave v3 · mUSD');
  });

  it('formats Morpho protocol versions', () => {
    expect(
      formatVaultCompositionLabel(
        createVaultCompositionComponent({
          protocol: 'morpho_v2',
          assets: [{ asset_symbol: 'USDC', amount: '1', value_usd: '1' }],
        }),
      ),
    ).toBe('Morpho v2 · USDC');
  });

  it('formats liquidity buffer as cash reserve', () => {
    expect(formatVaultCompositionLabel(createVaultCompositionComponent())).toBe(
      'Cash reserve · mUSD',
    );
  });

  it('formats new protocol identifiers dynamically', () => {
    expect(
      formatVaultCompositionLabel(
        createVaultCompositionComponent({
          protocol: 'compound_v3' as VaultCompositionComponent['protocol'],
          assets: [{ asset_symbol: 'USDC', amount: '1', value_usd: '1' }],
        }),
      ),
    ).toBe('Compound v3 · USDC');
  });

  it('uses only the first asset', () => {
    expect(
      formatVaultCompositionLabel(
        createVaultCompositionComponent({
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
      formatVaultCompositionLabel(
        createVaultCompositionComponent({ assets: [] }),
      ),
    ).toThrow(
      'Cannot format vault composition component without an asset symbol',
    );
  });
});

describe('vault composition label helpers', () => {
  it('returns the first asset symbol', () => {
    const component = createVaultCompositionComponent({
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
      getVaultCompositionPrimaryAssetSymbol(
        createVaultCompositionComponent({ assets: [] }),
      ),
    ).toThrow(
      'Cannot format vault composition component without an asset symbol',
    );
  });
});

describe('getVaultCompositionBarWidth', () => {
  it('converts a valid allocation fraction to a percentage width', () => {
    expect(getVaultCompositionBarWidth('0.375')).toBe(37.5);
  });

  it.each(['not-a-decimal', 'Infinity', '-0.1', '1.1'])(
    'throws for invalid allocation fraction %s',
    (allocationFraction) => {
      expect(() => getVaultCompositionBarWidth(allocationFraction)).toThrow(
        `Cannot calculate vault composition bar width from invalid allocation fraction '${allocationFraction}'`,
      );
    },
  );
});

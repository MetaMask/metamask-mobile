import { CHAIN_IDS } from '@metamask/transaction-controller';
import { POLYGON_NATIVE_TOKEN } from '../../Bridge/constants/assets';
import { resolveOhlcvChartAssetId } from './resolveOhlcvChartAssetId';

const USDC_LOWERCASE = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';

describe('resolveOhlcvChartAssetId', () => {
  it('returns the supplied caipAssetId unchanged', () => {
    const caipAssetId = `eip155:1/erc20:${USDC_LOWERCASE}`;

    const assetId = resolveOhlcvChartAssetId({
      caipAssetId,
      address: USDC_LOWERCASE,
      chainId: '0x1',
    });

    expect(assetId).toBe(caipAssetId);
  });

  it('checksums the address when no caipAssetId is supplied', () => {
    const assetId = resolveOhlcvChartAssetId({
      address: USDC_LOWERCASE,
      chainId: '0x1',
    });

    expect(assetId).toBe(
      'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    );
  });

  it('maps the Polygon native placeholder to the chain SLIP-44 id', () => {
    const assetId = resolveOhlcvChartAssetId({
      address: POLYGON_NATIVE_TOKEN,
      chainId: CHAIN_IDS.POLYGON,
    });

    expect(assetId).toBe('eip155:137/slip44:966');
  });

  it('returns an empty string without an address or chain id', () => {
    const assetId = resolveOhlcvChartAssetId({ address: USDC_LOWERCASE });

    expect(assetId).toBe('');
  });
});

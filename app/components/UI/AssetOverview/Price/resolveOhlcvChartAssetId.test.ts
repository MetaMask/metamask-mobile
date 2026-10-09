import { formatAddressToAssetId } from '@metamask/bridge-controller';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { POLYGON_NATIVE_TOKEN } from '../../Bridge/constants/assets';
import { resolveOhlcvChartAssetId } from './resolveOhlcvChartAssetId';

const USDC_LOWERCASE = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const TRENDING_USDC_ASSET_ID =
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';

describe('resolveOhlcvChartAssetId', () => {
  it('checksums a lowercase EVM address the way the price chart does', () => {
    const assetId = resolveOhlcvChartAssetId(USDC_LOWERCASE, '0x1');

    expect(assetId).toBe(formatAddressToAssetId(USDC_LOWERCASE, '0x1'));
    expect(assetId).not.toBe(TRENDING_USDC_ASSET_ID);
  });

  it('returns a CAIP address unchanged', () => {
    const caipAddress =
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

    const assetId = resolveOhlcvChartAssetId(
      caipAddress,
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    );

    expect(assetId).toBe(caipAddress);
  });

  it('maps Polygon native placeholder to the chain SLIP-44 id', () => {
    const assetId = resolveOhlcvChartAssetId(
      POLYGON_NATIVE_TOKEN,
      CHAIN_IDS.POLYGON,
    );

    expect(assetId).toBe('eip155:137/slip44:966');
  });

  it('returns an empty string when the address or chain id is missing', () => {
    expect(resolveOhlcvChartAssetId(undefined, '0x1')).toBe('');
    expect(resolveOhlcvChartAssetId(USDC_LOWERCASE, undefined)).toBe('');
  });
});

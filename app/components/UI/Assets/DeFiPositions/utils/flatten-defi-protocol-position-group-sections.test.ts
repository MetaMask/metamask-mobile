import type { DeFiUnderlyingPosition } from '@metamask/assets-controllers';
import { flattenDefiProtocolPositionGroupSections } from './flatten-defi-protocol-position-group-sections';
import { mapDefiProtocolDetailsPositionV2ToToken } from './map-defi-protocol-details-position-v2';

const makePosition = (
  overrides: Partial<DeFiUnderlyingPosition>,
): DeFiUnderlyingPosition => ({
  assetId: 'eip155:1/erc20:0x1111111111111111111111111111111111111111',
  chainId: 'eip155:1',
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  balance: '100',
  marketValue: 100,
  positionType: 'deposit',
  poolAddress: '0xpool1',
  groupId: 'g1',
  tokenImage: 'https://example.com/usdc.png',
  ...overrides,
});

describe('flattenDefiProtocolPositionGroupSections', () => {
  it('interleaves section headers, token rows, and separators', () => {
    const first = makePosition({ groupId: 'g1', symbol: 'USDC' });
    const second = makePosition({
      groupId: 'g2',
      symbol: 'stETH',
      assetId: 'eip155:1/erc20:0x2222222222222222222222222222222222222222',
      poolAddress: '0xpool2',
      positionType: 'staked',
    });

    const items = flattenDefiProtocolPositionGroupSections([
      { productName: 'Market', positions: [first] },
      { productName: 'Staking', positions: [second] },
    ]);

    expect(items.map((item) => item.type)).toEqual([
      'header',
      'token',
      'separator',
      'header',
      'token',
    ]);
    expect(items[0]).toMatchObject({
      type: 'header',
      key: 'header-0-Market',
      productName: 'Market',
    });
    expect(items[1]).toMatchObject({
      type: 'token',
      key: mapDefiProtocolDetailsPositionV2ToToken(first).key,
    });
    expect(items[2]).toMatchObject({
      type: 'separator',
      key: 'separator-0-Market',
    });
    expect(items[3]).toMatchObject({
      type: 'header',
      productName: 'Staking',
    });
  });

  it('emits a token row per position in the same section', () => {
    const first = makePosition({ groupId: 'g1' });
    const second = makePosition({
      groupId: 'g2',
      symbol: 'DAI',
      assetId: 'eip155:1/erc20:0x3333333333333333333333333333333333333333',
    });

    const items = flattenDefiProtocolPositionGroupSections([
      { productName: 'Market', positions: [first, second] },
    ]);

    expect(items.map((item) => item.type)).toEqual([
      'header',
      'token',
      'token',
    ]);
  });

  it('omits a trailing separator after the last section', () => {
    const items = flattenDefiProtocolPositionGroupSections([
      { productName: 'Only', positions: [makePosition({})] },
    ]);

    expect(items.some((item) => item.type === 'separator')).toBe(false);
  });
});

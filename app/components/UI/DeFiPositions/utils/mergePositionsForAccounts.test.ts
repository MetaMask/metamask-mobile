import type {
  DeFiPositionDetailsSection,
  DeFiProtocolPositionGroup,
} from '@metamask/assets-controllers';
import {
  mergePositionsForAccounts,
  mergeSections,
} from './mergePositionsForAccounts';

const makeGroup = (
  overrides: Partial<DeFiProtocolPositionGroup> &
    Pick<DeFiProtocolPositionGroup, 'protocolId' | 'chainId'>,
): DeFiProtocolPositionGroup => ({
  productName: overrides.protocolId,
  protocolIconUrl: 'https://example.com/icon.png',
  marketValue: 0,
  iconGroup: [],
  sections: [],
  ...overrides,
});

describe('mergeSections', () => {
  it('appends positions when productName matches', () => {
    const existing: DeFiPositionDetailsSection[] = [
      {
        productName: 'Lending',
        positions: [
          {
            assetId: 'eip155:1/erc20:0xa',
            chainId: 'eip155:1',
            symbol: 'A',
            name: 'Token A',
            decimals: 18,
            balance: '1',
            marketValue: 1,
            positionType: 'supply',
            poolAddress: '0xpool',
            groupId: 'g1',
          },
        ],
      },
    ];
    const incoming: DeFiPositionDetailsSection[] = [
      {
        productName: 'Lending',
        positions: [
          {
            assetId: 'eip155:1/erc20:0xb',
            chainId: 'eip155:1',
            symbol: 'B',
            name: 'Token B',
            decimals: 18,
            balance: '2',
            marketValue: 2,
            positionType: 'supply',
            poolAddress: '0xpool',
            groupId: 'g2',
          },
        ],
      },
    ];

    const result = mergeSections(existing, incoming);

    expect(result).toHaveLength(1);
    expect(result[0].productName).toBe('Lending');
    expect(result[0].positions).toHaveLength(2);
    expect(result[0].positions.map((p) => p.symbol)).toEqual(['A', 'B']);
  });

  it('keeps distinct productName sections separate', () => {
    const existing: DeFiPositionDetailsSection[] = [
      { productName: 'Lending', positions: [] },
    ];
    const incoming: DeFiPositionDetailsSection[] = [
      { productName: 'Staking', positions: [] },
    ];

    const result = mergeSections(existing, incoming);

    expect(result.map((s) => s.productName)).toEqual(['Lending', 'Staking']);
  });
});

describe('mergePositionsForAccounts', () => {
  it('merges groups with the same chainId and protocolId across accounts', () => {
    const groupA = makeGroup({
      protocolId: 'aave',
      chainId: 'eip155:1',
      marketValue: 100,
      iconGroup: [{ symbol: 'USDC', avatarValue: 'usdc.png' }],
      sections: [{ productName: 'Lending', positions: [] }],
    });
    const groupB = makeGroup({
      protocolId: 'aave',
      chainId: 'eip155:1',
      marketValue: 50,
      iconGroup: [
        { symbol: 'USDC', avatarValue: 'usdc.png' },
        { symbol: 'ETH', avatarValue: 'eth.png' },
      ],
      sections: [
        {
          productName: 'Lending',
          positions: [
            {
              assetId: 'eip155:1/erc20:0xa',
              chainId: 'eip155:1',
              symbol: 'A',
              name: 'Token A',
              decimals: 18,
              balance: '1',
              marketValue: 1,
              positionType: 'supply',
              poolAddress: '0xpool',
              groupId: 'g1',
            },
          ],
        },
      ],
    });

    const result = mergePositionsForAccounts(
      {
        'account-1': [groupA],
        'account-2': [groupB],
      },
      ['account-1', 'account-2'],
    );

    expect(result).toHaveLength(1);
    expect(result[0].marketValue).toBe(150);
    expect(result[0].iconGroup.map((i) => i.symbol)).toEqual(['USDC', 'ETH']);
    expect(result[0].sections[0].positions).toHaveLength(1);
  });

  it('keeps groups on different chains separate', () => {
    const result = mergePositionsForAccounts(
      {
        'account-1': [
          makeGroup({
            protocolId: 'aave',
            chainId: 'eip155:1',
            marketValue: 10,
          }),
          makeGroup({
            protocolId: 'aave',
            chainId: 'eip155:137',
            marketValue: 20,
          }),
        ],
      },
      ['account-1'],
    );

    expect(result).toHaveLength(2);
    expect(result.map((g) => g.chainId)).toEqual(['eip155:1', 'eip155:137']);
  });

  it('does not mutate the original Redux objects', () => {
    const original = makeGroup({
      protocolId: 'aave',
      chainId: 'eip155:1',
      marketValue: 10,
      iconGroup: [{ symbol: 'USDC' }],
    });
    const positionsByAccount = { 'account-1': [original] };

    const result = mergePositionsForAccounts(positionsByAccount, ['account-1']);
    result[0].marketValue = 999;
    result[0].iconGroup.push({ symbol: 'ETH' });

    expect(original.marketValue).toBe(10);
    expect(original.iconGroup).toHaveLength(1);
  });

  it('skips account IDs with no positions', () => {
    const result = mergePositionsForAccounts(
      {
        'account-1': [
          makeGroup({
            protocolId: 'aave',
            chainId: 'eip155:1',
            marketValue: 5,
          }),
        ],
      },
      ['account-1', 'account-missing'],
    );

    expect(result).toHaveLength(1);
    expect(result[0].marketValue).toBe(5);
  });
});

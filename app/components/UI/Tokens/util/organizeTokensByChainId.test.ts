import { TokenI } from '../types';
import { organizeTokensByChainId } from './organizeTokensByChainId';

describe('organizeTokensByChainId', () => {
  const mockTokens: TokenI[] = [
    {
      address: '0x1',
      chainId: '0x1',
      name: 'Token1',
      symbol: 'TK1',
      decimals: 18,
      balance: '100',
      balanceFiat: '1000',
      image: 'image1.png',
      aggregators: ['agg1'],
      logo: 'logo1.png',
      isETH: false,
    },
    {
      address: '0x2',
      chainId: '0x1',
      name: 'Token2',
      symbol: 'TK2',
      decimals: 18,
      balance: '200',
      balanceFiat: '2000',
      image: 'image2.png',
      aggregators: ['agg2'],
      logo: 'logo2.png',
      isETH: false,
    },
    {
      address: '0x3',
      chainId: '0x89',
      name: 'Token3',
      symbol: 'TK3',
      decimals: 18,
      balance: '300',
      balanceFiat: '3000',
      image: 'image3.png',
      aggregators: ['agg3'],
      logo: 'logo3.png',
      isETH: false,
    },
  ];

  it('should organize tokens by chainId', () => {
    const result = organizeTokensByChainId(mockTokens);

    expect(Object.keys(result)).toHaveLength(2);
    expect(result['0x1']).toHaveLength(2);
    expect(result['0x89']).toHaveLength(1);

    expect(result['0x1'][0].name).toBe('Token1');
    expect(result['0x1'][1].name).toBe('Token2');
    expect(result['0x89'][0].name).toBe('Token3');
  });

  it('should handle empty array', () => {
    const result = organizeTokensByChainId([]);

    expect(result).toEqual({});
  });

  it('should skip tokens without chainId', () => {
    const tokensWithMissingChainId: TokenI[] = [
      {
        address: '0x1',
        name: 'Token1',
        symbol: 'TK1',
        decimals: 18,
        balance: '100',
        balanceFiat: '1000',
        image: 'image1.png',
        aggregators: ['agg1'],
        logo: 'logo1.png',
        isETH: false,
      },
      ...mockTokens,
    ];

    const result = organizeTokensByChainId(tokensWithMissingChainId);

    expect(Object.keys(result)).toHaveLength(2);
    expect(result['0x1']).toHaveLength(2);
    expect(result['0x89']).toHaveLength(1);
  });

  it('should maintain token properties', () => {
    const result = organizeTokensByChainId(mockTokens);
    const firstToken = result['0x1'][0];

    expect(firstToken).toEqual(mockTokens[0]);
  });

  it('should handle array with single token', () => {
    const singleToken = [mockTokens[0]];
    const result = organizeTokensByChainId(singleToken);

    expect(Object.keys(result)).toHaveLength(1);
    expect(result['0x1']).toHaveLength(1);
    expect(result['0x1'][0]).toEqual(singleToken[0]);
  });
});

import { CaipAssetType } from '@metamask/utils';
import { getCaipAssetIdForToken } from '../../Tokens/util/getCaipAssetIdForToken';
import { TokenI } from '../../Tokens/types';
import resolveBuyAssetId from './resolveBuyAssetId';

jest.mock('../../Tokens/util/getCaipAssetIdForToken', () => ({
  getCaipAssetIdForToken: jest.fn(),
}));

const mockGetCaipAssetIdForToken = jest.mocked(getCaipAssetIdForToken);

const createToken = (overrides: Partial<TokenI> = {}): TokenI =>
  ({
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
    chainId: '0x1',
    symbol: 'DAI',
    decimals: 18,
    name: 'Dai Stablecoin',
    image: 'https://example.com/dai.png',
    isETH: false,
    isNative: false,
    ...overrides,
  }) as TokenI;

describe('resolveBuyAssetId', () => {
  beforeEach(() => {
    mockGetCaipAssetIdForToken.mockReset();
  });

  it('returns explicit caipAssetId when it is a valid CAIP asset type', async () => {
    const caipAssetId = 'eip155:137/slip44:966' as CaipAssetType;
    mockGetCaipAssetIdForToken.mockResolvedValue('eip155:1/slip44:60');

    const result = await resolveBuyAssetId({
      ...createToken(),
      caipAssetId,
    });

    expect(result).toBe(caipAssetId);
    expect(mockGetCaipAssetIdForToken).not.toHaveBeenCalled();
  });

  it('uses token address when getCaipAssetIdForToken returns null and address is CAIP', async () => {
    const caipAddress = 'eip155:1/erc20:0xabc' as CaipAssetType;
    mockGetCaipAssetIdForToken.mockResolvedValue(null);

    const result = await resolveBuyAssetId({
      ...createToken({ address: caipAddress }),
    });

    expect(result).toBe(caipAddress);
  });

  it('falls back to parseRampIntent when getCaipAssetIdForToken returns null', async () => {
    mockGetCaipAssetIdForToken.mockResolvedValue(null);

    const result = await resolveBuyAssetId(createToken());

    expect(result).toBe(
      'eip155:1/erc20:0x6B175474E89094C44Da98b954EedeAC495271d0F',
    );
  });

  it('returns undefined when resolution throws', async () => {
    mockGetCaipAssetIdForToken.mockRejectedValue(
      new Error('resolution failed'),
    );

    const result = await resolveBuyAssetId(createToken());

    expect(result).toBeUndefined();
  });
});

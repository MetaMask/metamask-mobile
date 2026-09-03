import { TokenListService } from '@metamask/assets-controllers';
import { createTokenListService } from './createTokenListService';
import { isTokenApiChainSupported } from '../../../util/tokenApi/supportedNetworks';

jest.mock('@metamask/assets-controllers', () => ({
  TokenListService: jest.fn(),
}));

jest.mock('../../../util/tokenApi/supportedNetworks', () => ({
  isTokenApiChainSupported: jest.fn(),
}));

const MockTokenListService = TokenListService as jest.MockedClass<
  typeof TokenListService
>;
const mockIsTokenApiChainSupported = jest.mocked(isTokenApiChainSupported);

describe('createTokenListService', () => {
  const fetchTokensByChainId = jest.fn();
  const destroy = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    MockTokenListService.mockImplementation(
      () =>
        ({
          fetchTokensByChainId,
          destroy,
        }) as unknown as TokenListService,
    );
  });

  it('returns an empty map without calling the inner service for unsupported chains', async () => {
    mockIsTokenApiChainSupported.mockResolvedValue(false);
    const service = createTokenListService();

    const result = await service.fetchTokensByChainId('0xaa36a7');

    expect(result).toEqual({});
    expect(fetchTokensByChainId).not.toHaveBeenCalled();
  });

  it('delegates to the inner service for supported chains', async () => {
    mockIsTokenApiChainSupported.mockResolvedValue(true);
    const tokenListMap = { '0xabc': { symbol: 'TST' } };
    fetchTokensByChainId.mockResolvedValue(tokenListMap);
    const service = createTokenListService();

    const result = await service.fetchTokensByChainId('0x1');

    expect(result).toBe(tokenListMap);
    expect(fetchTokensByChainId).toHaveBeenCalledWith('0x1');
  });

  it('forwards destroy to the inner service', () => {
    const service = createTokenListService();

    service.destroy();

    expect(destroy).toHaveBeenCalledTimes(1);
  });
});

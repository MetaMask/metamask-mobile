import { Messenger } from '@metamask/messenger';
import {
  fetchSentinelFeeTokens,
  type SentinelFeeTokensByChain,
} from '../api/sentinelFeeTokens';
import {
  SentinelFeeTokensDataService,
  type SentinelFeeTokensDataServiceMessenger,
} from './SentinelFeeTokensDataService';

jest.mock('../api/sentinelFeeTokens', () => ({
  fetchSentinelFeeTokens: jest.fn(),
}));

jest.mock('../../../../selectors/bridge/featureFlags', () => ({
  selectSentinelFeeTokensCacheTtlMs: jest.fn(() => 900_000),
}));

const mockFetchSentinelFeeTokens = jest.mocked(fetchSentinelFeeTokens);
const SENTINEL_TOKENS: SentinelFeeTokensByChain = {
  'eip155:1': [
    {
      assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      symbol: 'DUM8',
    },
  ],
};

function createService(): SentinelFeeTokensDataService {
  const messenger: SentinelFeeTokensDataServiceMessenger = new Messenger({
    namespace: 'SentinelFeeTokensDataService',
  });

  return new SentinelFeeTokensDataService({ messenger });
}

describe('SentinelFeeTokensDataService', () => {
  const services: SentinelFeeTokensDataService[] = [];
  let now: number;
  let dateNowSpy: jest.SpyInstance;

  beforeEach(() => {
    now = 1_000_000;
    dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => now);
    mockFetchSentinelFeeTokens.mockResolvedValue(SENTINEL_TOKENS);
  });

  afterEach(() => {
    services.splice(0).forEach((service) => service.destroy());
    dateNowSpy.mockRestore();
    jest.clearAllMocks();
  });

  function buildService(): SentinelFeeTokensDataService {
    const service = createService();
    services.push(service);
    return service;
  }

  it('returns normalized tokens from the transport', async () => {
    const service = buildService();

    const result = await service.getSentinelFeeTokens();

    expect(result).toStrictEqual(SENTINEL_TOKENS);
  });

  it('reuses the cached response within the default TTL', async () => {
    const service = buildService();

    await service.getSentinelFeeTokens();
    now += 60_000;
    await service.getSentinelFeeTokens();

    expect(mockFetchSentinelFeeTokens).toHaveBeenCalledTimes(1);
  });

  it('refetches on the first read after the default TTL', async () => {
    const service = buildService();

    await service.getSentinelFeeTokens();
    now += 15 * 60 * 1000 + 1;
    await service.getSentinelFeeTokens();

    expect(mockFetchSentinelFeeTokens).toHaveBeenCalledTimes(2);
  });

  it('deduplicates concurrent reads', async () => {
    let resolveFetch: (value: SentinelFeeTokensByChain) => void = () =>
      undefined;
    mockFetchSentinelFeeTokens.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );
    const service = buildService();

    const firstRead = service.getSentinelFeeTokens();
    const secondRead = service.getSentinelFeeTokens();
    resolveFetch(SENTINEL_TOKENS);
    await Promise.all([firstRead, secondRead]);

    expect(mockFetchSentinelFeeTokens).toHaveBeenCalledTimes(1);
  });

  it('propagates a cold transport failure', async () => {
    mockFetchSentinelFeeTokens.mockRejectedValue(
      new Error('Sentinel unavailable'),
    );
    const service = buildService();

    await expect(service.getSentinelFeeTokens()).rejects.toThrow(
      'Sentinel unavailable',
    );
  });

  it('returns the stale response when a refresh fails', async () => {
    const service = buildService();
    await service.getSentinelFeeTokens();
    now += 15 * 60 * 1000 + 1;
    mockFetchSentinelFeeTokens.mockRejectedValue(
      new Error('Sentinel unavailable'),
    );

    const result = await service.getSentinelFeeTokens();

    expect(result).toStrictEqual(SENTINEL_TOKENS);
    expect(mockFetchSentinelFeeTokens.mock.calls.length).toBeGreaterThan(1);
  });
});

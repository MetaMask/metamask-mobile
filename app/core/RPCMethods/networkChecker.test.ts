import checkSafeNetwork from './networkChecker.util';
import { BannerAlertSeverity } from '../../component-library/components/Banners/Banner';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('checkSafeNetwork', () => {
  afterEach(() => {
    mockedAxios.get.mockRestore();
  });

  it('should return an error if the chainId is not recognized', async () => {
    mockedAxios.get.mockImplementation(() => Promise.resolve({ data: [] }));
    const alerts = await checkSafeNetwork(
      '999',
      'http://localhost:8545',
      'Test',
      'ETH',
    );

    expect(alerts).toEqual([
      {
        alertError:
          "We don't recognize this network. Be sure the chain ID is correct before you continue.",
        alertSeverity: BannerAlertSeverity.Error,
        alertOrigin: 'unknown_chain',
      },
    ]);
  });

  it('should return an error if the rpcUrl is not matched', async () => {
    mockedAxios.get.mockImplementation(() =>
      Promise.resolve({
        data: [
          {
            chainId: '999',
            rpc: ['http://localhost:8545'],
            name: 'Test',
            nativeCurrency: {
              symbol: 'ETH',
              decimals: 18,
            },
          },
        ],
      }),
    );

    const alerts = await checkSafeNetwork(
      '999',
      'http://localhost:8546',
      'Test',
      'ETH',
    );
    expect(alerts).toEqual([
      {
        alertError:
          "This network URL doesn't match a known provider for this chain ID.",
        alertSeverity: BannerAlertSeverity.Error,
        alertOrigin: 'rpc_url',
      },
    ]);
  });

  it('should not return an error if the rpcUrl is not matched but its infura', async () => {
    mockedAxios.get.mockImplementation(() =>
      Promise.resolve({
        data: [
          {
            chainId: '137',
            rpc: ['http://localhost:8545'],
            name: 'Test',
            nativeCurrency: {
              symbol: 'MATIC',
              decimals: 18,
            },
          },
        ],
      }),
    );

    const alerts = await checkSafeNetwork(
      '137',
      'https://polygon-mainnet.infura.io/v3/test',
      'Test',
      'MATIC',
    );
    expect(alerts).toEqual([]);
  });

  it('should return a warning if the decimals is not matched', async () => {
    mockedAxios.get.mockImplementation(() =>
      Promise.resolve({
        data: [
          {
            chainId: '999',
            rpc: ['http://localhost:8545'],
            name: 'Test',
            nativeCurrency: {
              symbol: 'ETH',
              decimals: 8,
            },
          },
        ],
      }),
    );

    const alerts = await checkSafeNetwork(
      '999',
      'http://localhost:8545',
      'Test',
      'ETH',
    );
    expect(alerts).toEqual([
      {
        alertError:
          "It looks like this network's decimal doesn't match its chain ID.",
        alertSeverity: BannerAlertSeverity.Warning,
        alertOrigin: 'decimals',
      },
    ]);
  });

  it('should return a warning if the name is not matched', async () => {
    mockedAxios.get.mockImplementation(() =>
      Promise.resolve({
        data: [
          {
            chainId: '999',
            rpc: ['http://localhost:8545'],
            name: 'Test1',
            nativeCurrency: {
              symbol: 'ETH',
              decimals: 18,
            },
          },
        ],
      }),
    );

    const alerts = await checkSafeNetwork(
      '999',
      'http://localhost:8545',
      'Test',
      'ETH',
    );
    expect(alerts).toEqual([
      {
        alertError:
          "It looks like this network's display name doesn't match its chain ID.",
        alertSeverity: BannerAlertSeverity.Warning,
        alertOrigin: 'chain_name',
      },
    ]);
  });

  it('should return a warning if the symbol is not matched', async () => {
    mockedAxios.get.mockImplementation(() =>
      Promise.resolve({
        data: [
          {
            chainId: '999',
            rpc: ['http://localhost:8545'],
            name: 'Test',
            nativeCurrency: {
              symbol: 'TST',
              decimals: 18,
            },
          },
        ],
      }),
    );

    const alerts = await checkSafeNetwork(
      '999',
      'http://localhost:8545',
      'Test',
      'ETH',
    );
    expect(alerts).toEqual([
      {
        alertError:
          "It looks like this network's symbol doesn't match this chain ID.",
        alertSeverity: BannerAlertSeverity.Warning,
        alertOrigin: 'chain_ticker',
      },
    ]);
  });

  it('should not return an error if the chainId is recognized', async () => {
    mockedAxios.get.mockImplementation(() =>
      Promise.resolve({
        data: [
          {
            chainId: '999',
            rpc: ['http://localhost:8545'],
            name: 'Test',
            nativeCurrency: {
              symbol: 'ETH',
              decimals: 18,
            },
          },
        ],
      }),
    );

    const alerts = await checkSafeNetwork(
      '999',
      'http://localhost:8545',
      'Test',
      'ETH',
    );
    expect(alerts).toEqual([]);
  });

  it('should not return warning name/symbol if it match with popular network', async () => {
    mockedAxios.get.mockImplementation(() =>
      Promise.resolve({
        data: [
          {
            chainId: '10',
            rpc: ['https://optimism-mainnet.infura.io/v3/1234'],
            name: 'Optimism',
            nativeCurrency: {
              symbol: 'ETH',
              decimals: 18,
            },
          },
        ],
      }),
    );

    const alerts = await checkSafeNetwork(
      '10',
      'https://optimism-mainnet.infura.io/v3/1234',
      'Optimism',
      'ETH',
    );
    expect(alerts).toEqual([]);
  });
  it('should return warning name/symbol if it doesnt match with popular network and third part provider', async () => {
    mockedAxios.get.mockImplementation(() =>
      Promise.resolve({
        data: [
          {
            chainId: '10',
            rpc: ['https://optimism-mainnet.infura.io/v3/1234'],
            name: 'Optimism',
            nativeCurrency: {
              symbol: 'ETH',
              decimals: 18,
            },
          },
        ],
      }),
    );

    const alerts = await checkSafeNetwork(
      '10',
      'https://optimism-mainnet.infura.io/v3/1234',
      'Optimism test',
      'OP',
    );
    expect(alerts).toEqual([
      {
        alertError:
          "It looks like this network's display name doesn't match its chain ID.",
        alertSeverity: BannerAlertSeverity.Warning,
        alertOrigin: 'chain_name',
      },
      {
        alertError:
          "It looks like this network's symbol doesn't match this chain ID.",
        alertSeverity: BannerAlertSeverity.Warning,
        alertOrigin: 'chain_ticker',
      },
    ]);
  });

  it('should not throw an error if nickname is undefined for findPopularNetworkName', async () => {
    mockedAxios.get.mockImplementation(() =>
      Promise.resolve({
        data: [
          {
            chainId: '10',
            rpc: ['https://optimism-mainnet.infura.io/v3/1234'],
            name: 'Optimism',
            nativeCurrency: {
              symbol: 'ETH',
              decimals: 18,
            },
          },
        ],
      }),
    );

    const result = await checkSafeNetwork(
      '10',
      'https://optimism-mainnet.infura.io/v3/1234',
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      undefined as any,
      'ETH',
    );
    expect(result).toEqual([
      {
        alertError:
          "It looks like this network's display name doesn't match its chain ID.",
        alertSeverity: BannerAlertSeverity.Warning,
        alertOrigin: 'chain_name',
      },
    ]);
  });
});

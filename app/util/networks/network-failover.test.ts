import { ChainId, toHex } from '@metamask/controller-utils';
import {
  getFailoverUrlsByChainId,
  getFailoverUrlsForChainId,
  getIsQuicknodeEndpointUrl,
} from './network-failover';

describe('getFailoverUrlsForChainId', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });
  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('returns the QuickNode failover url for a mapped chain when the env is set', () => {
    process.env.QUICKNODE_BSC_URL = 'https://failover.example/bsc';
    expect(getFailoverUrlsForChainId(ChainId['bsc-mainnet'])).toStrictEqual([
      'https://failover.example/bsc',
    ]);
  });

  it('returns an empty array for a mapped chain when the env is unset', () => {
    delete process.env.QUICKNODE_MEGAETH_URL;
    expect(getFailoverUrlsForChainId(ChainId['megaeth-mainnet'])).toStrictEqual(
      [],
    );
  });

  it('returns an empty array for a chain that has no mapped failover', () => {
    // Sepolia is not in the failover map.
    expect(getFailoverUrlsForChainId(ChainId.sepolia)).toStrictEqual([]);
  });
});

describe('getFailoverUrlsByChainId', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });
  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('includes every chain that has a mapped QuickNode failover', () => {
    const failoverUrlsByChainId = getFailoverUrlsByChainId();
    const mappedChainIds = [
      ChainId.mainnet,
      ChainId['linea-mainnet'],
      ChainId['arbitrum-mainnet'],
      ChainId['avalanche-mainnet'],
      ChainId['optimism-mainnet'],
      ChainId['polygon-mainnet'],
      ChainId['base-mainnet'],
      ChainId['bsc-mainnet'],
      ChainId['zksync-mainnet'],
      ChainId['megaeth-mainnet'],
      ChainId['sei-mainnet'],
      ChainId['monad-mainnet'],
      toHex(999), // HyperEVM
      toHex(5042), // Arc
      toHex(4663), // Robinhood
    ];
    expect(Object.keys(failoverUrlsByChainId).sort()).toStrictEqual(
      [...mappedChainIds].sort(),
    );
  });

  it('resolves a mapped chain to its QuickNode failover url from env', () => {
    process.env.QUICKNODE_BSC_URL = 'https://failover.example/bsc';
    expect(getFailoverUrlsByChainId()[ChainId['bsc-mainnet']]).toStrictEqual([
      'https://failover.example/bsc',
    ]);
  });
});

describe('getIsQuicknodeEndpointUrl', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });
  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('returns true for a known Quicknode URL', () => {
    process.env.QUICKNODE_MAINNET_URL = 'https://mainnet.quiknode.pro/test';
    expect(getIsQuicknodeEndpointUrl('https://mainnet.quiknode.pro/test')).toBe(
      true,
    );
  });

  it('returns false for unknown URLs', () => {
    expect(getIsQuicknodeEndpointUrl('https://unknown.example.com')).toBe(
      false,
    );
  });

  it('returns false for an empty URL', () => {
    expect(getIsQuicknodeEndpointUrl('')).toBe(false);
  });
});

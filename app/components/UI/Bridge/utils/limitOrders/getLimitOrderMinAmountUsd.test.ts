import { getLimitOrderMinAmountUsd } from './getLimitOrderMinAmountUsd';

const mockChainConfig: Record<string, { minAmountUSD: number } | undefined> =
  {};

jest.mock('../../constants/limitOrders', () => ({
  ...jest.requireActual('../../constants/limitOrders'),
  get LIMIT_ORDERS_CHAIN_CONFIG() {
    return mockChainConfig;
  },
}));

const setChainConfig = (
  config: Record<string, { minAmountUSD: number } | undefined>,
) => {
  Object.keys(mockChainConfig).forEach((key) => delete mockChainConfig[key]);
  Object.assign(mockChainConfig, config);
};

describe('getLimitOrderMinAmountUsd', () => {
  beforeEach(() => {
    setChainConfig({
      'eip155:1': { minAmountUSD: 50 },
      '*': { minAmountUSD: 1 },
    });
  });

  it('returns the minimum configured for a CAIP-2 chain ID', () => {
    const result = getLimitOrderMinAmountUsd('eip155:1');

    expect(result).toBe(50);
  });

  it('returns the minimum configured for the CAIP-2 form of a hex chain ID', () => {
    const result = getLimitOrderMinAmountUsd('0x1');

    expect(result).toBe(50);
  });

  it('falls back to the wildcard minimum for a chain without its own entry', () => {
    const result = getLimitOrderMinAmountUsd('eip155:8453');

    expect(result).toBe(1);
  });

  it('falls back to the wildcard minimum without a chain ID', () => {
    const result = getLimitOrderMinAmountUsd(undefined);

    expect(result).toBe(1);
  });

  it('returns undefined when neither the chain nor the wildcard is configured', () => {
    setChainConfig({ 'eip155:1': { minAmountUSD: 50 } });

    const result = getLimitOrderMinAmountUsd('eip155:8453');

    expect(result).toBeUndefined();
  });
});

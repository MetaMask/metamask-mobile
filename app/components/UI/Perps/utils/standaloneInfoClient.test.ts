import { HttpTransport, InfoClient } from '@nktkas/hyperliquid';
import { createStandaloneInfoClient } from './standaloneInfoClient';
import { PERPS_CONSTANTS } from '../constants/perpsConfig';

// Mock the hyperliquid library
jest.mock('@nktkas/hyperliquid', () => ({
  HttpTransport: jest.fn().mockImplementation((config) => ({
    config,
  })),
  InfoClient: jest.fn().mockImplementation((config) => ({
    transport: config.transport,
  })),
}));

describe('createStandaloneInfoClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates client with mainnet when isTestnet=false', () => {
    createStandaloneInfoClient({ isTestnet: false });

    expect(HttpTransport).toHaveBeenCalledWith({
      isTestnet: false,
      timeout: PERPS_CONSTANTS.ConnectionTimeoutMs,
    });
    expect(InfoClient).toHaveBeenCalled();
  });

  it('creates client with testnet when isTestnet=true', () => {
    createStandaloneInfoClient({ isTestnet: true });

    expect(HttpTransport).toHaveBeenCalledWith({
      isTestnet: true,
      timeout: PERPS_CONSTANTS.ConnectionTimeoutMs,
    });
  });

  it('uses default timeout when not specified', () => {
    createStandaloneInfoClient({ isTestnet: false });

    expect(HttpTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        timeout: PERPS_CONSTANTS.ConnectionTimeoutMs,
      }),
    );
  });

  it('uses custom timeout when provided', () => {
    createStandaloneInfoClient({ isTestnet: false, timeout: 5000 });

    expect(HttpTransport).toHaveBeenCalledWith({
      isTestnet: false,
      timeout: 5000,
    });
  });

  it('returns an InfoClient instance', () => {
    const client = createStandaloneInfoClient({ isTestnet: false });
    expect(client).toBeDefined();
  });

  it('passes transport to InfoClient', () => {
    createStandaloneInfoClient({ isTestnet: false });

    // Verify HttpTransport was created first, then passed to InfoClient
    expect(HttpTransport).toHaveBeenCalledTimes(1);
    expect(InfoClient).toHaveBeenCalledTimes(1);
    expect(InfoClient).toHaveBeenCalledWith({
      transport: expect.objectContaining({
        config: {
          isTestnet: false,
          timeout: PERPS_CONSTANTS.ConnectionTimeoutMs,
        },
      }),
    });
  });
});

import { SafeChain } from '../components/hooks/useSafeChains';
import StorageWrapper from '../store/storage-wrapper';
import Engine from '../core/Engine';
import {
  getSafeChainsListFromCacheOnly,
  initializeRpcProviderDomains,
  getKnownDomains,
  isKnownDomain,
  extractRpcDomain,
  isPublicRpcDomain,
  getNetworkRpcUrl,
  getModuleState,
  extractHostname,
} from './rpc-domain-utils';

// Mock dependencies
jest.mock('../store/storage-wrapper');
jest.mock('../core/Engine');
jest.mock('./Logger');

// Define types for NetworkController mock
interface NetworkConfiguration {
  rpcUrl?: string;
  rpcEndpoints?: { url: string }[];
  defaultRpcEndpointIndex?: number;
}

interface MockNetworkController {
  findNetworkClientIdByChainId: jest.Mock<string | null, [`0x${string}`]>;
  getNetworkConfigurationByNetworkClientId: jest.Mock<
    NetworkConfiguration | null,
    [string]
  >;
}

function setupTestEnvironment() {
  jest.clearAllMocks();
  // Reset module state using the getter/setter approach
  const state = getModuleState();
  state.setKnownDomainsSet(null);
  state.setInitPromise(null);
  return {
    mockNetworkController: {
      findNetworkClientIdByChainId: jest.fn(),
      getNetworkConfigurationByNetworkClientId: jest.fn(),
    } as MockNetworkController,
  };
}

describe('rpc-domain-utils', () => {
  describe('getSafeChainsListFromCacheOnly', () => {
    describe('when cache contains valid chains data', () => {
      it('returns the cached chains data', async () => {
        // Setup
        const mockChains: SafeChain[] = [
          {
            chainId: 1,
            name: 'Ethereum',
            nativeCurrency: { symbol: 'ETH' },
            rpc: ['https://mainnet.infura.io'],
          },
        ];
        (StorageWrapper.getItem as jest.Mock).mockResolvedValue(
          JSON.stringify(mockChains),
        );
        // Exercise
        const result = await getSafeChainsListFromCacheOnly();
        // Verify
        expect(result).toEqual(mockChains);
      });
    });
    describe('when cache is empty', () => {
      it('returns an empty array', async () => {
        // Setup
        (StorageWrapper.getItem as jest.Mock).mockResolvedValue(null);
        // Exercise
        const result = await getSafeChainsListFromCacheOnly();
        // Verify
        expect(result).toEqual([]);
      });
    });
    describe('when cache contains invalid data', () => {
      it('returns an empty array', async () => {
        // Setup
        (StorageWrapper.getItem as jest.Mock).mockResolvedValue('invalid json');
        // Exercise
        const result = await getSafeChainsListFromCacheOnly();
        // Verify
        expect(result).toEqual([]);
      });
    });
    it('does not raise error and returns an empty array', async () => {
      // Mock StorageWrapper to return invalid JSON
      (StorageWrapper.getItem as jest.Mock).mockResolvedValueOnce(
        'invalid-json',
      );
      await expect(getSafeChainsListFromCacheOnly()).resolves.not.toThrow();
      const result = await getSafeChainsListFromCacheOnly();
      expect(result).toEqual([]);
    });
  });
  describe('initializeRpcProviderDomains', () => {
    describe('when chains list contains valid RPC URLs', () => {
      it('initializes known domains from the chains list', async () => {
        // Setup
        setupTestEnvironment(); // Reset state
        const mockChains: SafeChain[] = [
          {
            chainId: 1,
            name: 'Ethereum',
            nativeCurrency: { symbol: 'ETH' },
            rpc: [
              'https://mainnet.infura.io',
              'https://eth-mainnet.alchemyapi.io',
            ],
          },
        ];
        (StorageWrapper.getItem as jest.Mock).mockResolvedValue(
          JSON.stringify(mockChains),
        );
        // Exercise
        await initializeRpcProviderDomains();
        // Verify
        const knownDomains = getKnownDomains();
        expect(knownDomains).toBeInstanceOf(Set);
        expect(knownDomains?.has('mainnet.infura.io')).toBe(true);
        expect(knownDomains?.has('eth-mainnet.alchemyapi.io')).toBe(true);
      });
    });
    describe('when chains list contains invalid RPC URLs', () => {
      it('does not add invalid URLs from knownDomains', async () => {
        // Setup
        setupTestEnvironment(); // Reset state
        const mockChains: SafeChain[] = [
          {
            chainId: 1,
            name: 'Ethereum',
            nativeCurrency: { symbol: 'ETH' },
            rpc: ['invalid-url', 'https://mainnet.infura.io'],
          },
        ];
        (StorageWrapper.getItem as jest.Mock).mockResolvedValue(
          JSON.stringify(mockChains),
        );
        // Exercise
        await initializeRpcProviderDomains();
        //verify
        const knownDomains = getKnownDomains();
        expect(knownDomains).toBeInstanceOf(Set);
        expect(knownDomains?.has('mainnet.infura.io')).toBe(true);
        expect(knownDomains?.size).toBe(1);
      });
    });
    describe('when chains list is empty', () => {
      it('initializes with an empty set of domains', async () => {
        // Setup
        setupTestEnvironment(); // Reset state
        (StorageWrapper.getItem as jest.Mock).mockResolvedValue(
          JSON.stringify([]),
        );
        // Exercise
        await initializeRpcProviderDomains();
        // Verify
        const knownDomains = getKnownDomains();
        expect(knownDomains).toBeInstanceOf(Set);
        expect(knownDomains?.size).toBe(0);
      });
    });
    it('initializes with empty set on error', async () => {
      // Mock getSafeChainsListFromCacheOnly to throw
      const spy = jest
        .spyOn(
          { getSafeChainsListFromCacheOnly },
          'getSafeChainsListFromCacheOnly',
        )
        .mockRejectedValueOnce(new Error('Test error'));
      await initializeRpcProviderDomains();
      expect(getKnownDomains()).toEqual(new Set());
      spy.mockRestore();
    });
  });
  describe('isKnownDomain', () => {
    describe('when checking domain existence', () => {
      beforeEach(async () => {
        setupTestEnvironment();
        const mockChains: SafeChain[] = [
          {
            chainId: 1,
            name: 'Test Chain',
            nativeCurrency: { symbol: 'TEST' },
            rpc: ['https://known-domain.com/api'],
          },
        ];
        (StorageWrapper.getItem as jest.Mock).mockResolvedValue(
          JSON.stringify(mockChains),
        );
        await initializeRpcProviderDomains();
      });
      it('returns true for known domains', () => {
        // Execute
        const result = isKnownDomain('known-domain.com');
        // Verify
        expect(result).toBe(true);
      });
      it('returns false for unknown domains', () => {
        // Execute
        const result = isKnownDomain('unknown-domain.com');
        // Verify
        expect(result).toBe(false);
      });
      it('returns false for null knownDomainsSet', async () => {
        // Setup
        setupTestEnvironment();
        (StorageWrapper.getItem as jest.Mock).mockResolvedValue(null);
        await initializeRpcProviderDomains();
        // Execute
        const result = isKnownDomain('any-domain.com');
        // Verify
        expect(result).toBe(false);
      });
      it('matches domain ignoring case', async () => {
        // Setup
        setupTestEnvironment();
        const mockChains: SafeChain[] = [
          {
            chainId: 1,
            name: 'Test Chain',
            nativeCurrency: { symbol: 'TEST' },
            rpc: ['https://Known-Domain.com/api'],
          },
        ];
        (StorageWrapper.getItem as jest.Mock).mockResolvedValue(
          JSON.stringify(mockChains),
        );
        await initializeRpcProviderDomains();
        // Execute
        const result1 = isKnownDomain('known-domain.com');
        const result2 = isKnownDomain('KNOWN-DOMAIN.COM');
        // Verify
        expect(result1).toBe(true);
        expect(result2).toBe(true);
      });
    });
  });
  describe('extractHostname', () => {
    // Reference implementation. Jest's global URL is a spec-compliant WHATWG
    // parser, so it is what the fast path has to agree with.
    const spec = (url: string): string | undefined => {
      try {
        return new URL(url).hostname.toLowerCase();
      } catch {
        return undefined;
      }
    };

    describe('agrees with new URL() on realistic RPC endpoints', () => {
      // Sampled from chainid.network/chains.json, which is the actual input to
      // `initializeRpcProviderDomains`. The full 4,107-URL corpus was checked
      // locally with zero divergences; these cover every shape present in it.
      const realistic = [
        'https://mainnet.infura.io/v3/abc123',
        'https://eth-mainnet.alchemyapi.io/v2/key',
        'https://cloudflare-eth.com',
        'https://rpc.ankr.com/eth',
        'https://bsc-dataseed1.binance.org:443',
        'http://localhost:8545',
        'http://127.0.0.1:8545',
        'https://rpc.example.com:8545/path?query=1#frag',
        'https://user:pass@rpc.example.com:8545/path',
        'wss://rpc.example.com/ws',
        'ws://127.0.0.1:8546',
        'HTTPS://RPC.EXAMPLE.COM/Path',
        'https://sub.domain.rpc.example.co.uk',
        'https://rpc.example.com.',
        'https://[2001:db8::1]:8545/rpc',
        'https://[::1]',
        'https://192.168.1.1:8545',
        'https://rpc-mainnet.matic.network',
        'https://api.avax.network/ext/bc/C/rpc',
      ];

      it.each(realistic)('matches for %s', (url) => {
        expect(extractHostname(url)).toBe(spec(url));
      });
    });

    describe('rejects what new URL() rejects', () => {
      const invalid = [
        ['no scheme', 'invalid-url'],
        ['empty string', ''],
        ['prose', 'not a url at all'],
        ['scheme only', 'https://'],
        ['empty host with port', 'https://:8545'],
        ['triple colon', 'https://:::invalid'],
        ['empty scheme', '://no-scheme.com'],
        ['numeric scheme', '1bad://example.com'],
        ['scheme with space', 'ht tp://example.com'],
        ['port out of range', 'https://example.com:99999'],
        ['non-numeric port', 'https://example.com:abc'],
        ['ipv6 port out of range', 'https://[2001:db8::1]:99999'],
        ['unterminated ipv6', 'https://[2001:db8::1'],
      ];

      it.each(invalid)('returns undefined for %s', (_label, url) => {
        expect(extractHostname(url as string)).toBeUndefined();
        // Also assert the reference agrees, so these stay meaningful if the
        // spec parser ever changes underneath us.
        expect(spec(url as string)).toBeUndefined();
      });
    });

    describe('fails closed where it diverges from the spec', () => {
      // These are deliberate divergences. `isPublicRpcDomain` gates whether an
      // endpoint URL is reported to analytics, so being stricter is correct;
      // being more permissive would leak a private endpoint.
      const stricterThanSpec = [
        'https://example.com\\evil.com',
        'https://mainnet.infura.io\\.evil.com',
        'https://exa\tmple.com',
        'https://exa\nmple.com',
        'https://%2e.infura.io',
        'https://ex%41mple.com',
        // `new URL()` trims leading C0/space and parses this fine.
        '  https://example.com',
      ];

      it.each(stricterThanSpec)(
        'rejects %s even though the spec accepts it',
        (url) => {
          expect(extractHostname(url)).toBeUndefined();
          expect(spec(url)).toBeDefined();
        },
      );

      it('returns an unnormalised host for exotic IPv4, which matches nothing', () => {
        // The spec normalises this to 127.0.0.1; we return it verbatim, so it
        // falls through to `private` rather than being recognised.
        expect(extractHostname('https://0x7f.1')).toBe('0x7f.1');
        expect(spec('https://0x7f.1')).toBe('127.0.0.1');
      });
    });

    describe('security properties', () => {
      const ALLOWED = ['infura.io', 'alchemyapi.io'];
      const isAllowed = (host?: string) =>
        Boolean(host) &&
        ALLOWED.some(
          (domain) => host === domain || host?.endsWith(`.${domain}`),
        );

      // Mirrors the local 58k-input fuzz, kept small enough to run in CI.
      const fuzzInputs: string[] = [];
      for (const scheme of ['https', 'http', 'wss', 'HTTPS', '', '1bad']) {
        for (const host of [
          'example.com',
          'mainnet.infura.io',
          'mainnet.infura.io\\.evil.com',
          '%2e.infura.io',
          'exa\tmple.com',
          '0x7f.1',
          '[2001:db8::1]',
          '',
        ]) {
          for (const userinfo of ['', 'user:pass@', 'evil.com@']) {
            for (const port of ['', ':8545', ':99999', ':abc']) {
              for (const tail of ['', '/v3/k', '?a=b', '\\path']) {
                fuzzInputs.push(`${scheme}://${userinfo}${host}${port}${tail}`);
              }
            }
          }
        }
      }

      it('never accepts a URL that new URL() rejects', () => {
        const permissive = fuzzInputs.filter(
          (url) =>
            extractHostname(url) !== undefined && spec(url) === undefined,
        );
        expect(permissive).toEqual([]);
      });

      it('never matches the provider allowlist when the spec would not', () => {
        const unsafe = fuzzInputs.filter(
          (url) => isAllowed(extractHostname(url)) && !isAllowed(spec(url)),
        );
        expect(unsafe).toEqual([]);
      });

      it('strips userinfo so credentials never reach analytics', () => {
        expect(extractHostname('https://user:secret@rpc.example.com/v1')).toBe(
          'rpc.example.com',
        );
        expect(extractHostname('https://key@mainnet.infura.io')).toBe(
          'mainnet.infura.io',
        );
      });
    });

    it('rejects a scheme-less URL exactly as new URL() throws on it', () => {
      // `initializeRpcProviderDomains` feeds raw RPC values straight in and
      // previously relied on `new URL()` throwing to skip them.
      expect(() => new URL('invalid-url')).toThrow();
      expect(extractHostname('invalid-url')).toBeUndefined();
    });
  });

  describe('extractRpcDomain', () => {
    describe('when processing URLs', () => {
      beforeEach(async () => {
        setupTestEnvironment();
        const mockChains: SafeChain[] = [
          {
            chainId: 1,
            name: 'Test Chain',
            nativeCurrency: { symbol: 'TEST' },
            rpc: ['https://known-domain.com/api'],
          },
        ];
        (StorageWrapper.getItem as jest.Mock).mockResolvedValue(
          JSON.stringify(mockChains),
        );
        await initializeRpcProviderDomains();
      });
      it('returns domain for known domains', () => {
        // Execute
        const result = extractRpcDomain('https://known-domain.com/api');
        // Verify
        expect(result).toBe('known-domain.com');
      });
      it('returns Invalid for invalid URLs', () => {
        // Execute
        const result = extractRpcDomain(':::invalid-url');
        // Verify
        expect(result).toBe('invalid');
      });
      it('returns Private for unknown domains', () => {
        // Execute
        const result = extractRpcDomain('https://unknown-domain.com');
        // Verify
        expect(result).toBe('private');
      });
      it('returns actual domain for Infura URLs', () => {
        // Execute
        const result = extractRpcDomain('https://mainnet.infura.io');
        // Verify
        expect(result).toBe('mainnet.infura.io');
      });
      it('returns actual domain for Alchemy URLs', () => {
        // Execute
        const result = extractRpcDomain('https://eth-mainnet.alchemyapi.io');
        // Verify
        expect(result).toBe('eth-mainnet.alchemyapi.io');
      });
      it('returns Private for localhost', () => {
        // Execute
        const result1 = extractRpcDomain('http://localhost:8545');
        const result2 = extractRpcDomain('http://127.0.0.1:8545');

        // Verify
        expect(result1).toBe('private');
        expect(result2).toBe('private');
      });
      it('returns the domain for URLs without protocol', () => {
        // Execute
        const result = extractRpcDomain('known-domain.com/api');
        // Verify
        expect(result).toBe('known-domain.com');
      });
    });

    describe('Security tests for provider domain validation', () => {
      beforeEach(async () => {
        setupTestEnvironment();
        const mockChains: SafeChain[] = [
          {
            chainId: 1,
            name: 'Test Chain',
            nativeCurrency: { symbol: 'TEST' },
            rpc: ['https://known-domain.com/api'],
          },
        ];
        (StorageWrapper.getItem as jest.Mock).mockResolvedValue(
          JSON.stringify(mockChains),
        );
        await initializeRpcProviderDomains();
      });

      describe('Infura provider domain validation', () => {
        it('returns domain for legitimate Infura domains and subdomains', () => {
          expect(extractRpcDomain('https://infura.io')).toBe('infura.io');
          expect(extractRpcDomain('https://mainnet.infura.io')).toBe(
            'mainnet.infura.io',
          );
          expect(extractRpcDomain('https://goerli.infura.io')).toBe(
            'goerli.infura.io',
          );
          expect(extractRpcDomain('https://api.infura.io')).toBe(
            'api.infura.io',
          );
          expect(extractRpcDomain('https://v1.api.infura.io')).toBe(
            'v1.api.infura.io',
          );
        });

        it('returns private for malicious domains that end with infura.io but are not subdomains', () => {
          expect(extractRpcDomain('https://evilinfura.io')).toBe('private');
          expect(extractRpcDomain('https://malicious-infura.io')).toBe(
            'private',
          );
          expect(extractRpcDomain('https://fakeinfura.io')).toBe('private');
          expect(extractRpcDomain('https://notinfura.io')).toBe('private');
        });
      });

      describe('Alchemy provider domain validation', () => {
        it('returns domain for legitimate Alchemy domains and subdomains', () => {
          expect(extractRpcDomain('https://alchemyapi.io')).toBe(
            'alchemyapi.io',
          );
          expect(extractRpcDomain('https://eth-mainnet.alchemyapi.io')).toBe(
            'eth-mainnet.alchemyapi.io',
          );
          expect(
            extractRpcDomain('https://polygon-mainnet.alchemyapi.io'),
          ).toBe('polygon-mainnet.alchemyapi.io');
          expect(extractRpcDomain('https://eth.v2.alchemyapi.io')).toBe(
            'eth.v2.alchemyapi.io',
          );
        });

        it('returns private for malicious domains that end with alchemyapi.io but are not subdomains', () => {
          expect(extractRpcDomain('https://evilalchemyapi.io')).toBe('private');
          expect(extractRpcDomain('https://malicious-alchemyapi.io')).toBe(
            'private',
          );
          expect(extractRpcDomain('https://fakealchemyapi.io')).toBe('private');
          expect(extractRpcDomain('https://notalchemyapi.io')).toBe('private');
        });
      });

      describe('Edge cases for provider domain validation', () => {
        it('handles case sensitivity correctly', () => {
          expect(extractRpcDomain('https://MAINNET.INFURA.IO')).toBe(
            'mainnet.infura.io',
          );
          expect(extractRpcDomain('https://ETH-MAINNET.ALCHEMYAPI.IO')).toBe(
            'eth-mainnet.alchemyapi.io',
          );
        });

        it('returns private for domains with similar but different TLDs', () => {
          expect(extractRpcDomain('https://mainnet.infura.com')).toBe(
            'private',
          );
          expect(extractRpcDomain('https://eth-mainnet.alchemyapi.com')).toBe(
            'private',
          );
        });

        it('prevents subdomain confusion attacks (security fix validation)', () => {
          // These domains would have passed the old endsWith check but should be blocked
          const attackDomains = [
            'https://evilinfura.io',
            'https://maliciousinfura.io',
            'https://fakeinfura.io',
            'https://evilalchemyapi.io',
            'https://maliciousalchemyapi.io',
            'https://fakealchemyapi.io',
          ];

          attackDomains.forEach((domain) => {
            expect(extractRpcDomain(domain)).toBe('private');
          });
        });

        it('handles exact base domain matches', () => {
          expect(extractRpcDomain('https://infura.io')).toBe('infura.io');
          expect(extractRpcDomain('https://alchemyapi.io')).toBe(
            'alchemyapi.io',
          );
        });
      });
    });
  });

  describe('isPublicRpcDomain', () => {
    it('returns false for invalid URLs', () => {
      expect(isPublicRpcDomain(':::invalid-url')).toBe(false);
    });

    it('returns false for private/localhost URLs', () => {
      expect(isPublicRpcDomain('http://localhost:8545')).toBe(false);
      expect(isPublicRpcDomain('http://127.0.0.1:8545')).toBe(false);
    });

    it('returns false for unknown private domains', () => {
      expect(isPublicRpcDomain('https://unknown-domain.com')).toBe(false);
    });

    it('returns true for known public provider URLs', () => {
      expect(isPublicRpcDomain('https://mainnet.infura.io/v3/key')).toBe(true);
      expect(
        isPublicRpcDomain('https://eth-mainnet.alchemyapi.io/v2/key'),
      ).toBe(true);
    });
  });

  describe('getNetworkRpcUrl', () => {
    describe('when retrieving RPC URLs', () => {
      it('returns RPC URL from legacy format', () => {
        // Setup
        const { mockNetworkController } = setupTestEnvironment();
        mockNetworkController.findNetworkClientIdByChainId.mockReturnValue(
          'network1',
        );
        mockNetworkController.getNetworkConfigurationByNetworkClientId.mockReturnValue(
          {
            rpcUrl: 'https://legacy-rpc.com',
          },
        );
        (
          Engine.context as unknown as {
            NetworkController: MockNetworkController;
          }
        ).NetworkController = mockNetworkController;
        // Exercise
        const result = getNetworkRpcUrl('0x1');
        // Verify
        expect(result).toBe('https://legacy-rpc.com');
      });
      it('returns RPC URL from rpcEndpoints array', () => {
        // Setup
        const { mockNetworkController } = setupTestEnvironment();
        mockNetworkController.findNetworkClientIdByChainId.mockReturnValue(
          'network1',
        );
        mockNetworkController.getNetworkConfigurationByNetworkClientId.mockReturnValue(
          {
            rpcEndpoints: [
              { url: 'https://rpc1.com' },
              { url: 'https://rpc2.com' },
            ],
            defaultRpcEndpointIndex: 1,
          },
        );
        (
          Engine.context as unknown as {
            NetworkController: MockNetworkController;
          }
        ).NetworkController = mockNetworkController;
        // Exercise
        const result = getNetworkRpcUrl('0x1');
        // Verify
        expect(result).toBe('https://rpc2.com');
      });
      it('returns unknown when network client ID not found', () => {
        // Setup
        const { mockNetworkController } = setupTestEnvironment();
        mockNetworkController.findNetworkClientIdByChainId.mockReturnValue(
          null,
        );
        (
          Engine.context as unknown as {
            NetworkController: MockNetworkController;
          }
        ).NetworkController = mockNetworkController;
        // Exercise
        const result = getNetworkRpcUrl('0x1');
        // Verify
        expect(result).toBe('unknown');
      });
      it('returns unknown when network configuration not found', () => {
        // Setup
        const { mockNetworkController } = setupTestEnvironment();
        mockNetworkController.findNetworkClientIdByChainId.mockReturnValue(
          'network1',
        );
        mockNetworkController.getNetworkConfigurationByNetworkClientId.mockReturnValue(
          null,
        );
        (
          Engine.context as unknown as {
            NetworkController: MockNetworkController;
          }
        ).NetworkController = mockNetworkController;
        // Exercise
        const result = getNetworkRpcUrl('0x1');
        // Verify
        expect(result).toBe('unknown');
      });
      it('returns unknown as RPC URL on error', () => {
        // Setup
        const { mockNetworkController } = setupTestEnvironment();
        mockNetworkController.findNetworkClientIdByChainId.mockImplementation(
          () => {
            throw new Error('Test error');
          },
        );
        (
          Engine.context as unknown as {
            NetworkController: MockNetworkController;
          }
        ).NetworkController = mockNetworkController;
        // Exercise
        const result = getNetworkRpcUrl('0x1');
        // Verify
        expect(result).toBe('unknown');
      });
      it('returns unknown as RPC URL on missing rpcEndpoints', () => {
        const mockNetworkConfig = {
          rpcEndpoints: undefined,
        };
        (
          Engine.context as unknown as {
            NetworkController: MockNetworkController;
          }
        ).NetworkController.getNetworkConfigurationByNetworkClientId.mockReturnValueOnce(
          mockNetworkConfig,
        );
        const result = getNetworkRpcUrl('0x1');
        expect(result).toBe('unknown');
      });
      it('handles invalid rpcEndpoints array', () => {
        const mockNetworkConfig = {
          rpcEndpoints: [{ url: '' }], // Empty url property
        };
        (
          Engine.context as unknown as {
            NetworkController: MockNetworkController;
          }
        ).NetworkController.getNetworkConfigurationByNetworkClientId.mockReturnValueOnce(
          mockNetworkConfig,
        );
        const result = getNetworkRpcUrl('0x1');
        expect(result).toBe('unknown');
      });
      it('returns unknown as RPC URL on empty rpcEndpoints array', () => {
        const mockNetworkConfig = {
          rpcEndpoints: [], // Empty array
        };
        (
          Engine.context as unknown as {
            NetworkController: MockNetworkController;
          }
        ).NetworkController.getNetworkConfigurationByNetworkClientId.mockReturnValueOnce(
          mockNetworkConfig,
        );
        const result = getNetworkRpcUrl('0x1');
        expect(result).toBe('unknown');
      });
    });
  });
});

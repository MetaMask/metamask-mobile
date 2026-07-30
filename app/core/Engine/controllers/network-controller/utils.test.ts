// Jest tests run in Node, so this is okay.
// eslint-disable-next-line import-x/no-nodejs-modules
import assert from 'assert';

import { QUICKNODE_ENDPOINT_URLS_BY_INFURA_NETWORK_NAME } from '../../../../util/networks/customNetworks';
import {
  PRODUCTION_LIKE_ENVIRONMENTS,
  getIsQuicknodeEndpointUrl,
  getIsMetaMaskInfuraEndpointUrl,
  getRpcServiceEventsSampleRate,
  KNOWN_CUSTOM_ENDPOINTS,
  isPublicEndpointUrl,
} from './utils';

jest.mock('../../../../util/networks/customNetworks', () => {
  // The network constants file relies on INFURA_PROJECT_ID already being set.
  // If we set it in a test, then it's already too late.
  // Therefore, we have to set it to a known value before loading the file.
  const previousInfuraProjectId = process.env.MM_INFURA_PROJECT_ID;
  // NOTE: This must match MOCK_METAMASK_INFURA_PROJECT_ID below.
  process.env.MM_INFURA_PROJECT_ID = 'metamask-infura-project-id';
  const mod = jest.requireActual('../../../../util/networks/customNetworks');
  process.env.MM_INFURA_PROJECT_ID = previousInfuraProjectId;
  return mod;
});

const MOCK_METAMASK_INFURA_PROJECT_ID = 'metamask-infura-project-id';

describe('getIsMetaMaskInfuraEndpointUrl', () => {
  it('returns true if the URL has an Infura hostname with some subdomain whose path starts with the MetaMask API key', () => {
    expect(
      getIsMetaMaskInfuraEndpointUrl(
        'https://some-subdomain.infura.io/v3/the-infura-project-id',
        'the-infura-project-id',
      ),
    ).toBe(true);
  });

  it('returns false if the URL has an Infura hostname with some subdomain whose path does not start with the MetaMask API key', () => {
    expect(
      getIsMetaMaskInfuraEndpointUrl(
        'https://some-subdomain.infura.io/v3/a-different-infura-project-id',
        'the-infura-project-id',
      ),
    ).toBe(false);
  });

  it('returns true given an Infura v3 URL with {infuraProjectId} at the end', () => {
    expect(
      getIsMetaMaskInfuraEndpointUrl(
        'https://some-subdomain.infura.io/v3/{infuraProjectId}',
        'the-infura-project-id',
      ),
    ).toBe(true);
  });

  it('returns false if the URL does match an Infura URL', () => {
    expect(
      getIsMetaMaskInfuraEndpointUrl(
        'https://a-different-url.com',
        'the-infura-project-id',
      ),
    ).toBe(false);
  });
});

describe('getIsQuicknodeEndpointUrl', () => {
  for (const [infuraNetwork, getQuicknodeEndpointUrl] of Object.entries(
    QUICKNODE_ENDPOINT_URLS_BY_INFURA_NETWORK_NAME,
  )) {
    it(`returns true when given the known Quicknode URL for the Infura network '${infuraNetwork}`, async () => {
      await withChangesToEnvironmentVariables(() => {
        setQuicknodeEnvironmentVariables();

        const endpointUrl = getQuicknodeEndpointUrl();
        assert(endpointUrl);

        expect(getIsQuicknodeEndpointUrl(endpointUrl)).toBe(true);
      });
    });
  }

  it('returns false when given a non-Quicknode URL', () => {
    expect(getIsQuicknodeEndpointUrl('https://some.random.url')).toBe(false);
  });
});

describe('getRpcServiceEventsSampleRate', () => {
  describe.each(PRODUCTION_LIKE_ENVIRONMENTS)(
    'if the environment is %s',
    (environment: string) => {
      it('returns the 1% sample rate', async () => {
        await withChangesToEnvironmentVariables(() => {
          process.env.METAMASK_ENVIRONMENT = environment;

          expect(getRpcServiceEventsSampleRate()).toBe(0.01);
        });
      });
    },
  );

  it('returns 1 when the environment is non-production', async () => {
    await withChangesToEnvironmentVariables(() => {
      process.env.METAMASK_ENVIRONMENT = 'development';

      expect(getRpcServiceEventsSampleRate()).toBe(1);
    });
  });

  it('returns 0 when the environment is not set', async () => {
    await withChangesToEnvironmentVariables(() => {
      delete process.env.METAMASK_ENVIRONMENT;

      expect(getRpcServiceEventsSampleRate()).toBe(0);
    });
  });
});

const ENDPOINTS_TO_TEST: (readonly [string, () => string | undefined])[] = [
  [
    'an Infura endpoint using the MetaMask API key',
    () => `https://mainnet.infura.io/v3/${MOCK_METAMASK_INFURA_PROJECT_ID}`,
  ],
  ...Object.entries(QUICKNODE_ENDPOINT_URLS_BY_INFURA_NETWORK_NAME).map(
    ([infuraNetworkName, getUrl]) =>
      [`the Quicknode endpoint URL for ${infuraNetworkName}`, getUrl] as const,
  ),
  ...KNOWN_CUSTOM_ENDPOINTS.map(
    ({ name, url }) =>
      [`the known custom network ${name} (${url})`, () => url] as const,
  ),
];

describe('isPublicEndpointUrl', () => {
  it.each(ENDPOINTS_TO_TEST)('returns true for %s', async (_, getUrl) => {
    await withChangesToEnvironmentVariables(() => {
      setQuicknodeEnvironmentVariables();

      const url = getUrl();
      assert(url);

      expect(isPublicEndpointUrl(url, MOCK_METAMASK_INFURA_PROJECT_ID)).toBe(
        true,
      );
    });
  });

  it('returns false for a custom endpoint URL', () => {
    expect(
      isPublicEndpointUrl(
        'https://my-custom-endpoint.com',
        MOCK_METAMASK_INFURA_PROJECT_ID,
      ),
    ).toBe(false);
  });

  it('returns false for localhost URLs', () => {
    expect(
      isPublicEndpointUrl(
        'http://localhost:8545',
        MOCK_METAMASK_INFURA_PROJECT_ID,
      ),
    ).toBe(false);
    expect(
      isPublicEndpointUrl(
        'http://127.0.0.1:8545',
        MOCK_METAMASK_INFURA_PROJECT_ID,
      ),
    ).toBe(false);
  });

  it('returns false for invalid URLs', () => {
    expect(
      isPublicEndpointUrl(':::invalid-url', MOCK_METAMASK_INFURA_PROJECT_ID),
    ).toBe(false);
  });

  it('returns true for known public provider domains like Alchemy', () => {
    expect(
      isPublicEndpointUrl(
        'https://eth-mainnet.alchemyapi.io/v2/some-key',
        MOCK_METAMASK_INFURA_PROJECT_ID,
      ),
    ).toBe(true);
  });
});

/**
 * Sets the environment variables that represent all networks that have
 * Quicknode endpoints.
 */
function setQuicknodeEnvironmentVariables() {
  process.env.QUICKNODE_MAINNET_URL = 'https://example.quicknode.com/mainnet';
  process.env.QUICKNODE_LINEA_MAINNET_URL =
    'https://example.quicknode.com/linea-mainnet';
  process.env.QUICKNODE_ARBITRUM_URL = 'https://example.quicknode.com/arbitrum';
  process.env.QUICKNODE_AVALANCHE_URL =
    'https://example.quicknode.com/avalanche';
  process.env.QUICKNODE_OPTIMISM_URL = 'https://example.quicknode.com/optimism';
  process.env.QUICKNODE_POLYGON_URL = 'https://example.quicknode.com/polygon';
  process.env.QUICKNODE_BASE_URL = 'https://example.quicknode.com/base';
  process.env.QUICKNODE_BSC_URL = 'https://example.quicknode.com/bsc';
  process.env.QUICKNODE_SEI_URL = 'https://example.quicknode.com/sei';
  process.env.QUICKNODE_MONAD_URL = 'https://example.quicknode.com/monad';
  process.env.QUICKNODE_HYPEREVM_URL = 'https://example.quicknode.com/hyperevm';
  process.env.QUICKNODE_ARC_URL = 'https://example.quicknode.com/arc';
  process.env.QUICKNODE_ROBINHOOD_URL =
    'https://example.quicknode.com/robinhood';
}

/**
 * Ensures that changes to `process.env` during a test get rolled back after a
 * test.
 *
 * @param testFunction - The test function to execute.
 */
async function withChangesToEnvironmentVariables(
  testFunction: () => void | Promise<void>,
) {
  const originalEnv = { ...process.env };

  await testFunction();

  for (const key of new Set([
    ...Object.keys(originalEnv),
    ...Object.keys(process.env),
  ])) {
    if (originalEnv[key]) {
      process.env[key] = originalEnv[key];
    } else {
      delete process.env[key];
    }
  }
}

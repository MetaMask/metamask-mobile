// Jest tests run in Node, so this is okay.
// eslint-disable-next-line import/no-nodejs-modules
import assert from 'assert';
import { generateDeterministicRandomNumber } from '@metamask/remote-feature-flag-controller';

import { QUICKNODE_ENDPOINT_URLS_BY_INFURA_NETWORK_NAME } from '../../../../util/networks/customNetworks';
import {
  PRODUCTION_LIKE_ENVIRONMENTS,
  getIsQuicknodeEndpointUrl,
  getIsMetaMaskInfuraEndpointUrl,
  shouldCreateRpcServiceEvents,
  KNOWN_CUSTOM_ENDPOINTS,
  isPublicEndpointUrl,
} from './utils';

jest.mock('@metamask/remote-feature-flag-controller', () => ({
  ...jest.requireActual('@metamask/remote-feature-flag-controller'),
  // This is the name of the property that turns this into an ES module.
  // eslint-disable-next-line @typescript-eslint/naming-convention
  __esModule: true,
  generateDeterministicRandomNumber: jest.fn(),
}));

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

const generateDeterministicRandomNumberMock = jest.mocked(
  generateDeterministicRandomNumber,
);

const MOCK_METAMASK_INFURA_PROJECT_ID = 'metamask-infura-project-id';

const MOCK_METAMETRICS_ID =
  '0x86bacb9b2bf9a7e8d2b147eadb95ac9aaa26842327cd24afc8bd4b3c1d136420';

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

describe('shouldCreateRpcServiceEvents', () => {
  describe('if not given an error', () => {
    const error = undefined;

    describe('if given a MetaMetrics ID', () => {
      describe.each(PRODUCTION_LIKE_ENVIRONMENTS)(
        'if the environment is %s',
        (environment: string) => {
          describe('if the user is in the MetaMetrics sample', () => {
            const sampleUserRanking = 0.009999;

            it('returns true', async () => {
              await withChangesToEnvironmentVariables(() => {
                process.env.METAMASK_ENVIRONMENT = environment;
                generateDeterministicRandomNumberMock.mockReturnValue(
                  sampleUserRanking,
                );

                expect(
                  shouldCreateRpcServiceEvents({
                    error,
                    metaMetricsId: MOCK_METAMETRICS_ID,
                  }),
                ).toBe(true);
              });
            });
          });

          describe('if the user is not in the MetaMetrics sample', () => {
            const sampleUserRanking = 0.2;

            it('returns false', async () => {
              await withChangesToEnvironmentVariables(() => {
                process.env.METAMASK_ENVIRONMENT = environment;
                generateDeterministicRandomNumberMock.mockReturnValue(
                  sampleUserRanking,
                );

                expect(
                  shouldCreateRpcServiceEvents({
                    error,
                    metaMetricsId: MOCK_METAMETRICS_ID,
                  }),
                ).toBe(false);
              });
            });
          });
        },
      );

      describe('if the environment is non-production', () => {
        const environment = 'development';

        it('returns true', async () => {
          await withChangesToEnvironmentVariables(() => {
            process.env.METAMASK_ENVIRONMENT = environment;

            expect(
              shouldCreateRpcServiceEvents({
                error,
                metaMetricsId: MOCK_METAMETRICS_ID,
              }),
            ).toBe(true);
          });
        });
      });

      describe('if the environment is not set', () => {
        it('returns false', async () => {
          await withChangesToEnvironmentVariables(() => {
            delete process.env.METAMASK_ENVIRONMENT;

            expect(
              shouldCreateRpcServiceEvents({
                error,
                metaMetricsId: MOCK_METAMETRICS_ID,
              }),
            ).toBe(false);
          });
        });
      });
    });

    describe('if the MetaMetrics ID is undefined', () => {
      const metaMetricsId = undefined;

      it('returns false', async () => {
        expect(
          shouldCreateRpcServiceEvents({
            error: undefined,
            metaMetricsId,
          }),
        ).toBe(false);
      });
    });

    describe('if the MetaMetrics ID is null', () => {
      const metaMetricsId = null;

      it('returns false', async () => {
        expect(
          shouldCreateRpcServiceEvents({
            error: undefined,
            metaMetricsId,
          }),
        ).toBe(false);
      });
    });
  });

  describe('if given a non-connection error', () => {
    const error = new Error('some error');

    describe('if given a MetaMetrics ID', () => {
      describe.each(PRODUCTION_LIKE_ENVIRONMENTS)(
        'if the environment is %s',
        (environment: string) => {
          describe('if the user is in the MetaMetrics sample', () => {
            const sampleUserRanking = 0.009999;

            it('returns true', async () => {
              await withChangesToEnvironmentVariables(() => {
                process.env.METAMASK_ENVIRONMENT = environment;
                generateDeterministicRandomNumberMock.mockReturnValue(
                  sampleUserRanking,
                );

                expect(
                  shouldCreateRpcServiceEvents({
                    error,
                    metaMetricsId: MOCK_METAMETRICS_ID,
                  }),
                ).toBe(true);
              });
            });
          });

          describe('if the user is not in the MetaMetrics sample', () => {
            const sampleUserRanking = 0.2;

            it('returns false', async () => {
              await withChangesToEnvironmentVariables(() => {
                process.env.METAMASK_ENVIRONMENT = environment;
                generateDeterministicRandomNumberMock.mockReturnValue(
                  sampleUserRanking,
                );

                expect(
                  shouldCreateRpcServiceEvents({
                    error,
                    metaMetricsId: MOCK_METAMETRICS_ID,
                  }),
                ).toBe(false);
              });
            });
          });
        },
      );

      describe('if the environment is non-production', () => {
        const environment = 'development';

        it('returns true', async () => {
          await withChangesToEnvironmentVariables(() => {
            process.env.METAMASK_ENVIRONMENT = environment;

            expect(
              shouldCreateRpcServiceEvents({
                error,
                metaMetricsId: MOCK_METAMETRICS_ID,
              }),
            ).toBe(true);
          });
        });
      });

      describe('if the environment is not set', () => {
        it('returns false', async () => {
          await withChangesToEnvironmentVariables(() => {
            delete process.env.METAMASK_ENVIRONMENT;

            expect(
              shouldCreateRpcServiceEvents({
                error,
                metaMetricsId: MOCK_METAMETRICS_ID,
              }),
            ).toBe(false);
          });
        });
      });
    });

    describe('if the MetaMetrics ID is undefined', () => {
      const metaMetricsId = undefined;

      it('returns false', async () => {
        expect(
          shouldCreateRpcServiceEvents({
            error: undefined,
            metaMetricsId,
          }),
        ).toBe(false);
      });
    });

    describe('if the MetaMetrics ID is null', () => {
      const metaMetricsId = null;

      it('returns false', async () => {
        expect(
          shouldCreateRpcServiceEvents({
            error: undefined,
            metaMetricsId,
          }),
        ).toBe(false);
      });
    });
  });

  describe('if given a connection error', () => {
    const error = new TypeError('Failed to fetch');

    it('returns false', async () => {
      expect(
        shouldCreateRpcServiceEvents({
          error,
          metaMetricsId: MOCK_METAMETRICS_ID,
        }),
      ).toBe(false);
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

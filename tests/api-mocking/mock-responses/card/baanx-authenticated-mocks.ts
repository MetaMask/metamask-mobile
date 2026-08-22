import type { Mockttp } from 'mockttp';
import { TestSpecificMock } from '../../../framework/types.ts';
import { DEFAULT_FIXTURE_ACCOUNT } from '../../../framework/fixtures/FixtureBuilder.ts';
import { getDecodedProxiedURL } from '../../../smoke-appium/notifications/utils/helpers.ts';
import { testSpecificMock as cardholderMocks } from '../cardholder-mocks.ts';

export const BAANX_DEV_HOST = 'https://foxdev2-ag.foxcard.io';

const E2E_INITIATE_TOKEN = 'e2e-card-initiate-token';
const E2E_AUTH_CODE = 'e2e-card-auth-code';

/** OAuth state from the last initiate request — authorize must echo it. */
let lastOAuthState = 'e2e-oauth-state';

const delegationSettingsResponse = {
  count: 1,
  _links: { self: '/v1/delegation/chain/config' },
  networks: [
    {
      network: 'linea',
      environment: 'production',
      chainId: '59144',
      delegationContract: '0x9dd23A4a0845f10d65D293776B792af1131c7B30',
      tokens: {
        usdc: {
          symbol: 'usdc',
          decimals: 6,
          address: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
        },
      },
    },
  ],
};

const cardStatusResponse = {
  id: 'card-e2e-1',
  isFreezable: true,
  orderedAt: '2024-01-01T00:00:00.000Z',
  panLast4: '1234',
  status: 'ACTIVE',
  type: 'VIRTUAL',
  holderName: 'Test User',
};

const userResponse = {
  id: 'user-e2e-1',
  firstName: 'Test',
  lastName: 'User',
  verificationState: 'VERIFIED',
  countryOfResidence: 'gb',
  createdAt: '2024-01-01T00:00:00.000Z',
};

const walletExternalResponse = [
  {
    address: DEFAULT_FIXTURE_ACCOUNT,
    currency: 'usdc',
    balance: '1000',
    // >= ARBITRARY_ALLOWANCE → Active funding status
    allowance: '200000000000',
    network: 'linea',
  },
];

const walletPriorityResponse = [
  {
    id: 1,
    address: DEFAULT_FIXTURE_ACCOUNT,
    currency: 'usdc',
    network: 'linea',
    priority: 1,
  },
];

const cashbackWalletResponse = {
  id: 'reward-e2e-1',
  balance: '10.50',
  currency: 'musd',
  isWithdrawable: true,
  type: 'reward',
};

const cashbackWithdrawEstimationResponse = {
  wei: '1000000000000000',
  eth: '0.001',
  price: '0.05',
  network: 'linea',
};

const loginResponse = {
  phase: null,
  userId: 'user-e2e-1',
  isOtpRequired: false,
  phoneNumber: null,
  accessToken: 'e2e-login-access-token',
  verificationState: 'VERIFIED',
  isLinked: true,
};

const exchangeTokenResponse = {
  access_token: 'e2e-access-token',
  token_type: 'Bearer',
  expires_in: 3600,
  refresh_token: 'e2e-refresh-token',
  refresh_token_expires_in: 86400,
};

function isBaanxUrl(url: string, pathIncludes: string): boolean {
  return url.includes('foxdev2-ag.foxcard.io') && url.includes(pathIncludes);
}

/** True when the request path is exactly `path` (querystring allowed). */
function isBaanxExactPath(url: string, path: string): boolean {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('foxdev2-ag.foxcard.io')) {
      return false;
    }
    return parsed.pathname === path || parsed.pathname === `${path}/`;
  } catch {
    return false;
  }
}

function extractStateFromInitiateUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get('state');
  } catch {
    const match = /[?&]state=([^&]+)/.exec(url);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  }
}

async function mockBaanxGetJson(
  mockServer: Mockttp,
  path: string,
  response: unknown,
  options: { exactPath?: boolean } = {},
): Promise<void> {
  const { exactPath = false } = options;
  const escapedHost = BAANX_DEV_HOST.replace(/\./g, '\\.');
  const directUrl = exactPath
    ? new RegExp(`^${escapedHost}${path}/?(?:\\?.*)?$`)
    : new RegExp(`^${escapedHost}${path}`);

  await mockServer
    .forGet(directUrl)
    .asPriority(1000)
    .thenJson(200, response as object);

  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const decoded = getDecodedProxiedURL(request.url);
      return exactPath
        ? isBaanxExactPath(decoded, path)
        : isBaanxUrl(decoded, path);
    })
    .asPriority(1000)
    .thenJson(200, response as object);
}

async function mockBaanxPostJson(
  mockServer: Mockttp,
  pathIncludes: string,
  response: unknown,
): Promise<void> {
  await mockServer
    .forPost(
      new RegExp(`^${BAANX_DEV_HOST.replace(/\./g, '\\.')}${pathIncludes}`),
    )
    .asPriority(1000)
    .thenJson(200, response as object);

  await mockServer
    .forPost('/proxy')
    .matching((request) =>
      isBaanxUrl(getDecodedProxiedURL(request.url), pathIncludes),
    )
    .asPriority(1000)
    .thenJson(200, response as object);
}

/**
 * Mocks Baanx DEV auth (no OTP) + authenticated Card Home + Cashback view APIs.
 * OAuth authorize echoes the state from the prior initiate request.
 */
export async function setupBaanxAuthenticatedMocks(
  mockServer: Mockttp,
): Promise<void> {
  lastOAuthState = 'e2e-oauth-state';

  const initiateCallback = (request: { url: string }) => {
    const state = extractStateFromInitiateUrl(request.url);
    if (state) {
      lastOAuthState = state;
    }
    return {
      statusCode: 200,
      json: {
        token: E2E_INITIATE_TOKEN,
        url: `${BAANX_DEV_HOST}/oauth`,
      },
    };
  };

  const initiateProxyCallback = (request: { url: string }) =>
    initiateCallback({ url: getDecodedProxiedURL(request.url) });

  await mockServer
    .forGet(
      new RegExp(
        `^${BAANX_DEV_HOST.replace(/\./g, '\\.')}/v1/auth/oauth/authorize/initiate`,
      ),
    )
    .asPriority(1000)
    .thenCallback(initiateCallback);

  await mockServer
    .forGet('/proxy')
    .matching((request) =>
      isBaanxUrl(
        getDecodedProxiedURL(request.url),
        '/v1/auth/oauth/authorize/initiate',
      ),
    )
    .asPriority(1000)
    .thenCallback(initiateProxyCallback);

  await mockBaanxPostJson(mockServer, '/v1/auth/login', loginResponse);

  const authorizeResponse = () => ({
    statusCode: 200,
    json: {
      state: lastOAuthState,
      url: `${BAANX_DEV_HOST}/oauth/callback`,
      code: E2E_AUTH_CODE,
    },
  });

  await mockServer
    .forPost(
      new RegExp(
        `^${BAANX_DEV_HOST.replace(/\./g, '\\.')}/v1/auth/oauth/authorize$`,
      ),
    )
    .asPriority(1000)
    .thenCallback(authorizeResponse);

  await mockServer
    .forPost('/proxy')
    .matching((request) => {
      const decoded = getDecodedProxiedURL(request.url);
      return (
        isBaanxUrl(decoded, '/v1/auth/oauth/authorize') &&
        !decoded.includes('initiate')
      );
    })
    .asPriority(1000)
    .thenCallback(authorizeResponse);

  await mockBaanxPostJson(
    mockServer,
    '/v1/auth/oauth/token',
    exchangeTokenResponse,
  );

  await mockBaanxGetJson(
    mockServer,
    '/v1/delegation/chain/config',
    delegationSettingsResponse,
  );
  await mockBaanxGetJson(mockServer, '/v1/card/status', cardStatusResponse);
  await mockBaanxGetJson(mockServer, '/v1/user', userResponse);
  await mockBaanxGetJson(
    mockServer,
    '/v1/wallet/external/priority',
    walletPriorityResponse,
    { exactPath: true },
  );
  await mockBaanxGetJson(
    mockServer,
    '/v1/wallet/external',
    walletExternalResponse,
    { exactPath: true },
  );
  await mockBaanxGetJson(
    mockServer,
    '/v1/wallet/reward/withdraw-estimation',
    cashbackWithdrawEstimationResponse,
    { exactPath: true },
  );
  await mockBaanxGetJson(
    mockServer,
    '/v1/wallet/reward',
    cashbackWalletResponse,
    { exactPath: true },
  );
}

/**
 * Cardholder (Linea RPC / cardFeature) mocks + Baanx auth/home/cashback mocks.
 */
export const authenticatedCardTestSpecificMock: TestSpecificMock = async (
  mockServer,
) => {
  await cardholderMocks(mockServer);
  await setupBaanxAuthenticatedMocks(mockServer);
};

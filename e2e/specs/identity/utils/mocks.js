import { AuthenticationController } from '@metamask/profile-sync-controller';
import { UserStorageMockttpController } from './user-storage/userStorageMockttpController';
import { getDecodedProxiedURL } from './helpers';
import { USER_STORAGE_FEATURE_NAMES } from '@metamask/profile-sync-controller/sdk';

const AuthMocks = AuthenticationController.Mocks;

/**
 * E2E mock setup for identity APIs (Auth, UserStorage, Backup and sync)
 *
 * @param server - server obj used to mock our endpoints
 * @param userStorageMockttpController - optional controller to mock user storage endpoints
 */
export async function mockIdentityServices(server) {
  // Auth
  mockAPICall(server, AuthMocks.getMockAuthNonceResponse());
  mockAPICall(server, AuthMocks.getMockAuthLoginResponse());
  mockAPICall(server, AuthMocks.getMockAuthAccessTokenResponse());

  // Storage
  const userStorageMockttpControllerInstance =
    new UserStorageMockttpController();

  userStorageMockttpControllerInstance.setupPath(
    USER_STORAGE_FEATURE_NAMES.accounts,
    server,
  );
  userStorageMockttpControllerInstance.setupPath(
    USER_STORAGE_FEATURE_NAMES.networks,
    server,
  );

  return {
    userStorageMockttpControllerInstance,
  };
}

export const MOCK_SRP_E2E_IDENTIFIER_BASE_KEY = 'MOCK_SRP_IDENTIFIER';

const MOCK_SRP_E2E_IDENTIFIERS = {
  baseKey: MOCK_SRP_E2E_IDENTIFIER_BASE_KEY,
  list: new Map(),
};

const getE2ESrpIdentifierForPublicKey = (publicKey) => {
  const { baseKey, list } = MOCK_SRP_E2E_IDENTIFIERS;

  // Check if the identifier already exists
  if (list.has(publicKey)) {
    return list.get(publicKey);
  }

  const nextIteration = list.size + 1;
  const nextIdentifier = `${baseKey}_${nextIteration}`;

  list.set(publicKey, nextIdentifier);

  return nextIdentifier;
};

function mockAPICall(server, response) {
  let requestRuleBuilder;

  if (response.requestMethod === 'GET') {
    requestRuleBuilder = server.forGet('/proxy');
  }

  if (response.requestMethod === 'POST') {
    requestRuleBuilder = server.forPost('/proxy');
  }

  if (response.requestMethod === 'PUT') {
    requestRuleBuilder = server.forPut('/proxy');
  }

  if (response.requestMethod === 'DELETE') {
    requestRuleBuilder = server.forDelete('/proxy');
  }

  requestRuleBuilder
    ?.matching((request) => {
      const url = getDecodedProxiedURL(request.url);

      return url.includes(String(response.url));
    })
    .thenCallback(async (request) => {
      const { path, body } = request;

      const [requestBodyJson, requestBodyText] = await Promise.all([
        body.getJson(),
        body.getText(),
      ]);
      const requestBody = requestBodyJson ?? requestBodyText;

      const json = response.response(
        requestBody,
        path,
        getE2ESrpIdentifierForPublicKey,
      );

      return {
        statusCode: 200,
        json,
      };
    });
}

const MOCK_ETH_BALANCE = '0xde0b6b3a7640000';
const INFURA_URL = 'https://mainnet.infura.io/v3/';

/**
 * Sets up mock responses for Infura balance checks and account syncing
 * @param {Object} mockServer - The server object to set up the mock responses on
 * @param {Array<String>} accounts - List of account addresses to mock balances for
 */
export const setupAccountMockedBalances = async (mockServer, accounts) => {
  if (!accounts.length) {
    return;
  }

  for (const account of accounts) {
    await mockServer
      .forPost('/proxy')
      .matching((request) => {
        const url = getDecodedProxiedURL(request.url);
        return url.includes(INFURA_URL);
      })
      .withJsonBodyIncluding({
        method: 'eth_getBalance',
        params: [account.toLowerCase()],
      })
      .thenCallback(() => ({
        statusCode: 200,
        json: {
          jsonrpc: '2.0',
          id: '1111111111111111',
          result: MOCK_ETH_BALANCE,
        },
      }));
  }
};

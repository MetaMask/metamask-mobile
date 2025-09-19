import { AuthenticationController } from '@metamask/profile-sync-controller';
import { UserStorageMockttpController } from './user-storage/userStorageMockttpController';
import { getDecodedProxiedURL } from './helpers';
import { USER_STORAGE_FEATURE_NAMES } from '@metamask/profile-sync-controller/sdk';
import { Mockttp } from 'mockttp';
import {
  USER_STORAGE_GROUPS_FEATURE_KEY,
  USER_STORAGE_WALLETS_FEATURE_KEY,
} from '@metamask/account-tree-controller';

const AuthMocks = AuthenticationController.Mocks;

interface MockResponse {
  url: string | RegExp;
  requestMethod: 'GET' | 'POST' | 'PUT' | 'DELETE';
  response: unknown;
}

/**
 * Sets up authentication service mocks (nonce, login, access token)
 * @param server - The Mockttp server instance
 */
export async function mockAuthServices(server: Mockttp) {
  await mockAPICall(server, AuthMocks.getMockAuthNonceResponse());
  await mockAPICall(server, AuthMocks.getMockAuthLoginResponse());
  await mockAPICall(server, AuthMocks.getMockAuthAccessTokenResponse());
}

/**
 * Creates a new UserStorageMockttpController instance
 * @returns A new controller instance for user storage mocking
 */
export function createUserStorageController(): UserStorageMockttpController {
  return new UserStorageMockttpController();
}

/**
 * Sets up complete identity services (auth + storage) with default storage features
 * This is the original function, kept for backward compatibility
 * @param server - The Mockttp server instance
 * @returns An object containing the user storage controller instance
 */
export async function mockIdentityServices(server: Mockttp) {
  // Set up auth services
  await mockAuthServices(server);

  // Create and set up storage controller with default features
  const userStorageMockttpControllerInstance = createUserStorageController();

  await userStorageMockttpControllerInstance.setupPath(
    USER_STORAGE_FEATURE_NAMES.accounts,
    server,
  );
  await userStorageMockttpControllerInstance.setupPath(
    USER_STORAGE_FEATURE_NAMES.addressBook,
    server,
  );
  await userStorageMockttpControllerInstance.setupPath(
    USER_STORAGE_WALLETS_FEATURE_KEY,
    server,
  );
  await userStorageMockttpControllerInstance.setupPath(
    USER_STORAGE_GROUPS_FEATURE_KEY,
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

const getE2ESrpIdentifierForPublicKey = (publicKey: string) => {
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

async function mockAPICall(server: Mockttp, response: MockResponse) {
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

  await requestRuleBuilder
    ?.matching((request) => {
      const url = getDecodedProxiedURL(request.url);

      return url.includes(String(response.url));
    })
    .thenCallback(async (request) => {
      const { url, body } = request;
      const decodedPath = getDecodedProxiedURL(url);

      const [requestBodyJson, requestBodyText] = await Promise.all([
        body.getJson(),
        body.getText(),
      ]);
      const requestBody = requestBodyJson ?? requestBodyText;

      const json = (
        response.response as (
          requestBody: object | string | undefined,
          path: string,
          getE2ESrpIdentifierForPublicKey: (
            publicKey: string,
          ) => string | undefined,
        ) => void
      )(requestBody, decodedPath, getE2ESrpIdentifierForPublicKey);

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
export const setupAccountMockedBalances = async (
  mockServer: Mockttp,
  accounts: string[],
) => {
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

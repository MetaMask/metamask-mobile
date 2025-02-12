import { AuthenticationController } from '@metamask/profile-sync-controller';
import { UserStorageMockttpController } from './user-storage/userStorageMockttpController';
import { getDecodedProxiedURL } from './helpers';
import { USER_STORAGE_FEATURE_NAMES } from '@metamask/profile-sync-controller/sdk';

const AuthMocks = AuthenticationController.Mocks;

/**
 * E2E mock setup for identity APIs (Auth, UserStorage, Profile syncing)
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
    .thenCallback(() => ({
      statusCode: 200,
      json: response.response,
    }));
}

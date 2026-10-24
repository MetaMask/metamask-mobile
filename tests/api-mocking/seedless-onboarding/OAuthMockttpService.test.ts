import { getLocal, type Mockttp } from 'mockttp';

import { QAMockOAuthService } from '../../../app/core/OAuthService/QAMockOAuthService';
import { AuthServer } from './constants';
import { SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE } from './faultProfiles';
import { createOAuthMockttpService } from './OAuthMockttpService';

const proxyUrl = (serverUrl: string, targetUrl: string): string =>
  `${serverUrl}/proxy?url=${encodeURIComponent(targetUrl)}`;

const METADATA_SET_URL =
  'https://metadata.uat-api.cx.metamask.io/metadata/enc_account_data/set';
const SSS_STORE_URL = 'https://node-1.uat-node.web3auth.io/sss/jrpc';

describe('OAuthMockttpService', () => {
  let mockServer: Mockttp;
  let serverUrl: string;

  beforeEach(async () => {
    mockServer = getLocal({ cors: true });
    await mockServer.start(0);
    serverUrl = mockServer.url;
    const service = createOAuthMockttpService();
    service.configureGoogleNewUser();
    await service.setup(mockServer);
  });

  afterEach(async () => {
    await mockServer.stop();
  });

  it('mocks E2E_MOCK_OAUTH QA token exchange without live auth-service', async () => {
    const emailId = 'abc1234567890+e2e@web3auth.io';
    const proxiedUrl = `${serverUrl}/proxy?url=${encodeURIComponent(
      AuthServer.MockRequestToken,
    )}`;

    const response = await fetch(proxiedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'byoa-auth-secret': 'test-secret',
      },
      body: JSON.stringify({
        email_id: emailId,
        client_id: 'e2e-mock-google-client-id',
        login_provider: 'google',
        access_type: 'offline',
      }),
    });

    expect(response.status).toBe(200);
    const rawResponse: unknown = await response.json();
    const parsed = QAMockOAuthService.parseAuthServiceResponse(rawResponse);
    expect(parsed.id_token).toEqual(expect.any(String));
    expect(parsed.access_token).toEqual(expect.any(String));
    expect(parsed.metadata_access_token).toEqual(expect.any(String));
    expect(parsed.refresh_token).toEqual(expect.any(String));
  });
});

describe('OAuthMockttpService Wave 1 HTTP faults', () => {
  let mockServer: Mockttp;
  let serverUrl: string;

  const setupWithProfile = async (
    faultProfile: (typeof SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE)[keyof typeof SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE],
  ) => {
    mockServer = getLocal({ cors: true });
    await mockServer.start(0);
    serverUrl = mockServer.url;
    const service = createOAuthMockttpService();
    service.configureGoogleExistingUser();
    await service.setup(mockServer, { faultProfile });
  };

  afterEach(async () => {
    await mockServer.stop();
  });

  it('returns 500 on SSS store for sss_store_fails', async () => {
    await setupWithProfile(
      SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE.SssStoreFails,
    );

    const response = await fetch(proxyUrl(serverUrl, SSS_STORE_URL), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'TOPRFStoreKeyShareRequest',
        id: 1,
      }),
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: { message: 'E2E fault profile: SSS store failed' },
    });
  });

  it('returns 500 on metadata set for metadata_set_fails_after_sss_ok', async () => {
    await setupWithProfile(
      SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE.MetadataSetFailsAfterSssOk,
    );

    const response = await fetch(proxyUrl(serverUrl, METADATA_SET_URL), {
      method: 'POST',
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      message: 'E2E fault profile: metadata set failed after SSS commit',
    });
  });

  it('returns 504 on metadata set for change_enc_key_times_out', async () => {
    await setupWithProfile(
      SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE.ChangeEncKeyTimesOut,
    );

    const response = await fetch(proxyUrl(serverUrl, METADATA_SET_URL), {
      method: 'POST',
    });

    expect(response.status).toBe(504);
  });

  it('leaves metadata set at 200 when the profile is a controller hop', async () => {
    await setupWithProfile(
      SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE.KeySyncStoreFails,
    );

    const response = await fetch(proxyUrl(serverUrl, METADATA_SET_URL), {
      method: 'POST',
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ success: true });
  });
});

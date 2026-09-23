import { getLocal, type Mockttp } from 'mockttp';

import { QAMockOAuthService } from '../../../app/core/OAuthService/QAMockOAuthService';
import { AuthServer } from './constants';
import { SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE } from './faultProfiles';
import { createOAuthMockttpService } from './OAuthMockttpService';

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

describe('OAuthMockttpService fault profiles', () => {
  let mockServer: Mockttp;
  let serverUrl: string;

  const proxyUrl = (path: string): string =>
    `${serverUrl}/proxy?url=${encodeURIComponent(`https://example.test${path}`)}`;

  beforeEach(async () => {
    mockServer = getLocal({ cors: true });
    await mockServer.start(0);
    serverUrl = mockServer.url;

    const service = createOAuthMockttpService();
    service.configureGoogleNewUser();
    await service.setup(mockServer, {
      faultProfile:
        SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE.MetadataSetFailsAfterSssOk,
    });
  });

  afterEach(async () => {
    await mockServer.stop();
  });

  it('returns 500 for metadata set after SSS stays successful', async () => {
    const sssResponse = await fetch(proxyUrl('/sss/jrpc'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'TOPRFStoreKeyShareRequest',
        id: 1,
      }),
    });
    const metadataResponse = await fetch(
      proxyUrl('/metadata/enc_account_data/set'),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      },
    );

    expect(sssResponse.status).toBe(200);
    expect(metadataResponse.status).toBe(500);
  });

  it('returns 500 for metadata batch_set', async () => {
    const metadataResponse = await fetch(
      proxyUrl('/metadata/enc_account_data/batch_set'),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      },
    );

    expect(metadataResponse.status).toBe(500);
  });
});

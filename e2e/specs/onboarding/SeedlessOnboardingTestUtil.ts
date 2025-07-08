import { LoginHandlerResult } from '../../../app/core/OAuthService/OAuthInterface';

interface MockResponse {
  urlEndpoint: string;
  responseCode: number;
  response: any;
}

interface MockData {
  GET?: MockResponse[];
  POST?: MockResponse[];
}

const mockUrls = {
  oauthServiceLogin: 'https://mock-oauth-service-login',
}

export async function getMockedOAuthLoginResponse(): Promise<LoginHandlerResult> {
  const response = await fetch(mockUrls.oauthServiceLogin, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return await response.json();
}

export function generateMockOAuthLoginResponse(response: LoginHandlerResult) {
  return {
    urlEndpoint: mockOAuthServiceLoginURL,
    response,
    responseCode: 200,
  };
}

export const applyMock = (mockServer: any, mockData: MockData) => {
  if (mockData.GET) {
    for (const mock of mockData.GET) {
      mockServer
      .forGet()
      .matching((request: any) => {
        const url = getDecodedProxiedURL(request.url);
        return url.includes(mock.urlEndpoint);
      }).thenCallback(() => ({
        statusCode: mock.responseCode,
            json: mock.response,
        }));
    }
  }

};

const getDecodedProxiedURL = (url: string) =>
  decodeURIComponent(String(new URL(url).searchParams.get('url')));
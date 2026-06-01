import { SDK } from '@metamask/profile-sync-controller';
import { KeyringTypes } from '@metamask/keyring-controller';
import Engine from '../../../core/Engine';
import { authEnv } from '../../../core/devApiEnv';

const CLI_DASHBOARD_TOKEN_PATH = '/api/v2/mm-qr-login/token';

interface CliDashboardTokenResponse {
  access_token?: unknown;
}

const getPrimaryEntropySourceId = (): string | undefined => {
  const keyrings = Engine.context.KeyringController.state.keyrings;
  return (
    keyrings.find((keyring) => keyring.type === KeyringTypes.hd)?.metadata.id ??
    keyrings[0]?.metadata.id
  );
};

const getCliDashboardTokenUrl = (): string => {
  const url = new URL(SDK.getEnvUrls(authEnv()).authApiUrl);
  url.pathname = CLI_DASHBOARD_TOKEN_PATH;
  return url.toString();
};

const getCliDashboardAccessToken = async (
  hydraToken: string,
): Promise<string> => {
  const response = await fetch(getCliDashboardTokenUrl(), {
    method: 'POST',
    headers: { Authorization: `Bearer ${hydraToken}` },
    body: '',
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => response.statusText);
    throw new Error(
      `Failed to get CLI dashboard token: ${response.status} ${errorBody}`,
    );
  }

  const data = (await response.json()) as CliDashboardTokenResponse;
  if (typeof data.access_token !== 'string' || !data.access_token) {
    throw new Error('Failed to get CLI dashboard token: missing access_token');
  }

  return data.access_token;
};

export const MfaWebviewAuthService = {
  getCliDashboardTokenUrl,

  async getAuthToken(): Promise<string> {
    const hydraToken =
      await Engine.context.AuthenticationController.getBearerToken(
        getPrimaryEntropySourceId(),
      );

    if (!hydraToken) {
      throw new Error('No bearer token available — is the user signed in?');
    }

    return getCliDashboardAccessToken(hydraToken);
  },
};

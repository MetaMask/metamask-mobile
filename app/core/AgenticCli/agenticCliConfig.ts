import { SDK } from '@metamask/profile-sync-controller';
import { getBuildType } from '../OAuthService/OAuthLoginHandlers/constants';
import { authEnv } from '../devApiEnv';

export const CLI_DASHBOARD_TOKEN_PATH = '/api/v2/mm-qr-login/token';

export const ENGINE_READY_POLL_MS = 250;

export const DASHBOARD_WEBVIEW_URL_BY_ENV: Record<string, string> = {
  main_dev: 'https://test-dashboard.web3auth.io/agentic/login',
  main_uat: 'https://dev-dashboard.web3auth.io/agentic/login',
  main_prod: 'https://developer.metamask.io/agentic/login',
  flask_dev: 'https://test-dashboard.web3auth.io/agentic/login',
  flask_uat: 'https://dev-dashboard.web3auth.io/agentic/login',
  flask_prod: 'https://developer.metamask.io/agentic/login',
};

export const getDashboardWebviewUrl = (): string => {
  const buildType = getBuildType();
  return (
    DASHBOARD_WEBVIEW_URL_BY_ENV[buildType] ??
    DASHBOARD_WEBVIEW_URL_BY_ENV.main_prod
  );
};

export const getCliDashboardTokenUrl = (): string => {
  const url = new URL(SDK.getEnvUrls(authEnv()).authApiUrl);
  url.pathname = CLI_DASHBOARD_TOKEN_PATH;
  return url.toString();
};

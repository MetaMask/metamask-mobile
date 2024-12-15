import AppConstants from '../../core/AppConstants';

export function isMMPortfolioAPIEnabled() {
  return process.env.MM_PORTFOLIO_API_ENABLED === 'true';
}

export async function getMMPortfolioHealthCheck<T>(): Promise<T> {
  return request('');
}

async function request(endpoint: string, options?: RequestInit) {
  const url = getUrl(endpoint);

  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(
      `MM Portfolio API request failed with status: ${response.status}`,
    );
  }

  return response.json();
}

function getUrl(endpoint: string) {
  const host = AppConstants.PORTFOLIO_API.URL;

  if (!host) {
    throw new Error('MM Portfolio API URL is not set');
  }

  return `${host}/${endpoint}`;
}

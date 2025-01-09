import AppConstants from '../../core/AppConstants';

export async function getMMPortfolioHealthCheck<T>(): Promise<T> {
  return request('', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
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

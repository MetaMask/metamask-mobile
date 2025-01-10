import AppConstants from '../../../core/AppConstants';
import { TokenSearchResponseItem } from './types';

export async function getMMPortfolioHealthCheck<T>(): Promise<T> {
  return request('');
}

export async function getMMPortfolioTokensSearch<T = TokenSearchResponseItem[]>(
  chains: string[] = [],
  name?: string,
  limit?: string,
): Promise<T> {
  const queryParams = new URLSearchParams();

  if (chains.length > 0) {
    queryParams.append('chains', chains.join());
  }
  if (name) {
    queryParams.append('name', name);
  }
  if (limit) {
    queryParams.append('limit', limit);
  }

  const endpoint = `tokens-search/name?${queryParams.toString()}`;
  try {
    return await request(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('Failed to fetch MM Portfolio tokens search:', error);
    throw new Error(
      `Failed to fetch MM Portfolio tokens search: ${error.message}`,
    );
  }
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
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

import type { CrossmintEnvironment } from './types';

export function getCrossmintEnvironment(): CrossmintEnvironment {
  return process.env.MM_CROSSMINT_ENV === 'production'
    ? 'production'
    : 'staging';
}

export function getCrossmintBaseUrl(
  environment: CrossmintEnvironment = getCrossmintEnvironment(),
): string {
  return environment === 'production'
    ? 'https://www.crossmint.com'
    : 'https://staging.crossmint.com';
}

export function getCrossmintClientApiKey(): string {
  return process.env.MM_CROSSMINT_CLIENT_API_KEY ?? '';
}

export function isCrossmintConfigured(): boolean {
  return getCrossmintClientApiKey().length > 0;
}

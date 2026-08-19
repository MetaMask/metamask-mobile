import { RAMPS_COUNTRIES_RESPONSE } from './ramps-countries-response.ts';
import { RAMPS_AGGREGATOR_COUNTRIES_RESPONSE } from './ramps-aggregator-countries-response.ts';
import { RAMPS_DEPOSIT_COUNTRIES_RESPONSE } from './ramps-deposit-countries-response.ts';

export function isDepositCountriesRequest(url: string): boolean {
  const parsedUrl = new URL(url);

  return (
    parsedUrl.pathname === '/regions/countries' &&
    parsedUrl.searchParams.get('action') === 'deposit'
  );
}

export function getCountryResponseForUrl(url: string) {
  const parsedUrl = new URL(url);

  if (parsedUrl.pathname === '/v2/regions/countries') {
    return RAMPS_COUNTRIES_RESPONSE;
  }

  if (isDepositCountriesRequest(url)) {
    return RAMPS_DEPOSIT_COUNTRIES_RESPONSE;
  }

  return RAMPS_AGGREGATOR_COUNTRIES_RESPONSE;
}

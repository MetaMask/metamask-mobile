import { CardLocation } from '../types';

/**
 * Maps a country code to a CardLocation
 * @param countryCode ISO 3166 alpha-2 country code (e.g., 'US', 'GB')
 * @returns CardLocation ('us' or 'international')
 */
export const mapCountryToLocation = (
  countryCode: string | null,
): CardLocation => {
  if (countryCode === 'US') {
    return 'us';
  }
  return 'international';
};

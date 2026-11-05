import { useSelector } from 'react-redux';
import {
  isMoneyAccountFundingChannel,
  selectCardImmersveCountryFunding,
  type ImmersveFundingChannel,
} from '../../../../selectors/featureFlagController/card';

/**
 * Funding channel for a country that may come from route params rather than
 * the selected-country selector. Returns null when Immersve does not claim
 * the country or the channel does not resolve.
 */
export function useImmersveFundingChannel(
  country: string | null | undefined,
): ImmersveFundingChannel | null {
  const countryFunding = useSelector(selectCardImmersveCountryFunding);
  if (!country || !countryFunding) {
    return null;
  }
  return countryFunding[country.toUpperCase()] ?? null;
}

/** True when `country` is claimed by an Immersve Money account channel. */
export function useIsImmersveMoneyAccountCountry(
  country: string | null | undefined,
): boolean {
  return isMoneyAccountFundingChannel(useImmersveFundingChannel(country));
}

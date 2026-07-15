import { useCallback, useMemo } from 'react';
import { useCardSDK } from '../sdk';
import useRegistrationSettings from './useRegistrationSettings';
import { countryCodeToFlag } from '../util/countryCodeToFlag';
import type { Region } from '../types';

/**
 * Centralized hook for Card onboarding regions: composes useCardSDK (user) and
 * useRegistrationSettings (countries), and exposes sorted regions, O(1) lookup,
 * and pre-resolved userCountry / userNationality.
 */
const useRegions = () => {
  const { user } = useCardSDK();
  const { data: registrationSettings, isLoading } = useRegistrationSettings();

  const allRegions: Region[] = useMemo(() => {
    if (!registrationSettings?.countries) {
      return [];
    }
    return [...registrationSettings.countries]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((country) => ({
        key: country.iso3166alpha2,
        name: country.name,
        emoji: countryCodeToFlag(country.iso3166alpha2),
        areaCode: country.callingCode,
        canSignUp: country.canSignUp,
      }));
  }, [registrationSettings]);

  const signUpRegions: Region[] = useMemo(
    () => allRegions.filter((r) => r.canSignUp === true),
    [allRegions],
  );

  const regionsByCode: Map<string, Region> = useMemo(
    () => new Map(allRegions.map((r) => [r.key, r])),
    [allRegions],
  );

  const getRegionByCode = useCallback(
    (code: string | null | undefined): Region | null =>
      code ? (regionsByCode.get(code) ?? null) : null,
    [regionsByCode],
  );

  const userCountry = useMemo(
    () => getRegionByCode(user?.countryOfResidence),
    [getRegionByCode, user?.countryOfResidence],
  );

  const userNationality = useMemo(
    () => getRegionByCode(user?.countryOfNationality),
    [getRegionByCode, user?.countryOfNationality],
  );

  return {
    allRegions,
    signUpRegions,
    regionsByCode,
    getRegionByCode,
    userCountry,
    userNationality,
    isLoading,
  };
};

export default useRegions;

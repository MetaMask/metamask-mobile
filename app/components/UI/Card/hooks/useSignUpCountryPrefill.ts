import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { mapCountryToLocation } from '../util/mapCountryToLocation';
import {
  buildCountryPrefillAnalytics,
  cardProviderIdForPrefillCountry,
  prefillCountryKeyForSignUp,
  regionForSignUpCountryPrefill,
  signUpCountryPrefillViewProperties,
} from '../util/countryPrefill';
import {
  selectGeolocationLocation,
  selectGeolocationStatus,
} from '../../../../selectors/geolocationController';
import type { Region } from '../types';

interface UseSignUpCountryPrefillParams {
  fromMigration: boolean;
  allRegions: Region[];
  getRegionByCode: (code: string | null | undefined) => Region | null;
  isRegistrationSettingsFetched: boolean;
  immersveCountries: readonly string[];
  immersveOnboardingEnabled: boolean;
  migrationAnalyticsProps: Record<string, unknown>;
  selectedCountry: Region | null;
  setSelectedCountry: (region: Region) => void;
  setPhoneRegion: (region: Region) => void;
}

const writeMatchedCountry = (
  matchedRegion: Region,
  fromMigration: boolean,
  setSelectedCountry: (region: Region) => void,
  setPhoneRegion: (region: Region) => void,
): void => {
  setSelectedCountry(matchedRegion);
  setPhoneRegion(matchedRegion);
  // Migration keeps the country in local UI. Writing it to the controller
  // would switch the active provider.
  if (fromMigration) {
    return;
  }

  Engine.context.CardController.setUserLocation(
    mapCountryToLocation(matchedRegion.key),
  );
  Engine.context.CardController.setSelectedCountry(matchedRegion.key);
};

const selectPrefillRegion = ({
  alreadySelected,
  hasRegions,
  fromMigration,
  geolocationStatus,
  geolocation,
  getRegionByCode,
  setSelectedCountry,
  setPhoneRegion,
}: {
  alreadySelected: boolean;
  hasRegions: boolean;
  fromMigration: boolean;
  geolocationStatus: string | null | undefined;
  geolocation: string | null | undefined;
  getRegionByCode: (code: string | null | undefined) => Region | null;
  setSelectedCountry: (region: Region) => void;
  setPhoneRegion: (region: Region) => void;
}): Region | null => {
  if (alreadySelected || !hasRegions) {
    return null;
  }

  const matchedRegion = regionForSignUpCountryPrefill({
    fromMigration,
    geolocationStatus,
    geolocation,
    getRegionByCode,
  });
  if (!matchedRegion) {
    return null;
  }

  writeMatchedCountry(
    matchedRegion,
    fromMigration,
    setSelectedCountry,
    setPhoneRegion,
  );
  return matchedRegion;
};

/**
 * Prefills the sign-up country once per visit and records the result on
 * `Card Viewed` after registration settings and geolocation have settled.
 */
export const useSignUpCountryPrefill = ({
  fromMigration,
  allRegions,
  getRegionByCode,
  isRegistrationSettingsFetched,
  immersveCountries,
  immersveOnboardingEnabled,
  migrationAnalyticsProps,
  selectedCountry,
  setSelectedCountry,
  setPhoneRegion,
}: UseSignUpCountryPrefillParams): void => {
  const hasAutoSelectedCountry = useRef(false);
  const hasTrackedCountryPrefill = useRef(false);
  const geoLocation = useSelector(selectGeolocationLocation);
  const geolocationStatus = useSelector(selectGeolocationStatus);
  const { trackEvent, createEventBuilder } = useAnalytics();

  useEffect(() => {
    // Both flags latch the visit: a later registration-settings refetch must
    // not overwrite a selection or emit another sign-up view.
    if (hasTrackedCountryPrefill.current && hasAutoSelectedCountry.current) {
      return;
    }

    const matchedRegion = selectPrefillRegion({
      alreadySelected: hasAutoSelectedCountry.current,
      hasRegions: allRegions.length > 0,
      fromMigration,
      geolocationStatus,
      geolocation: geoLocation,
      getRegionByCode,
      setSelectedCountry,
      setPhoneRegion,
    });
    if (matchedRegion) {
      hasAutoSelectedCountry.current = true;
    }

    if (hasTrackedCountryPrefill.current) {
      return;
    }

    const prefillAnalytics = buildCountryPrefillAnalytics({
      fromMigration,
      registrationSettingsFetched: isRegistrationSettingsFetched,
      hasRegistrationCountries: allRegions.length > 0,
      geolocationStatus,
      geolocation: geoLocation,
      matchedCountry: !fromMigration && hasAutoSelectedCountry.current,
    });
    if (!prefillAnalytics) {
      return;
    }

    hasTrackedCountryPrefill.current = true;
    const countryKey = prefillCountryKeyForSignUp({
      fromMigration,
      matchedRegionKey: matchedRegion?.key,
      selectedCountryKey: selectedCountry?.key,
    });
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties(
          signUpCountryPrefillViewProperties({
            prefillAnalytics,
            provider: cardProviderIdForPrefillCountry(
              countryKey,
              immersveOnboardingEnabled,
              immersveCountries,
            ),
            migrationAnalyticsProps,
          }),
        )
        .build(),
    );
  }, [
    allRegions.length,
    createEventBuilder,
    fromMigration,
    geoLocation,
    geolocationStatus,
    getRegionByCode,
    immersveCountries,
    immersveOnboardingEnabled,
    isRegistrationSettingsFetched,
    migrationAnalyticsProps,
    selectedCountry?.key,
    setPhoneRegion,
    setSelectedCountry,
    trackEvent,
  ]);
};

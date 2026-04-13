import { useSelector } from 'react-redux';
import {
  selectCardSupportedCountries,
  selectDisplayCardButtonFeatureFlag,
} from '../../../../selectors/featureFlagController/card';
import { selectAlwaysShowCardButton } from '../../../../core/redux/slices/card';
import { selectGeolocationLocation } from '../../../../selectors/geolocationController';

export const isBaanxLoginEnabled = (params: {
  alwaysShowCardButton: boolean;
  geolocationLocation: string;
  cardSupportedCountries: Record<string, boolean>;
  displayCardButtonFeatureFlag: boolean;
}) =>
  params.alwaysShowCardButton ||
  (params.cardSupportedCountries?.[params.geolocationLocation] === true &&
    params.displayCardButtonFeatureFlag) ||
  false;

const useIsBaanxLoginEnabled = () => {
  const displayCardButtonFeatureFlag = useSelector(
    selectDisplayCardButtonFeatureFlag,
  );
  const alwaysShowCardButton = useSelector(selectAlwaysShowCardButton);
  const geolocationLocation = useSelector(selectGeolocationLocation);
  const cardSupportedCountries = useSelector(selectCardSupportedCountries);

  // If user has explicitly enabled the experimental switch,
  // they should have full access to the feature including authentication/onboarding,
  // regardless of the progressive rollout flag state
  return isBaanxLoginEnabled({
    alwaysShowCardButton,
    geolocationLocation,
    displayCardButtonFeatureFlag,
    cardSupportedCountries: cardSupportedCountries as Record<string, boolean>,
  });
};

export default useIsBaanxLoginEnabled;

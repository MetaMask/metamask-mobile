import { useSelector } from 'react-redux';
import {
  selectCardSupportedCountries,
  selectDisplayCardButtonFeatureFlag,
} from '../../../../selectors/featureFlagController/card';
import {
  selectAlwaysShowCardButton,
  selectCardGeoLocation,
} from '../../../../core/redux/slices/card';

export const isBaanxLoginEnabled = (params: {
  alwaysShowCardButton: boolean;
  cardGeoLocation: string;
  cardSupportedCountries: Record<string, boolean>;
  displayCardButtonFeatureFlag: boolean;
}) =>
  params.alwaysShowCardButton ||
  (params.cardSupportedCountries?.[params.cardGeoLocation] === true &&
    params.displayCardButtonFeatureFlag) ||
  false;

const useIsBaanxLoginEnabled = () => {
  const displayCardButtonFeatureFlag = useSelector(
    selectDisplayCardButtonFeatureFlag,
  );
  const alwaysShowCardButton = useSelector(selectAlwaysShowCardButton);
  const cardGeoLocation = useSelector(selectCardGeoLocation);
  const cardSupportedCountries = useSelector(selectCardSupportedCountries);

  // If user has explicitly enabled the experimental switch,
  // they should have full access to the feature including authentication/onboarding,
  // regardless of the progressive rollout flag state
  return isBaanxLoginEnabled({
    alwaysShowCardButton,
    cardGeoLocation,
    displayCardButtonFeatureFlag,
    cardSupportedCountries: cardSupportedCountries as Record<string, boolean>,
  });
};

export default useIsBaanxLoginEnabled;

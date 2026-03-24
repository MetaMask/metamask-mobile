import NavigationService from '../../../NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import ReduxService from '../../../redux';
import { getDetectedGeolocation } from '../../../../reducers/fiatOrders';
import { ONDO_RESTRICTED_COUNTRIES } from '../../../../util/ondoGeoRestrictions';

interface HandleTrendingUrlParams {
  actionPath: string;
}

const isGeoBlockedForStocks = (location: string | undefined): boolean => {
  if (__DEV__) {
    return false;
  }

  const countryCode = location?.toUpperCase().split('-')[0];
  return !countryCode || ONDO_RESTRICTED_COUNTRIES.has(countryCode);
};

const shouldOpenStocksScreen = (actionPath: string): boolean => {
  const urlParams = new URLSearchParams(
    actionPath.includes('?') ? actionPath.split('?')[1] : '',
  );

  return urlParams.get('screen')?.toLowerCase() === 'stocks';
};

export function handleTrendingUrl({ actionPath }: HandleTrendingUrlParams) {
  if (!shouldOpenStocksScreen(actionPath)) {
    NavigationService.navigation.navigate(Routes.TRENDING_VIEW);
    return;
  }

  const state = ReduxService.store.getState();
  const geolocation = getDetectedGeolocation(state);

  if (isGeoBlockedForStocks(geolocation)) {
    NavigationService.navigation.navigate(Routes.TRENDING_VIEW);
    return;
  }

  NavigationService.navigation.navigate(Routes.WALLET.RWA_TOKENS_FULL_VIEW);
}

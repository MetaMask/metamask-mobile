import Routes from '../../../../constants/navigation/Routes';
import { createNavigationDetails } from '../../../../util/navigation/navUtils';

/**
 * Nav-details helper for the ProfileDrawerProfileCreate stub screen. Route
 * registration in App.tsx / RootStackParamList is owned by a parallel change.
 */
export const createProfileDrawerProfileCreateNavDetails =
  createNavigationDetails(Routes.PROFILE_DRAWER.PROFILE_CREATE);

export { default } from './ProfileCreate';

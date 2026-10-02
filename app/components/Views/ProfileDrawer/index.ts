import Routes from '../../../constants/navigation/Routes';
import { createNavigationDetails } from '../../../util/navigation/navUtils';

/**
 * Nav-details helper for the Profile Drawer hub screen. Route registration in
 * App.tsx / RootStackParamList is owned by a parallel change.
 */
export const createProfileDrawerNavDetails = createNavigationDetails(
  Routes.PROFILE_DRAWER.ROOT,
);

export { createProfileDrawerProfileCreateNavDetails } from './ProfileCreate';
export { default as ProfileCreate } from './ProfileCreate/ProfileCreate';
export { default as ProfileDrawer } from './ProfileDrawer';
export { default } from './ProfileDrawer';

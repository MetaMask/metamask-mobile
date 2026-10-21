import Routes from '../../../../constants/navigation/Routes';
import { createNavigationDetails } from '../../../../util/navigation/navUtils';

/** Route takes no params; callers pass `{}`. */
export const createProfileDrawerNavDetails = createNavigationDetails(
  Routes.SOCIAL_PROFILE.DRAWER,
);

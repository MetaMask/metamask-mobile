import Routes from '../../../../constants/navigation/Routes';
import { createNavigationDetails } from '../../../../util/navigation/navUtils';

/**
 * Nav details for the profile drawer. The route takes no params
 * (`ProfileDrawer: undefined` in `RootStackParamList`); callers pass `{}`.
 */
export const createProfileDrawerNavDetails = createNavigationDetails(
  Routes.SOCIAL_PROFILE.DRAWER,
);

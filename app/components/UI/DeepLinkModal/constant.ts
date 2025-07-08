import { createNavigationDetails } from '../../../util/navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';

/* eslint-disable import/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
export const foxLogo = require('../../../images/branding/fox.png');
export const pageNotFound = require('images/page-not-found.png');
export const createDeepLinkModalNavDetails = createNavigationDetails(
  Routes.MODAL.ROOT_MODAL_FLOW,
  Routes.MODAL.DEEP_LINK_MODAL,
);

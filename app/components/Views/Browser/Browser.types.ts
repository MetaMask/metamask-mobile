import { createNavigationDetails } from '../../../util/navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';

export interface BrowserParams {
  newTabUrl?: string;
  timestamp?: number;
  showTabsView?: boolean;
}

const createBrowserNavDetails = createNavigationDetails<BrowserParams>(
  Routes.BROWSER.HOME,
  Routes.BROWSER.VIEW,
);

export default createBrowserNavDetails;

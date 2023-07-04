import { createNavigationDetails } from '../../../util/navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';

interface BrowserParams {
  newTabUrl?: string;
  timestamp?: number;
}

const createBrowserNavDetails = createNavigationDetails<BrowserParams>(
  Routes.BROWSER.HOME,
  Routes.BROWSER.VIEW,
);

export default createBrowserNavDetails;

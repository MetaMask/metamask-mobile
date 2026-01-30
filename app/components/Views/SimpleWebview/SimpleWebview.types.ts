import { createNavigationDetails } from '../../../util/navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';

const createWebviewNavDetails = createNavigationDetails(
  Routes.WEBVIEW.MAIN,
  Routes.WEBVIEW.SIMPLE,
);

export default createWebviewNavDetails;

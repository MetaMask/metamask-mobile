import { createNavigationDetails } from '../../../util/navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';

interface WebviewParams {
  url?: string;
  title?: string;
}

const createWebviewNavDetails = createNavigationDetails<WebviewParams>(
  Routes.WEBVIEW.MAIN,
  Routes.WEBVIEW.SIMPLE,
);

export default createWebviewNavDetails;

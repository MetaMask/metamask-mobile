import { createNavigationDetails } from '../../../util/navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';
import type { SimpleWebviewParams } from '../Webview/Webview.types';

// Re-export for backwards compatibility
export type { SimpleWebviewParams };

const createWebviewNavDetails = createNavigationDetails<SimpleWebviewParams>(
  Routes.WEBVIEW.MAIN,
  Routes.WEBVIEW.SIMPLE,
);

export default createWebviewNavDetails;

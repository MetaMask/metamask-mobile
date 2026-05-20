import { createNavigationDetails } from '../../../util/navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { SimpleWebviewParams } from '../Webview/Webview.types';

// Re-export for backwards compatibility
export type { SimpleWebviewParams };

const createWebviewNavDetails = createNavigationDetails<SimpleWebviewParams>(
  Routes.WEBVIEW.MAIN,
  Routes.WEBVIEW.SIMPLE,
);

export default createWebviewNavDetails;

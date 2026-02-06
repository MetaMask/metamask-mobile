import { createNavigationDetails } from '../../../util/navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';

export interface BrowserParams {
  newTabUrl?: string;
  timestamp?: number | string;
  showTabsView?: boolean;
  existingTabId?: number;
  fromTrending?: boolean;
  fromPerps?: boolean;
  linkType?: string;
  url?: string;
}

export interface BrowserTab {
  id: number;
  url?: string;
  image?: string;
  isArchived?: boolean;
  linkType?: string;
}

export interface BrowserNavigation {
  setOptions: (options: Record<string, unknown>) => void;
  setParams: (params: Record<string, unknown>) => void;
  navigate: (route: string, params?: Record<string, unknown>) => void;
  goBack: () => void;
}

export interface BrowserRoute {
  params: Partial<BrowserParams>;
}

export interface BrowserComponentProps {
  navigation: BrowserNavigation;
  createNewTab: (url?: string, linkType?: string) => void;
  closeAllTabs: () => void;
  closeTab: (id: number) => void;
  setActiveTab: (id: number) => void;
  updateTab: (id: number, data: Record<string, unknown>) => void;
  tabs: BrowserTab[];
  activeTab: number | null;
  route: BrowserRoute;
}

const createBrowserNavDetails = createNavigationDetails<BrowserParams>(
  Routes.BROWSER.HOME,
  Routes.BROWSER.VIEW,
);

export default createBrowserNavDetails;

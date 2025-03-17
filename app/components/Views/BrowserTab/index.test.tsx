import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import BrowserTab from './BrowserTab';
import AppConstants from '../../../core/AppConstants';
import { RecommendedAction } from '@metamask/phishing-controller';

const mockNavigation = {
  goBack: jest.fn(),
  goForward: jest.fn(),
  canGoBack: true,
  canGoForward: true,
  addListener: jest.fn(),
};

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => mockNavigation,
    useIsFocused: () => true,
  };
});

jest.mock('react-native-material-textfield', () => ({
  OutlinedTextField: 'OutlinedTextField',
}));

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

const mockInitialState = {
  browser: { activeTab: '' },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
  transaction: {
    selectedAsset: '',
  },
};

// Mock the scanUrl function of PhishingController
const mockScanUrl = jest.fn();

jest.mock('../../../core/Engine', () => ({
  context: {
    PhishingController: {
      maybeUpdateState: jest.fn(),
      test: () => ({ result: true, name: '' }),
      scanUrl: (url: string) => mockScanUrl(url),
    },
    NetworkController: {
      getProviderAndBlockTracker: () => ({
        provider: {},
      }),
    },
    PermissionController: {
      state: {},
      getCaveat: jest.fn(),
    },
  },
}));

// Common props for BrowserTab component
const mockProps = {
  id: 1,
  activeTab: 1,
  defaultProtocol: 'https://',
  selectedAddress: '0x123',
  whitelist: [],
  bookmarks: [],
  searchEngine: 'Google',
  newTab: jest.fn(),
  addBookmark: jest.fn(),
  addToBrowserHistory: jest.fn(),
  addToWhitelist: jest.fn(),
  updateTabInfo: jest.fn(),
  showTabs: jest.fn(),
  setOnboardingWizardStep: jest.fn(),
  wizardStep: 1,
  isIpfsGatewayEnabled: false,
  chainId: '0x1',
  isInTabsView: false,
  initialUrl: 'https://metamask.io',
  homePageUrl: AppConstants.HOMEPAGE_URL,
};

describe('BrowserTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(<BrowserTab {...mockProps} />, {
      state: mockInitialState,
    });
    expect(toJSON()).toMatchSnapshot();
  });
  it('should allow whitelisted domains without calling scanUrl', async () => {
    // TODO
  });
  it('should allow domains that pass the phishing scan with None recommendation', async () => {
    // Mock the scanUrl to return a "None" result
  });
  it('should not allow domains with Block recommendation', async () => {
    mockScanUrl.mockResolvedValue({
      domainName: 'evildomain.com',
      url: 'https://evildomain.com',
      action: RecommendedAction.Block,
    });

    const props = {
      ...mockProps,
      initialUrl: 'https://evildomain.com',
    };

    renderWithProvider(<BrowserTab {...props} />, {
      state: mockInitialState,
    });

    expect(mockScanUrl).toHaveBeenCalled();
  });
  it('should not allow domains with Warn recommendation', async () => {
    // Mock the scanUrl to return a "Warn" result
  });
  it('should allow domains when phishing scan has a fetch error', async () => {
    // Mock the scanUrl to return a fetch error
  });
});

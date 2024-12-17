import React from 'react';
import { shallow } from 'enzyme';
import { BrowserTab } from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
const mockNavigation = {
  goBack: jest.fn(),
  goForward: jest.fn(),
  canGoBack: true,
  canGoForward: true,
};
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

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn().mockImplementation(() => mockInitialState),
}));

const mockStore = configureMockStore();
const store = mockStore(mockInitialState);

const mockProps = {
  id: 1,
  activeTab: 1,
  defaultProtocol: 'https://',
  ipfsGateway: 'https://gateway.ipfs.io/ipfs/',
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
  chainId: '1',
  isInTabsView: false,
};

describe('Browser', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <BrowserTab
          initialUrl="https://metamask.io"
          {...mockProps}
          navigation={mockNavigation}
        />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

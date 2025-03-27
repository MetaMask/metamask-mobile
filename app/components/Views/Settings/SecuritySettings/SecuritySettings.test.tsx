import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';

import SecuritySettings from './SecuritySettings';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { AUTO_LOCK_SECTION } from './Sections/AutoLock/constants';
import {
  CLEAR_BROWSER_HISTORY_SECTION,
  CLEAR_PRIVACY_SECTION,
  DELETE_METRICS_BUTTON,
  LOGIN_OPTIONS,
  META_METRICS_DATA_MARKETING_SECTION,
  META_METRICS_SECTION,
  REVEAL_PRIVATE_KEY_SECTION,
  SDK_SECTION,
  SECURITY_SETTINGS_DELETE_WALLET_BUTTON,
  TURN_ON_REMEMBER_ME,
} from './SecuritySettings.constants';
import { SecurityPrivacyViewSelectorsIDs } from '../../../../../e2e/selectors/Settings/SecurityAndPrivacy/SecurityPrivacyView.selectors';
import SECURITY_ALERTS_TOGGLE_TEST_ID from './constants';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';

const initialState = {
  privacy: { approvedHosts: {} },
  browser: { history: [] },
  settings: { lockTime: 1000, basicFunctionalityEnabled: true },
  user: { passwordSet: true },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      UserStorageController: {
        isProfileSyncingEnabled: false,
      },
    },
  },
  security: {
    allowLoginWithRememberMe: true,
  },
};

const mockSetOptions = jest.fn();
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions,
      goBack: mockGoBack,
    }),
    useFocusEffect: jest.fn(),
  };
});

jest.mock('@react-native-cookies/cookies', () => ({
  clearAll: jest.fn(),
  getAll: jest.fn().mockResolvedValue({}),
}));

let mockUseParamsValues: {
  scrollToDetectNFTs?: boolean;
} = {
  scrollToDetectNFTs: undefined,
};

jest.mock('../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../util/navigation/navUtils'),
  useParams: jest.fn(() => mockUseParamsValues),
}));

describe('SecuritySettings', () => {
  beforeEach(() => {
    mockUseParamsValues = {
      scrollToDetectNFTs: undefined,
    };
  });
  it('should render correctly', () => {
    const wrapper = renderWithProvider(<SecuritySettings />, {
      state: initialState,
    });
    expect(wrapper.toJSON()).toMatchSnapshot();
  });
  it('should render all sections', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <SecuritySettings />,
      {
        state: initialState,
      },
    );
    expect(getByText('Protect your wallet')).toBeTruthy();
    expect(
      getByTestId(SecurityPrivacyViewSelectorsIDs.CHANGE_PASSWORD_CONTAINER),
    ).toBeTruthy();
    expect(getByTestId(AUTO_LOCK_SECTION)).toBeTruthy();
    expect(getByTestId(LOGIN_OPTIONS)).toBeTruthy();
    expect(getByTestId(TURN_ON_REMEMBER_ME)).toBeTruthy();
    expect(getByTestId(REVEAL_PRIVATE_KEY_SECTION)).toBeTruthy();
    expect(getByTestId(SDK_SECTION)).toBeTruthy();
    expect(getByTestId(CLEAR_PRIVACY_SECTION)).toBeTruthy();
    expect(getByTestId(CLEAR_BROWSER_HISTORY_SECTION)).toBeTruthy();
    expect(getByTestId(META_METRICS_SECTION)).toBeTruthy();
    expect(getByTestId(DELETE_METRICS_BUTTON)).toBeTruthy();
    expect(getByTestId(META_METRICS_DATA_MARKETING_SECTION)).toBeTruthy();
    expect(getByTestId(SECURITY_SETTINGS_DELETE_WALLET_BUTTON)).toBeTruthy();
    expect(getByText('Automatic security checks')).toBeTruthy();
  });

  it('renders Blockaid settings', async () => {
    const { getByTestId, findByText } = renderWithProvider(
      <SecuritySettings />,
      {
        state: initialState,
      },
    );

    expect(await findByText('Security alerts')).toBeDefined();
    const toggle = getByTestId(SECURITY_ALERTS_TOGGLE_TEST_ID);
    expect(toggle).toBeDefined();
    expect(toggle.props.value).toBe(true);
  });
});

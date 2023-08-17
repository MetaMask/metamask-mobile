import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';

import SecuritySettings from './SecuritySettings';
import initialBackgroundState from '../../../../util/test/initial-background-state.json';
import { CHANGE_PASSWORD_TITLE_ID } from '../../../../constants/test-ids';
import { AUTO_LOCK_SECTION } from './Sections/AutoLock/constants';
import {
  BATCH_BALANCE_REQUESTS_SECTION,
  CLEAR_BROWSER_HISTORY_SECTION,
  CLEAR_PRIVACY_SECTION,
  DELETE_METRICS_BUTTON,
  IPFS_GATEWAY_SECTION,
  LOGIN_OPTIONS,
  META_METRICS_SECTION,
  NFT_AUTO_DETECT_MODE_SECTION,
  NFT_OPEN_SEA_MODE_SECTION,
  REVEAL_PRIVATE_KEY_SECTION,
  SDK_SECTION,
  SECURITY_SETTINGS_DELETE_WALLET_BUTTON,
  THIRD_PARTY_SECTION,
  TURN_ON_REMEMBER_ME,
} from './SecuritySettings.constants';

const initialState = {
  privacy: { approvedHosts: {} },
  browser: { history: [] },
  settings: { lockTime: 1000 },
  user: { passwordSet: true },
  engine: {
    backgroundState: initialBackgroundState,
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
    expect(getByTestId(CHANGE_PASSWORD_TITLE_ID)).toBeTruthy();
    expect(getByTestId(AUTO_LOCK_SECTION)).toBeTruthy();
    expect(getByTestId(LOGIN_OPTIONS)).toBeTruthy();
    expect(getByTestId(TURN_ON_REMEMBER_ME)).toBeTruthy();
    expect(getByTestId(REVEAL_PRIVATE_KEY_SECTION)).toBeTruthy();
    expect(getByTestId(SDK_SECTION)).toBeTruthy();
    expect(getByTestId(CLEAR_PRIVACY_SECTION)).toBeTruthy();
    expect(getByTestId(CLEAR_BROWSER_HISTORY_SECTION)).toBeTruthy();
    expect(getByTestId(META_METRICS_SECTION)).toBeTruthy();
    expect(getByTestId(DELETE_METRICS_BUTTON)).toBeTruthy();
    expect(getByTestId(SECURITY_SETTINGS_DELETE_WALLET_BUTTON)).toBeTruthy();
    expect(getByTestId(BATCH_BALANCE_REQUESTS_SECTION)).toBeTruthy();
    expect(getByTestId(THIRD_PARTY_SECTION)).toBeTruthy();
    expect(getByTestId(NFT_OPEN_SEA_MODE_SECTION)).toBeTruthy();
    expect(getByTestId(NFT_AUTO_DETECT_MODE_SECTION)).toBeTruthy();
    expect(getByTestId(IPFS_GATEWAY_SECTION)).toBeTruthy();
    expect(getByText('Automatic security checks')).toBeTruthy();
  });
});

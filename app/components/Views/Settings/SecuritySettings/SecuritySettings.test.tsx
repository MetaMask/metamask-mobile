import React from 'react';
import { act } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';

import SecuritySettings from './SecuritySettings';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { AUTO_LOCK_SECTION } from './Sections/AutoLock/constants';
import {
  BATCH_BALANCE_REQUESTS_SECTION,
  CLEAR_BROWSER_HISTORY_SECTION,
  CLEAR_PRIVACY_SECTION,
  DELETE_METRICS_BUTTON,
  IPFS_GATEWAY_SECTION,
  LOGIN_OPTIONS,
  META_METRICS_DATA_MARKETING_SECTION,
  META_METRICS_SECTION,
  NFT_AUTO_DETECT_MODE_SECTION,
  NFT_DISPLAY_MEDIA_MODE_SECTION,
  REVEAL_PRIVATE_KEY_SECTION,
  SDK_SECTION,
  SECURITY_SETTINGS_DELETE_WALLET_BUTTON,
  TURN_ON_REMEMBER_ME,
  USE_SAFE_CHAINS_LIST_VALIDATION,
} from './SecuritySettings.constants';
import { SecurityPrivacyViewSelectorsIDs } from '../../../../../e2e/selectors/Settings/SecurityAndPrivacy/SecurityPrivacyView.selectors';
import SECURITY_ALERTS_TOGGLE_TEST_ID from './constants';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.DeviceEventEmitter = {
    ...RN.DeviceEventEmitter,
    removeListener: jest.fn(),
  };
  return RN;
});

const initialState = {
  privacy: { approvedHosts: {} },
  browser: { history: [] },
  settings: { lockTime: 1000 },
  user: { passwordSet: true },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', async () => {
    let wrapper: ReturnType<typeof renderWithProvider> | undefined;
    await act(async () => {
      wrapper = renderWithProvider(<SecuritySettings />, {
        state: initialState,
      });
    });
    if (wrapper) {
      expect(wrapper).toBeTruthy();
    }
  });

  it('should render all sections', async () => {
    let getByText: (text: string) => HTMLElement;
    let getByTestId: (testId: string) => HTMLElement;
    await act(async () => {
      const result = renderWithProvider(<SecuritySettings />, {
        state: initialState,
      });
      getByText = result.getByText;
      getByTestId = result.getByTestId;

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
      expect(getByTestId(BATCH_BALANCE_REQUESTS_SECTION)).toBeTruthy();
      expect(
        SecurityPrivacyViewSelectorsIDs.INCOMING_TRANSACTIONS,
      ).toBeTruthy();
      expect(getByTestId(NFT_DISPLAY_MEDIA_MODE_SECTION)).toBeTruthy();
      expect(getByTestId(NFT_AUTO_DETECT_MODE_SECTION)).toBeTruthy();
      expect(getByTestId(IPFS_GATEWAY_SECTION)).toBeTruthy();
      expect(getByText('Automatic security checks')).toBeTruthy();
      expect(getByTestId(USE_SAFE_CHAINS_LIST_VALIDATION)).toBeTruthy();
    });
  });

  it('renders Blockaid settings', async () => {
    let getByTestId: (testId: string) => HTMLElement;
    let findByText: (text: string) => Promise<HTMLElement>;
    await act(async () => {
      ({ getByTestId, findByText } = renderWithProvider(<SecuritySettings />, {
        state: initialState,
      }));

      const securityAlertsElement = await findByText('Security alerts');
      expect(securityAlertsElement).toBeDefined();
      const toggle = getByTestId(SECURITY_ALERTS_TOGGLE_TEST_ID);
      expect(toggle).toBeDefined();
      expect(toggle).toHaveProperty('props.value', true);
    });
  });
});

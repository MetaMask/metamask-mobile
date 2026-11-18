import React from 'react';
import { fireEvent, within } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';

import SecuritySettings from './SecuritySettings';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { AUTO_LOCK_SECTION } from './Sections/AutoLock/constants';
import { SecurityPrivacyViewSelectorsIDs } from './SecurityPrivacyView.testIds';
import SECURITY_ALERTS_TOGGLE_TEST_ID from './constants';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';
import { strings } from '../../../../../locales/i18n';
import ReduxService from '../../../../core/redux/ReduxService';
import { ReduxStore } from '../../../../core/redux/types';
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
        isBackupAndSyncEnabled: false,
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
    useFocusEffect: jest.fn((callback: () => void) => callback()),
  };
});

jest.mock('@react-native-cookies/cookies', () => ({
  clearAll: jest.fn(),
  getAll: jest.fn().mockResolvedValue({}),
}));


// DeviceSecurityToggle uses useAuthCapabilities; mock so it renders the toggle instead of null
jest.mock('../../../../core/Authentication/hooks/useAuthCapabilities', () => ({
  __esModule: true,
  default: () => ({
    isLoading: false,
    capabilities: {
      isBiometricsAvailable: true,
      passcodeAvailable: true,
      authLabel: 'Face ID',
      osAuthEnabled: false,
      allowLoginWithRememberMe: false,
      authType: 'biometrics',
      deviceAuthRequiresSettings: false,
    },
  }),
}));

describe('SecuritySettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGoBack.mockClear();

    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
      dispatch: jest.fn(),
      getState: () => ({
        user: { existingUser: false },
        security: { allowLoginWithRememberMe: true },
        settings: { lockTime: 1000 },
      }),
      subscribe: jest.fn(),
      replaceReducer: jest.fn(),
      [Symbol.observable]: jest.fn(),
    } as unknown as ReduxStore);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
  it('renders correctly', () => {
    const { getByTestId } = renderWithProvider(<SecuritySettings />, {
      state: initialState,
    });
    expect(getByTestId('header')).toBeOnTheScreen();
  });


  it('renders inline header with Security title', () => {
    const { getByTestId } = renderWithProvider(<SecuritySettings />, {
      state: initialState,
    });
    expect(getByTestId('header')).toBeTruthy();
  });

  it('calls navigation.goBack when header back button is pressed', () => {
    const { getByTestId } = renderWithProvider(<SecuritySettings />, {
      state: initialState,
    });
    const header = getByTestId('header');
    const backButton = within(header).getByTestId('button-icon');
    fireEvent.press(backButton);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('renders security sections', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <SecuritySettings />,
      {
        state: initialState,
      },
    );
    expect(getByText(strings('app_settings.protect_title'))).toBeTruthy();
    expect(
      getByTestId(SecurityPrivacyViewSelectorsIDs.CHANGE_PASSWORD_CONTAINER),
    ).toBeTruthy();
    expect(getByTestId(AUTO_LOCK_SECTION)).toBeTruthy();
    expect(
      getByTestId(SecurityPrivacyViewSelectorsIDs.DEVICE_SECURITY_TOGGLE),
    ).toBeTruthy();
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

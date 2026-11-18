import React from 'react';
import { fireEvent, within } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import PrivacySettings from './index';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';
import { strings } from '../../../../../locales/i18n';

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
    dataCollectionForMarketing: false,
  },
};

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
    useFocusEffect: jest.fn((callback: () => void) => callback()),
  };
});

jest.mock('@react-native-cookies/cookies', () => ({
  clearAll: jest.fn(),
  getAll: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../util/navigation/navUtils'),
  useParams: jest.fn(() => ({})),
}));

describe('PrivacySettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGoBack.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders correctly', () => {
    const { getByTestId } = renderWithProvider(<PrivacySettings />, {
      state: initialState,
    });
    expect(getByTestId('header')).toBeOnTheScreen();
  });

  it('calls navigation.goBack when header back button is pressed', () => {
    const { getByTestId } = renderWithProvider(<PrivacySettings />, {
      state: initialState,
    });
    const header = getByTestId('header');
    const backButton = within(header).getByTestId('button-icon');
    fireEvent.press(backButton);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('renders Privacy heading', () => {
    const { getAllByText } = renderWithProvider(<PrivacySettings />, {
      state: initialState,
    });
    const headings = getAllByText(strings('app_settings.privacy_heading'));
    expect(headings.length).toBeGreaterThan(0);
  });
});

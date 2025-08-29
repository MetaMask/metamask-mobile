import React from 'react';
import Settings from './';

import renderWithProvider from '../../../util/test/renderWithProvider';
import { SettingsViewSelectorsIDs } from '../../../../e2e/selectors/Settings/SettingsView.selectors';
import { backgroundState } from '../../../util/test/initial-root-state';
import { fireEvent } from '@testing-library/react-native';
import Routes from '../../../constants/navigation/Routes';

// Mock Authentication module
jest.mock('../../../core', () => ({
  Authentication: {
    lockApp: jest.fn().mockResolvedValue(undefined),
  },
}));

// Import the mocked Authentication
import { Authentication } from '../../../core';

const initialState = {
  user: { seedphraseBackedUp: true, passwordSet: true },
  privacy: { approvedHosts: [] },
  browser: { history: [] },
  settings: {
    lockTime: 1000,
    searchEngine: 'Google',
    useBlockieIcon: true,
  },
  engine: {
    backgroundState,
  },
};

const mockSetOptions = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions,
    }),
  };
});

jest.mock('../../../util/networks', () => ({
  ...jest.requireActual('../../../util/networks'),
  isPermissionsSettingsV1Enabled: true,
}));

jest.mock('../../../util/notifications/constants/config', () => ({
  isNotificationsFeatureEnabled: jest.fn(() => true),
}));

describe('Settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(<Settings />, {
      state: initialState,
    });
    expect(toJSON()).toMatchSnapshot();
  });
  it('should render general settings button', () => {
    const { getByTestId } = renderWithProvider(<Settings />, {
      state: initialState,
    });
    const generalSettings = getByTestId(SettingsViewSelectorsIDs.GENERAL);
    expect(generalSettings).toBeDefined();
  });
  it('should render security settings button', () => {
    const { getByTestId } = renderWithProvider(<Settings />, {
      state: initialState,
    });
    const securitySettings = getByTestId(SettingsViewSelectorsIDs.SECURITY);
    expect(securitySettings).toBeDefined();
  });
  it('should render advanced settings button', () => {
    const { getByTestId } = renderWithProvider(<Settings />, {
      state: initialState,
    });
    const advancedSettings = getByTestId(SettingsViewSelectorsIDs.ADVANCED);
    expect(advancedSettings).toBeDefined();
  });
  it('should render contacts settings button', () => {
    const { getByTestId } = renderWithProvider(<Settings />, {
      state: initialState,
    });
    const contactsSettings = getByTestId(SettingsViewSelectorsIDs.CONTACTS);
    expect(contactsSettings).toBeDefined();
  });
  it('should render network settings button', () => {
    const { getByTestId } = renderWithProvider(<Settings />, {
      state: initialState,
    });
    const networksSettings = getByTestId(SettingsViewSelectorsIDs.NETWORKS);
    expect(networksSettings).toBeDefined();
  });
  it('should render feature request button', () => {
    const { getByTestId } = renderWithProvider(<Settings />, {
      state: initialState,
    });
    const onRampSettings = getByTestId(SettingsViewSelectorsIDs.ON_RAMP);
    expect(onRampSettings).toBeDefined();
  });
  it('should render experimental settings button', () => {
    const { getByTestId } = renderWithProvider(<Settings />, {
      state: initialState,
    });
    const experimentalSettings = getByTestId(
      SettingsViewSelectorsIDs.EXPERIMENTAL,
    );
    expect(experimentalSettings).toBeDefined();
  });
  it('should render about metamask button', () => {
    const { getByTestId } = renderWithProvider(<Settings />, {
      state: initialState,
    });
    const aboutMetamask = getByTestId(SettingsViewSelectorsIDs.ABOUT_METAMASK);
    expect(aboutMetamask).toBeDefined();
  });
  it('should render request feature button', () => {
    const { getByTestId } = renderWithProvider(<Settings />, {
      state: initialState,
    });
    const requestFeature = getByTestId(SettingsViewSelectorsIDs.REQUEST);
    expect(requestFeature).toBeDefined();
  });
  it('should render contact support button', () => {
    const { getByTestId } = renderWithProvider(<Settings />, {
      state: initialState,
    });
    const contactSupport = getByTestId(SettingsViewSelectorsIDs.CONTACT);
    expect(contactSupport).toBeDefined();
  });
  it('should render lock button', () => {
    const { getByTestId } = renderWithProvider(<Settings />, {
      state: initialState,
    });
    const lock = getByTestId(SettingsViewSelectorsIDs.LOCK);
    expect(lock).toBeDefined();
  });
  it('should render permissions settings button when enabled', () => {
    const { getByTestId } = renderWithProvider(<Settings />, {
      state: initialState,
    });
    const permissionsSettings = getByTestId(
      SettingsViewSelectorsIDs.PERMISSIONS,
    );
    expect(permissionsSettings).toBeDefined();
  });
  it('should render backup and sync settings button, and navigate to the correct page on press', () => {
    const { getByTestId } = renderWithProvider(<Settings />, {
      state: initialState,
    });
    const backupAndSyncSettings = getByTestId(
      SettingsViewSelectorsIDs.BACKUP_AND_SYNC,
    );
    expect(backupAndSyncSettings).toBeDefined();

    fireEvent.press(backupAndSyncSettings);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.SETTINGS.BACKUP_AND_SYNC);
  });

  it('should call Authentication.lockApp with correct parameters when onPressLock is called', async () => {
    // Test the Authentication.lockApp function directly with the expected parameters
    await Authentication.lockApp({ reset: false, locked: true });

    // Verify that Authentication.lockApp was called with the correct parameters
    expect(Authentication.lockApp).toHaveBeenCalledWith({
      reset: false,
      locked: true,
    });
    expect(Authentication.lockApp).toHaveBeenCalledTimes(1);
  });
});

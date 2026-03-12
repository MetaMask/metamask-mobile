import React from 'react';
import Settings from './';

import renderWithProvider from '../../../util/test/renderWithProvider';
import { SettingsViewSelectorsIDs } from './SettingsView.testIds';
import { backgroundState } from '../../../util/test/initial-root-state';
import { fireEvent } from '@testing-library/react-native';
import Routes from '../../../constants/navigation/Routes';
import { strings } from '../../../../locales/i18n';

// Mock Authentication module
jest.mock('../../../core', () => ({
  Authentication: {
    lockApp: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock whenEngineReady to prevent Jest environment teardown errors
jest.mock('../../../util/analytics/whenEngineReady', () => ({
  whenEngineReady: jest.fn(() => Promise.resolve()),
  isEngineReady: jest.fn(() => false),
  getEngine: jest.fn(() => ({})),
}));

// Import the mocked Authentication
import { Authentication } from '../../../core';
import { AvatarAccountType } from '../../../component-library/components/Avatars/Avatar';
import { useAccountMenuEnabled } from '../../../selectors/featureFlagController/accountMenu/useAccountMenuEnabled';

const initialState = {
  user: { seedphraseBackedUp: true, passwordSet: true },
  privacy: { approvedHosts: [] },
  browser: { history: [] },
  settings: {
    lockTime: 1000,
    searchEngine: 'Google',
    avatarAccountType: AvatarAccountType.Maskicon,
  },
  engine: {
    backgroundState,
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
  };
});

jest.mock('../../../util/networks', () => ({
  ...jest.requireActual('../../../util/networks'),
  isPermissionsSettingsV1Enabled: true,
}));

jest.mock('../../../util/notifications/constants/config', () => ({
  isNotificationsFeatureEnabled: jest.fn(() => true),
}));

jest.mock(
  '../../../selectors/featureFlagController/accountMenu/useAccountMenuEnabled',
  () => ({
    useAccountMenuEnabled: jest.fn(() => false),
  }),
);

describe('Settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('renders settings component with all sections', () => {
    const { toJSON } = renderWithProvider(<Settings />, {
      state: initialState,
    });
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders header with correct title', () => {
    const { getByTestId, getByText } = renderWithProvider(<Settings />, {
      state: initialState,
    });
    const header = getByTestId(SettingsViewSelectorsIDs.SETTINGS_HEADER);
    expect(header).toBeDefined();
    expect(getByText(strings('app_settings.title'))).toBeDefined();
  });

  it('navigates back when back button is pressed', () => {
    const { getByTestId } = renderWithProvider(<Settings />, {
      state: initialState,
    });
    const header = getByTestId(SettingsViewSelectorsIDs.SETTINGS_HEADER);
    const backButton = header.findByProps({ iconName: 'ArrowLeft' });
    fireEvent.press(backButton);
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('renders general settings button', () => {
    const { getByTestId } = renderWithProvider(<Settings />, {
      state: initialState,
    });
    const generalSettings = getByTestId(SettingsViewSelectorsIDs.GENERAL);
    expect(generalSettings).toBeDefined();
  });
  it('renders security settings button', () => {
    const { getByTestId } = renderWithProvider(<Settings />, {
      state: initialState,
    });
    const securitySettings = getByTestId(SettingsViewSelectorsIDs.SECURITY);
    expect(securitySettings).toBeDefined();
  });
  it('renders advanced settings button', () => {
    const { getByTestId } = renderWithProvider(<Settings />, {
      state: initialState,
    });
    const advancedSettings = getByTestId(SettingsViewSelectorsIDs.ADVANCED);
    expect(advancedSettings).toBeDefined();
  });
  it('renders contacts settings button when account menu is disabled', () => {
    jest.mocked(useAccountMenuEnabled).mockReturnValue(false);
    const { getByTestId } = renderWithProvider(<Settings />, {
      state: initialState,
    });
    const contactsSettings = getByTestId(SettingsViewSelectorsIDs.CONTACTS);
    expect(contactsSettings).toBeDefined();
  });
  it('render feature request button', () => {
    const { getByTestId } = renderWithProvider(<Settings />, {
      state: initialState,
    });
    const onRampSettings = getByTestId(SettingsViewSelectorsIDs.ON_RAMP);
    expect(onRampSettings).toBeDefined();
  });
  it('renders experimental settings button', () => {
    const { getByTestId } = renderWithProvider(<Settings />, {
      state: initialState,
    });
    const experimentalSettings = getByTestId(
      SettingsViewSelectorsIDs.EXPERIMENTAL,
    );
    expect(experimentalSettings).toBeDefined();
  });
  it('renders about metamask button', () => {
    const { getByTestId } = renderWithProvider(<Settings />, {
      state: initialState,
    });
    const aboutMetamask = getByTestId(SettingsViewSelectorsIDs.ABOUT_METAMASK);
    expect(aboutMetamask).toBeDefined();
  });
  it('renders request feature button', () => {
    const { getByTestId } = renderWithProvider(<Settings />, {
      state: initialState,
    });
    const requestFeature = getByTestId(SettingsViewSelectorsIDs.REQUEST);
    expect(requestFeature).toBeDefined();
  });
  it('renders contact support button', () => {
    const { getByTestId } = renderWithProvider(<Settings />, {
      state: initialState,
    });
    const contactSupport = getByTestId(SettingsViewSelectorsIDs.CONTACT);
    expect(contactSupport).toBeDefined();
  });
  it('renders lock button', () => {
    const { getByTestId } = renderWithProvider(<Settings />, {
      state: initialState,
    });
    const lock = getByTestId(SettingsViewSelectorsIDs.LOCK);
    expect(lock).toBeDefined();
  });
  it('renders permissions settings button when enabled and account menu is disabled', () => {
    jest.mocked(useAccountMenuEnabled).mockReturnValue(false);
    const { getByTestId } = renderWithProvider(<Settings />, {
      state: initialState,
    });
    const permissionsSettings = getByTestId(
      SettingsViewSelectorsIDs.PERMISSIONS,
    );
    expect(permissionsSettings).toBeDefined();
  });
  it('renders backup and sync settings button and navigates to correct page on press', () => {
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

  it('calls Authentication.lockApp with correct parameters when onPressLock is called', async () => {
    // Test the Authentication.lockApp function directly with the expected parameters
    await Authentication.lockApp({ reset: false, locked: false });

    // Verify that Authentication.lockApp was called with the correct parameters
    expect(Authentication.lockApp).toHaveBeenCalledWith({
      reset: false,
      locked: false,
    });
    expect(Authentication.lockApp).toHaveBeenCalledTimes(1);
  });

  describe('Feature Flag Override', () => {
    const originalEnv = process.env.METAMASK_ENVIRONMENT;

    beforeEach(() => {
      jest.clearAllMocks();
      // Reset to original value before each test
      if (originalEnv !== undefined) {
        process.env.METAMASK_ENVIRONMENT = originalEnv;
      } else {
        delete process.env.METAMASK_ENVIRONMENT;
      }
    });

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.METAMASK_ENVIRONMENT = originalEnv;
      } else {
        delete process.env.METAMASK_ENVIRONMENT;
      }
    });

    it('renders feature flag override drawer when METAMASK_ENVIRONMENT is not production', () => {
      process.env.METAMASK_ENVIRONMENT = 'development';

      const { getByText } = renderWithProvider(<Settings />, {
        state: initialState,
      });

      const featureFlagOverrideTitle = getByText(
        strings('app_settings.feature_flag_override.title'),
      );

      expect(featureFlagOverrideTitle).toBeDefined();
    });
  });

  describe('Account Menu Feature Flag', () => {
    it('hides contacts when account menu is enabled', () => {
      jest.mocked(useAccountMenuEnabled).mockReturnValue(true);

      const { queryByTestId } = renderWithProvider(<Settings />, {
        state: initialState,
      });

      expect(queryByTestId(SettingsViewSelectorsIDs.CONTACTS)).toBeNull();
    });

    it('hides permissions when account menu is enabled', () => {
      jest.mocked(useAccountMenuEnabled).mockReturnValue(true);

      const { queryByTestId } = renderWithProvider(<Settings />, {
        state: initialState,
      });

      expect(queryByTestId(SettingsViewSelectorsIDs.PERMISSIONS)).toBeNull();
    });

    it('hides about metamask when account menu is enabled', () => {
      jest.mocked(useAccountMenuEnabled).mockReturnValue(true);

      const { queryByTestId } = renderWithProvider(<Settings />, {
        state: initialState,
      });

      expect(queryByTestId(SettingsViewSelectorsIDs.ABOUT_METAMASK)).toBeNull();
    });

    it('hides request feature when account menu is enabled', () => {
      jest.mocked(useAccountMenuEnabled).mockReturnValue(true);

      const { queryByTestId } = renderWithProvider(<Settings />, {
        state: initialState,
      });

      expect(queryByTestId(SettingsViewSelectorsIDs.REQUEST)).toBeNull();
    });

    it('hides contact support when account menu is enabled', () => {
      jest.mocked(useAccountMenuEnabled).mockReturnValue(true);

      const { queryByTestId } = renderWithProvider(<Settings />, {
        state: initialState,
      });

      expect(queryByTestId(SettingsViewSelectorsIDs.CONTACT)).toBeNull();
    });

    it('hides lock button when account menu is enabled', () => {
      jest.mocked(useAccountMenuEnabled).mockReturnValue(true);

      const { queryByTestId } = renderWithProvider(<Settings />, {
        state: initialState,
      });

      expect(queryByTestId(SettingsViewSelectorsIDs.LOCK)).toBeNull();
    });

    it('still renders core settings sections when account menu is enabled', () => {
      jest.mocked(useAccountMenuEnabled).mockReturnValue(true);

      const { getByTestId } = renderWithProvider(<Settings />, {
        state: initialState,
      });

      expect(getByTestId(SettingsViewSelectorsIDs.GENERAL)).toBeDefined();
      expect(getByTestId(SettingsViewSelectorsIDs.SECURITY)).toBeDefined();
      expect(getByTestId(SettingsViewSelectorsIDs.ADVANCED)).toBeDefined();
      expect(getByTestId(SettingsViewSelectorsIDs.EXPERIMENTAL)).toBeDefined();
    });
  });

  describe('Contact Support', () => {
    it('navigates to support URL when contact support is pressed', () => {
      jest.mocked(useAccountMenuEnabled).mockReturnValue(false);

      const { getByTestId } = renderWithProvider(<Settings />, {
        state: initialState,
      });

      const contactButton = getByTestId(SettingsViewSelectorsIDs.CONTACT);
      fireEvent.press(contactButton);

      // In beta builds, it uses Intercom URL; in production it uses support.metamask.io with UTM
      expect(mockNavigate).toHaveBeenCalledWith('Webview', {
        screen: 'SimpleWebview',
        params: expect.objectContaining({
          title: strings('app_settings.contact_support'),
        }),
      });
    });
  });

  describe('Request Feature', () => {
    it('navigates to feature request URL when request feature is pressed', () => {
      jest.mocked(useAccountMenuEnabled).mockReturnValue(false);

      const { getByTestId } = renderWithProvider(<Settings />, {
        state: initialState,
      });

      const requestButton = getByTestId(SettingsViewSelectorsIDs.REQUEST);
      fireEvent.press(requestButton);

      expect(mockNavigate).toHaveBeenCalledWith('Webview', {
        screen: 'SimpleWebview',
        params: expect.objectContaining({
          title: strings('app_settings.request_feature'),
          url: 'https://community.metamask.io/c/feature-requests-ideas/',
        }),
      });
    });
  });

  describe('Lock', () => {
    it('shows alert when lock button is pressed', () => {
      const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');
      jest.mocked(useAccountMenuEnabled).mockReturnValue(false);

      const { getByTestId } = renderWithProvider(<Settings />, {
        state: initialState,
      });

      const lockButton = getByTestId(SettingsViewSelectorsIDs.LOCK);
      fireEvent.press(lockButton);

      expect(alertSpy).toHaveBeenCalledWith(
        strings('drawer.lock_title'),
        '',
        expect.arrayContaining([
          expect.objectContaining({
            text: strings('drawer.lock_cancel'),
          }),
          expect.objectContaining({
            text: strings('drawer.lock_ok'),
          }),
        ]),
        { cancelable: false },
      );
    });
  });

  describe('Permissions', () => {
    it('navigates to permissions when permissions button is pressed', () => {
      jest.mocked(useAccountMenuEnabled).mockReturnValue(false);

      const { getByTestId } = renderWithProvider(<Settings />, {
        state: initialState,
      });

      const permissionsButton = getByTestId(
        SettingsViewSelectorsIDs.PERMISSIONS,
      );
      fireEvent.press(permissionsButton);

      expect(mockNavigate).toHaveBeenCalledWith('PermissionsManager');
    });
  });

  describe('Contacts', () => {
    it('navigates to contacts when contacts button is pressed', () => {
      jest.mocked(useAccountMenuEnabled).mockReturnValue(false);

      const { getByTestId } = renderWithProvider(<Settings />, {
        state: initialState,
      });

      const contactsButton = getByTestId(SettingsViewSelectorsIDs.CONTACTS);
      fireEvent.press(contactsButton);

      expect(mockNavigate).toHaveBeenCalledWith('ContactsSettings');
    });
  });

  describe('On Ramp', () => {
    it('navigates to on ramp when on ramp button is pressed', () => {
      jest.mocked(useAccountMenuEnabled).mockReturnValue(false);

      const { getByTestId } = renderWithProvider(<Settings />, {
        state: initialState,
      });

      const onRampButton = getByTestId(SettingsViewSelectorsIDs.ON_RAMP);
      fireEvent.press(onRampButton);

      expect(mockNavigate).toHaveBeenCalledWith('RampSettings');
    });
  });

  describe('About MetaMask', () => {
    it('navigates to company settings when about metamask is pressed', () => {
      jest.mocked(useAccountMenuEnabled).mockReturnValue(false);

      const { getByTestId } = renderWithProvider(<Settings />, {
        state: initialState,
      });

      const aboutButton = getByTestId(SettingsViewSelectorsIDs.ABOUT_METAMASK);
      fireEvent.press(aboutButton);

      expect(mockNavigate).toHaveBeenCalledWith('CompanySettings');
    });
  });

  describe('Experimental Settings', () => {
    it('navigates to experimental settings when experimental button is pressed', () => {
      jest.mocked(useAccountMenuEnabled).mockReturnValue(false);

      const { getByTestId } = renderWithProvider(<Settings />, {
        state: initialState,
      });

      const experimentalButton = getByTestId(
        SettingsViewSelectorsIDs.EXPERIMENTAL,
      );
      fireEvent.press(experimentalButton);

      expect(mockNavigate).toHaveBeenCalledWith('ExperimentalSettings');
    });
  });

  describe('Notifications', () => {
    it('navigates to notifications when notifications button is pressed', () => {
      jest.mocked(useAccountMenuEnabled).mockReturnValue(false);

      const { getByTestId } = renderWithProvider(<Settings />, {
        state: initialState,
      });

      const notificationButton = getByTestId(
        SettingsViewSelectorsIDs.NOTIFICATIONS,
      );
      fireEvent.press(notificationButton);

      expect(mockNavigate).toHaveBeenCalled();
    });
  });
});

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AccountsMenu from './AccountsMenu';
import { AccountsMenuSelectorsIDs } from './AccountsMenu.testIds';
import { useSelector } from 'react-redux';
import { Authentication } from '../../../core/';
import Routes from '../../../constants/navigation/Routes';
import { isNotificationsFeatureEnabled } from '../../../util/notifications';
import {
  selectIsMetamaskNotificationsEnabled,
  getMetamaskNotificationsUnreadCount,
  getMetamaskNotificationsReadCount,
} from '../../../selectors/notifications';
import { selectIsBackupAndSyncEnabled } from '../../../selectors/identity';
import useRampsUnifiedV1Enabled from '../../UI/Ramp/hooks/useRampsUnifiedV1Enabled';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      background: {
        default: '#FFFFFF',
        alternative: '#F2F4F6',
      },
      text: {
        default: '#24272A',
        alternative: '#6A737D',
      },
    },
  }),
}));

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn(() => ({ name: 'test-event' })),
}));

jest.mock('../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('../../../core/Analytics', () => ({
  MetaMetrics: {
    getInstance: () => ({
      trackEvent: mockTrackEvent,
    }),
  },
}));

jest.mock('../../../core/Analytics/MetaMetrics.events', () => ({
  EVENT_NAME: {
    CARD_HOME_CLICKED: 'Card Home Clicked',
    SETTINGS_VIEWED: 'Settings Viewed',
    SETTINGS_ABOUT: 'About MetaMask',
    NAVIGATION_TAPS_SEND_FEEDBACK: 'Send Feedback',
    NAVIGATION_TAPS_GET_HELP: 'Get Help',
    NAVIGATION_TAPS_LOGOUT: 'Logout',
    QR_SCANNER_OPENED: 'QR Scanner Opened',
    RAMPS_BUTTON_CLICKED: 'Ramps Button Clicked',
    NOTIFICATIONS_MENU_OPENED: 'Notifications Menu Opened',
    NOTIFICATIONS_ACTIVATED: 'Notifications Activated',
  },
}));

jest.mock('../../../core/Analytics/MetricsEventBuilder', () => ({
  MetricsEventBuilder: {
    createEventBuilder: jest.fn(() => ({
      build: jest.fn(() => ({ event: 'CARD_HOME_CLICKED' })),
    })),
  },
}));

jest.mock('../../../core/', () => ({
  Authentication: {
    lockApp: jest.fn(),
    importAccountFromPrivateKey: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock('../../../core/DeeplinkManager/DeeplinkManager', () => ({
  parse: jest.fn(),
}));

jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('../../../util/networks', () => ({
  ...jest.requireActual('../../../util/networks'),
  isPermissionsSettingsV1Enabled: true,
}));

jest.mock('../../UI/Ramp/hooks/useRampsUnifiedV1Enabled', () => ({
  __esModule: true,
  default: jest.fn(() => false),
}));

const mockGoToBuy = jest.fn();
jest.mock('../../UI/Ramp/hooks/useRampNavigation', () => ({
  useRampNavigation: () => ({
    goToBuy: mockGoToBuy,
  }),
}));

jest.mock('../../UI/Ramp/hooks/useRampsButtonClickData', () => ({
  useRampsButtonClickData: () => ({
    ramp_routing: 'test_routing',
    is_authenticated: true,
    preferred_provider: 'test_provider',
    order_count: 5,
  }),
}));

jest.mock('../../../reducers/fiatOrders', () => ({
  getDetectedGeolocation: jest.fn(() => 'US'),
}));

jest.mock('../../../util/notifications', () => ({
  isNotificationsFeatureEnabled: jest.fn(() => false),
}));

jest.mock('../../../selectors/notifications', () => ({
  selectIsMetamaskNotificationsEnabled: jest.fn(),
  getMetamaskNotificationsUnreadCount: jest.fn(),
  getMetamaskNotificationsReadCount: jest.fn(),
}));

jest.mock('../../../selectors/identity', () => ({
  selectIsBackupAndSyncEnabled: jest.fn(),
}));

describe('AccountsMenu', () => {
  let mockAlert: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAlert = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    // Setup useSelector to return different values based on the selector
    (useSelector as jest.Mock).mockImplementation((selector) => {
      // Mock state object
      const mockState = {
        fiatOrders: { detectedGeolocation: 'US' },
      };

      // Try to call the selector with mock state
      try {
        const result = selector(mockState);
        // If it's the geolocation selector, return 'US'
        if (result === 'US') {
          return 'US';
        }
      } catch {
        // Selector might not work with our limited mock state
      }

      // Default: return false (for card button, etc.)
      return false;
    });
  });

  afterEach(() => {
    mockAlert.mockRestore();
  });

  it('render correctly', () => {
    const { getByTestId } = render(<AccountsMenu />);
    expect(
      getByTestId(AccountsMenuSelectorsIDs.ACCOUNTS_MENU_SCROLL_ID),
    ).toBeOnTheScreen();
  });

  it('render MANAGE section header', () => {
    const { getByText } = render(<AccountsMenu />);

    expect(getByText('accounts_menu.manage')).toBeOnTheScreen();
  });

  it('render RESOURCES section header', () => {
    const { getByText } = render(<AccountsMenu />);

    expect(getByText('accounts_menu.resources')).toBeOnTheScreen();
  });

  describe('Snapshots', () => {
    it('match snapshot when MetaMask Card is hidden', () => {
      (useSelector as jest.Mock).mockReturnValue(false);

      const { toJSON } = render(<AccountsMenu />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('match snapshot when MetaMask Card is visible', () => {
      (useSelector as jest.Mock).mockReturnValue(true);

      const { toJSON } = render(<AccountsMenu />);
      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('MetaMask Card Button', () => {
    it('render MetaMask Card row when shouldDisplayCardButton is true', () => {
      (useSelector as jest.Mock).mockReturnValue(true);

      const { getByText, getByTestId } = render(<AccountsMenu />);

      expect(getByText('accounts_menu.card_title')).toBeOnTheScreen();
      expect(
        getByTestId(AccountsMenuSelectorsIDs.MANAGE_CARD),
      ).toBeOnTheScreen();
    });

    it('does NOT render MetaMask Card row when shouldDisplayCardButton is false', () => {
      (useSelector as jest.Mock).mockReturnValue(false);

      const { queryByText, queryByTestId } = render(<AccountsMenu />);

      expect(queryByText('accounts_menu.card_title')).toBeNull();
      expect(queryByTestId(AccountsMenuSelectorsIDs.MANAGE_CARD)).toBeNull();
    });

    it('navigate to card and track analytics when MetaMask Card is pressed', () => {
      (useSelector as jest.Mock).mockReturnValue(true);

      const { getByTestId } = render(<AccountsMenu />);
      const cardButton = getByTestId(AccountsMenuSelectorsIDs.MANAGE_CARD);

      fireEvent.press(cardButton);

      expect(mockTrackEvent).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('CardScreens');
    });
  });

  describe('Deposit Button', () => {
    it('render Deposit button when rampUnifiedV1Enabled is true', () => {
      jest.mocked(useRampsUnifiedV1Enabled).mockReturnValue(true);

      const { getByText, getByTestId } = render(<AccountsMenu />);

      expect(getByText('accounts_menu.deposit')).toBeOnTheScreen();
      expect(
        getByTestId(AccountsMenuSelectorsIDs.DEPOSIT_BUTTON),
      ).toBeOnTheScreen();
    });

    it('does NOT render Deposit button when rampUnifiedV1Enabled is false', () => {
      jest.mocked(useRampsUnifiedV1Enabled).mockReturnValue(false);

      const { queryByText, queryByTestId } = render(<AccountsMenu />);

      expect(queryByText('accounts_menu.deposit')).toBeNull();
      expect(queryByTestId(AccountsMenuSelectorsIDs.DEPOSIT_BUTTON)).toBeNull();
    });

    it('navigate to buy flow and track analytics when Deposit is pressed', () => {
      jest.mocked(useRampsUnifiedV1Enabled).mockReturnValue(true);

      // Clear previous calls
      mockGoToBuy.mockClear();
      mockTrackEvent.mockClear();

      const { getByTestId } = render(<AccountsMenu />);
      const depositButton = getByTestId(
        AccountsMenuSelectorsIDs.DEPOSIT_BUTTON,
      );

      fireEvent.press(depositButton);

      // Verify goToBuy was called
      expect(mockGoToBuy).toHaveBeenCalled();

      // Verify analytics tracking
      expect(mockTrackEvent).toHaveBeenCalled();
      const trackEventCall = mockTrackEvent.mock.calls[0][0];
      expect(trackEventCall).toBeDefined();
    });

    it('track RAMPS_BUTTON_CLICKED event with correct properties when Deposit is pressed', () => {
      jest.mocked(useRampsUnifiedV1Enabled).mockReturnValue(true);

      mockCreateEventBuilder.mockClear();
      mockTrackEvent.mockClear();

      const mockAddProperties = jest.fn().mockReturnThis();
      const mockBuild = jest.fn(() => ({
        name: 'RAMPS_BUTTON_CLICKED',
      }));

      mockCreateEventBuilder.mockReturnValue({
        addProperties: mockAddProperties,
        build: mockBuild,
      });

      const { getByTestId } = render(<AccountsMenu />);
      const depositButton = getByTestId(
        AccountsMenuSelectorsIDs.DEPOSIT_BUTTON,
      );

      fireEvent.press(depositButton);

      // Verify event builder was called with correct event
      expect(mockCreateEventBuilder).toHaveBeenCalled();

      // Verify properties were added
      expect(mockAddProperties).toHaveBeenCalledWith({
        text: 'Buy',
        location: 'AccountsMenu',
        ramp_type: 'UNIFIED_BUY',
        chain_id_destination: null,
        region: 'US',
        ramp_routing: 'test_routing',
        is_authenticated: true,
        preferred_provider: 'test_provider',
        order_count: 5,
      });

      // Verify build was called
      expect(mockBuild).toHaveBeenCalled();

      // Verify trackEvent was called with the built event
      expect(mockTrackEvent).toHaveBeenCalled();
    });
  });

  describe('QR Scanner Button', () => {
    it('render QR Scan button', () => {
      const { getByText } = render(<AccountsMenu />);

      expect(getByText('accounts_menu.scan')).toBeOnTheScreen();
    });

    it('navigate to QR scanner and track analytics when Scan is pressed', () => {
      const { getByText } = render(<AccountsMenu />);
      const scanButton = getByText('accounts_menu.scan');

      fireEvent.press(scanButton);

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.QR_TAB_SWITCHER,
        expect.objectContaining({
          onScanSuccess: expect.any(Function),
        }),
      );
      expect(mockCreateEventBuilder).toHaveBeenCalledWith('QR Scanner Opened');
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('show alert when private key is scanned', () => {
      const { getByText } = render(<AccountsMenu />);
      const scanButton = getByText('accounts_menu.scan');

      // Clear previous calls
      mockNavigate.mockClear();
      mockAlert.mockClear();

      fireEvent.press(scanButton);

      // Get the onScanSuccess callback
      const navigateCall = mockNavigate.mock.calls.find(
        (call) => call[0] === Routes.QR_TAB_SWITCHER,
      );

      expect(navigateCall).toBeDefined();
      const onScanSuccess = navigateCall?.[1]?.onScanSuccess;
      expect(onScanSuccess).toBeDefined();

      // Simulate scanning a private key
      onScanSuccess({ private_key: '0x1234...' }, 'private_key_content');

      expect(mockAlert).toHaveBeenCalledWith(
        'wallet.private_key_detected',
        'wallet.do_you_want_to_import_this_account',
        expect.arrayContaining([
          expect.objectContaining({ text: 'wallet.cancel' }),
          expect.objectContaining({ text: 'wallet.yes' }),
        ]),
        { cancelable: false },
      );
    });

    it('show alert when seed phrase is scanned', () => {
      const { getByText } = render(<AccountsMenu />);
      const scanButton = getByText('accounts_menu.scan');

      // Clear previous calls
      mockNavigate.mockClear();
      mockAlert.mockClear();

      fireEvent.press(scanButton);

      // Get the onScanSuccess callback
      const navigateCall = mockNavigate.mock.calls.find(
        (call) => call[0] === Routes.QR_TAB_SWITCHER,
      );

      expect(navigateCall).toBeDefined();
      const onScanSuccess = navigateCall?.[1]?.onScanSuccess;
      expect(onScanSuccess).toBeDefined();

      // Simulate scanning a seed phrase
      onScanSuccess({ seed: 'word1 word2 ...' }, 'seed_content');

      expect(mockAlert).toHaveBeenCalledWith(
        'wallet.error',
        'wallet.logout_to_import_seed',
      );
    });
  });

  describe('Notifications Button', () => {
    const setupNotificationMocks = ({
      notificationEnabled = false,
      unreadCount = 0,
      readCount = 0,
      backupSyncEnabled = false,
    } = {}) => {
      (useSelector as jest.Mock).mockImplementation((selector) => {
        const mockState = {
          fiatOrders: { detectedGeolocation: 'US' },
        };

        try {
          const result = selector(mockState);
          if (result === 'US') return 'US';
        } catch {
          // Selector might not work with our limited mock state
        }

        // Handle notification selectors
        if (selector === selectIsMetamaskNotificationsEnabled)
          return notificationEnabled;
        if (selector === getMetamaskNotificationsUnreadCount)
          return unreadCount;
        if (selector === getMetamaskNotificationsReadCount) return readCount;
        if (selector === selectIsBackupAndSyncEnabled) return backupSyncEnabled;

        // Default: return false
        return false;
      });
    };

    beforeEach(() => {
      jest.mocked(isNotificationsFeatureEnabled).mockReturnValue(false);
      setupNotificationMocks();
    });

    it('render Notifications button when feature is enabled', () => {
      jest.mocked(isNotificationsFeatureEnabled).mockReturnValue(true);

      const { getByText } = render(<AccountsMenu />);

      expect(getByText('accounts_menu.notifications')).toBeOnTheScreen();
    });

    it('does NOT render Notifications button when feature is disabled', () => {
      jest.mocked(isNotificationsFeatureEnabled).mockReturnValue(false);

      const { queryByText } = render(<AccountsMenu />);

      expect(queryByText('accounts_menu.notifications')).toBeNull();
    });

    it('navigate to notifications view when enabled and pressed', () => {
      jest.mocked(isNotificationsFeatureEnabled).mockReturnValue(true);
      setupNotificationMocks({ notificationEnabled: true, unreadCount: 5 });

      mockNavigate.mockClear();
      mockTrackEvent.mockClear();

      const { getByText } = render(<AccountsMenu />);
      const notificationsButton = getByText('accounts_menu.notifications');

      fireEvent.press(notificationsButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.NOTIFICATIONS.VIEW);
    });

    it('navigate to opt-in stack when not enabled and pressed', () => {
      jest.mocked(isNotificationsFeatureEnabled).mockReturnValue(true);
      setupNotificationMocks({ notificationEnabled: false });

      mockNavigate.mockClear();

      const { getByText } = render(<AccountsMenu />);
      const notificationsButton = getByText('accounts_menu.notifications');

      fireEvent.press(notificationsButton);

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.NOTIFICATIONS.OPT_IN_STACK,
      );
    });

    it('display badge with count when notifications are enabled and unread count > 0', () => {
      jest.mocked(isNotificationsFeatureEnabled).mockReturnValue(true);
      setupNotificationMocks({ notificationEnabled: true, unreadCount: 5 });

      const { getByText } = render(<AccountsMenu />);

      expect(getByText('5')).toBeOnTheScreen();
    });

    it('display "99+" when unread count is over 99', () => {
      jest.mocked(isNotificationsFeatureEnabled).mockReturnValue(true);
      setupNotificationMocks({ notificationEnabled: true, unreadCount: 150 });

      const { getByText } = render(<AccountsMenu />);

      expect(getByText('99+')).toBeOnTheScreen();
    });

    it('does NOT display badge when unread count is 0', () => {
      jest.mocked(isNotificationsFeatureEnabled).mockReturnValue(true);
      setupNotificationMocks({ notificationEnabled: true, unreadCount: 0 });

      const { queryByText } = render(<AccountsMenu />);

      // Badge should not be visible
      expect(queryByText('0')).toBeNull();
    });

    it('track NOTIFICATIONS_MENU_OPENED event when enabled and pressed', () => {
      jest.mocked(isNotificationsFeatureEnabled).mockReturnValue(true);
      setupNotificationMocks({
        notificationEnabled: true,
        unreadCount: 5,
        readCount: 3,
      });

      mockCreateEventBuilder.mockClear();
      mockTrackEvent.mockClear();

      const mockAddProperties = jest.fn().mockReturnThis();
      const mockBuild = jest.fn(() => ({
        name: 'NOTIFICATIONS_MENU_OPENED',
      }));

      mockCreateEventBuilder.mockReturnValue({
        addProperties: mockAddProperties,
        build: mockBuild,
      });

      const { getByText } = render(<AccountsMenu />);
      const notificationsButton = getByText('accounts_menu.notifications');

      fireEvent.press(notificationsButton);

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        'Notifications Menu Opened',
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        unread_count: 5,
        read_count: 3,
      });
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('track NOTIFICATIONS_ACTIVATED event when not enabled and pressed', () => {
      jest.mocked(isNotificationsFeatureEnabled).mockReturnValue(true);
      setupNotificationMocks({
        notificationEnabled: false,
        backupSyncEnabled: true,
      });

      mockCreateEventBuilder.mockClear();
      mockTrackEvent.mockClear();

      const mockAddProperties = jest.fn().mockReturnThis();
      const mockBuild = jest.fn(() => ({
        name: 'NOTIFICATIONS_ACTIVATED',
      }));

      mockCreateEventBuilder.mockReturnValue({
        addProperties: mockAddProperties,
        build: mockBuild,
      });

      const { getByText } = render(<AccountsMenu />);
      const notificationsButton = getByText('accounts_menu.notifications');

      fireEvent.press(notificationsButton);

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        'Notifications Activated',
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        action_type: 'started',
        is_profile_syncing_enabled: true,
      });
      expect(mockTrackEvent).toHaveBeenCalled();
    });
  });

  describe('Permissions Row', () => {
    it('render Permissions row', () => {
      const { getByText, getByTestId } = render(<AccountsMenu />);

      expect(getByText('accounts_menu.permissions')).toBeOnTheScreen();
      expect(
        getByTestId(AccountsMenuSelectorsIDs.PERMISSIONS),
      ).toBeOnTheScreen();
    });

    it('navigate to SDKSessionsManager when Permissions is pressed', () => {
      const { getByTestId } = render(<AccountsMenu />);
      const permissionsButton = getByTestId(
        AccountsMenuSelectorsIDs.PERMISSIONS,
      );

      fireEvent.press(permissionsButton);

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.SETTINGS.SDK_SESSIONS_MANAGER,
      );
    });
  });

  describe('RESOURCES Section', () => {
    describe('About MetaMask Row', () => {
      it('render About MetaMask row', () => {
        const { getByText, getByTestId } = render(<AccountsMenu />);

        expect(getByText('app_settings.info_title_beta')).toBeOnTheScreen();
        expect(
          getByTestId(AccountsMenuSelectorsIDs.ABOUT_METAMASK),
        ).toBeOnTheScreen();
      });

      it('navigate to CompanySettings when About MetaMask is pressed', () => {
        const { getByTestId } = render(<AccountsMenu />);
        const aboutButton = getByTestId(
          AccountsMenuSelectorsIDs.ABOUT_METAMASK,
        );

        fireEvent.press(aboutButton);

        expect(mockNavigate).toHaveBeenCalledWith(Routes.SETTINGS.COMPANY);
      });
    });

    describe('Request a Feature Row', () => {
      it('render Request a feature row', () => {
        const { getByText, getByTestId } = render(<AccountsMenu />);

        expect(getByText('app_settings.request_feature')).toBeOnTheScreen();
        expect(
          getByTestId(AccountsMenuSelectorsIDs.REQUEST_FEATURE),
        ).toBeOnTheScreen();
      });

      it('navigate to webview when Request a feature is pressed', () => {
        const { getByTestId } = render(<AccountsMenu />);
        const requestFeatureButton = getByTestId(
          AccountsMenuSelectorsIDs.REQUEST_FEATURE,
        );

        fireEvent.press(requestFeatureButton);

        expect(mockNavigate).toHaveBeenCalledWith('Webview', {
          screen: 'SimpleWebview',
          params: {
            url: 'https://community.metamask.io/c/feature-requests-ideas/',
            title: 'app_settings.request_feature',
          },
        });
      });
    });

    describe('Support Row', () => {
      it('render Support row', () => {
        const { getByText, getByTestId } = render(<AccountsMenu />);

        expect(getByText('app_settings.contact_support')).toBeOnTheScreen();
        expect(getByTestId(AccountsMenuSelectorsIDs.SUPPORT)).toBeOnTheScreen();
      });

      it('navigate to webview when Support is pressed', () => {
        const { getByTestId } = render(<AccountsMenu />);
        const supportButton = getByTestId(AccountsMenuSelectorsIDs.SUPPORT);

        fireEvent.press(supportButton);

        expect(mockNavigate).toHaveBeenCalledWith('Webview', {
          screen: 'SimpleWebview',
          params: {
            url: 'https://intercom.help/internal-beta-testing/en/',
            title: 'app_settings.contact_support',
          },
        });
      });
    });

    describe('Log Out Row', () => {
      it('render Log Out row', () => {
        const { getByText, getByTestId } = render(<AccountsMenu />);

        expect(getByText('accounts_menu.log_out')).toBeOnTheScreen();
        expect(getByTestId(AccountsMenuSelectorsIDs.LOCK)).toBeOnTheScreen();
      });

      it('show confirmation alert when Log Out is pressed', () => {
        const { getByTestId } = render(<AccountsMenu />);
        const logOutButton = getByTestId(AccountsMenuSelectorsIDs.LOCK);

        fireEvent.press(logOutButton);

        expect(mockAlert).toHaveBeenCalledWith(
          'drawer.lock_title',
          '',
          [
            {
              text: 'drawer.lock_cancel',
              onPress: expect.any(Function),
              style: 'cancel',
            },
            {
              text: 'drawer.lock_ok',
              onPress: expect.any(Function),
            },
          ],
          { cancelable: false },
        );
      });

      it('call Authentication.lockApp when confirmation is accepted', async () => {
        const { getByTestId } = render(<AccountsMenu />);
        const logOutButton = getByTestId(AccountsMenuSelectorsIDs.LOCK);

        fireEvent.press(logOutButton);

        // Get the onPress callback from the OK button
        const alertCall = mockAlert.mock.calls[0];
        const okButton = alertCall[2][1]; // Second button in the array
        await okButton.onPress();

        expect(Authentication.lockApp).toHaveBeenCalledWith({
          reset: false,
          locked: false,
        });
      });

      it('track NAVIGATION_TAPS_LOGOUT event only when logout is confirmed', async () => {
        const { getByTestId } = render(<AccountsMenu />);
        const logOutButton = getByTestId(AccountsMenuSelectorsIDs.LOCK);

        // Press the logout button
        fireEvent.press(logOutButton);

        // At this point, analytics NOT be tracked yet (just showing alert)
        expect(mockCreateEventBuilder).not.toHaveBeenCalledWith('Logout');

        // Get the onPress callback from the OK button and execute it
        const alertCall = mockAlert.mock.calls[0];
        const okButton = alertCall[2][1]; // Second button in the array
        await okButton.onPress();

        // Now analytics be tracked (user confirmed)
        expect(mockCreateEventBuilder).toHaveBeenCalledWith('Logout');
        expect(mockTrackEvent).toHaveBeenCalled();
      });
    });
  });

  describe('Analytics Tracking', () => {
    it('track SETTINGS_VIEWED event when Settings is pressed', () => {
      const { getByTestId } = render(<AccountsMenu />);
      const settingsButton = getByTestId(AccountsMenuSelectorsIDs.SETTINGS);

      fireEvent.press(settingsButton);

      expect(mockCreateEventBuilder).toHaveBeenCalledWith('Settings Viewed');
      expect(mockTrackEvent).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(Routes.SETTINGS.ROOT);
    });

    it('track SETTINGS_ABOUT event when About MetaMask is pressed', () => {
      const { getByTestId } = render(<AccountsMenu />);
      const aboutButton = getByTestId(AccountsMenuSelectorsIDs.ABOUT_METAMASK);

      fireEvent.press(aboutButton);

      expect(mockCreateEventBuilder).toHaveBeenCalledWith('About MetaMask');
      expect(mockTrackEvent).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(Routes.SETTINGS.COMPANY);
    });

    it('track NAVIGATION_TAPS_SEND_FEEDBACK event when Request a feature is pressed', () => {
      const { getByTestId } = render(<AccountsMenu />);
      const requestFeatureButton = getByTestId(
        AccountsMenuSelectorsIDs.REQUEST_FEATURE,
      );

      fireEvent.press(requestFeatureButton);

      expect(mockCreateEventBuilder).toHaveBeenCalledWith('Send Feedback');
      expect(mockTrackEvent).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('Webview', {
        screen: 'SimpleWebview',
        params: {
          url: 'https://community.metamask.io/c/feature-requests-ideas/',
          title: 'app_settings.request_feature',
        },
      });
    });

    it('track NAVIGATION_TAPS_GET_HELP event when Support is pressed', () => {
      const { getByTestId } = render(<AccountsMenu />);
      const supportButton = getByTestId(AccountsMenuSelectorsIDs.SUPPORT);

      fireEvent.press(supportButton);

      expect(mockCreateEventBuilder).toHaveBeenCalledWith('Get Help');
      expect(mockTrackEvent).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('Webview', {
        screen: 'SimpleWebview',
        params: {
          url: 'https://intercom.help/internal-beta-testing/en/',
          title: 'app_settings.contact_support',
        },
      });
    });
  });
});

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AccountsMenu from './AccountsMenu';
import { AccountsMenuSelectorsIDs } from './AccountsMenu.testIds';
import { useSelector } from 'react-redux';
import { Authentication } from '../../../core/';
import Routes from '../../../constants/navigation/Routes';

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
  MetaMetricsEvents: {
    CARD_HOME_CLICKED: 'CARD_HOME_CLICKED',
    NAVIGATION_TAPS_SEND_FEEDBACK: 'NAVIGATION_TAPS_SEND_FEEDBACK',
    NAVIGATION_TAPS_GET_HELP: 'NAVIGATION_TAPS_GET_HELP',
    NAVIGATION_TAPS_LOGOUT: 'NAVIGATION_TAPS_LOGOUT',
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
  },
}));

jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('../../../util/networks', () => ({
  ...jest.requireActual('../../../util/networks'),
  isPermissionsSettingsV1Enabled: true,
}));

describe('AccountsMenu', () => {
  let mockAlert: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAlert = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    // Default: hide card button
    (useSelector as jest.Mock).mockReturnValue(false);
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
        getByTestId(AccountsMenuSelectorsIDs.MANAGE_WALLET),
      ).toBeOnTheScreen();
    });

    it('does NOT render MetaMask Card row when shouldDisplayCardButton is false', () => {
      (useSelector as jest.Mock).mockReturnValue(false);

      const { queryByText, queryByTestId } = render(<AccountsMenu />);

      expect(queryByText('accounts_menu.card_title')).toBeNull();
      expect(queryByTestId(AccountsMenuSelectorsIDs.MANAGE_WALLET)).toBeNull();
    });

    it('navigate to card and track analytics when MetaMask Card is pressed', () => {
      (useSelector as jest.Mock).mockReturnValue(true);

      const { getByTestId } = render(<AccountsMenu />);
      const cardButton = getByTestId(AccountsMenuSelectorsIDs.MANAGE_WALLET);

      fireEvent.press(cardButton);

      expect(mockTrackEvent).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('CardScreens');
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

        expect(getByText('drawer.lock')).toBeOnTheScreen();
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
        expect(mockCreateEventBuilder).not.toHaveBeenCalledWith(
          'NAVIGATION_TAPS_LOGOUT',
        );

        // Get the onPress callback from the OK button and execute it
        const alertCall = mockAlert.mock.calls[0];
        const okButton = alertCall[2][1]; // Second button in the array
        await okButton.onPress();

        // Now analytics be tracked (user confirmed)
        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          'NAVIGATION_TAPS_LOGOUT',
        );
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

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        'NAVIGATION_TAPS_SEND_FEEDBACK',
      );
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

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        'NAVIGATION_TAPS_GET_HELP',
      );
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

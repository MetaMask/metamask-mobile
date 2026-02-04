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

jest.mock('../../UI/Ramp/hooks/useRampNavigation', () => ({
  useRampNavigation: () => ({
    goToBuy: jest.fn(),
    goToSell: jest.fn(),
    goToAggregator: jest.fn(),
    goToDeposit: jest.fn(),
  }),
}));

const mockTrackEvent = jest.fn();
jest.mock('../../../core/Analytics', () => ({
  MetaMetrics: {
    getInstance: () => ({
      trackEvent: mockTrackEvent,
    }),
  },
  MetaMetricsEvents: {
    CARD_HOME_CLICKED: 'CARD_HOME_CLICKED',
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

  it('should render correctly', () => {
    const { getByTestId } = render(<AccountsMenu />);
    expect(
      getByTestId(AccountsMenuSelectorsIDs.ACCOUNTS_MENU_SCROLL_ID),
    ).toBeDefined();
  });

  it('should render Quick Actions buttons', () => {
    const { getByText, getByTestId } = render(<AccountsMenu />);

    expect(getByText('Deposit')).toBeDefined();
    expect(getByText('Earn')).toBeDefined();
    expect(getByText('Scan')).toBeDefined();
    expect(getByTestId(AccountsMenuSelectorsIDs.DEPOSIT_BUTTON)).toBeDefined();
    expect(getByTestId(AccountsMenuSelectorsIDs.EARN_BUTTON)).toBeDefined();
    expect(getByTestId(AccountsMenuSelectorsIDs.SCAN_BUTTON)).toBeDefined();
  });

  it('should render MANAGE section header', () => {
    const { getByText } = render(<AccountsMenu />);

    expect(getByText('MANAGE')).toBeDefined();
  });

  it('should render RESOURCES section header', () => {
    const { getByText } = render(<AccountsMenu />);

    expect(getByText('RESOURCES')).toBeDefined();
  });

  describe('MetaMask Card Button', () => {
    it('should render MetaMask Card row when shouldDisplayCardButton is true', () => {
      (useSelector as jest.Mock).mockReturnValue(true);

      const { getByText, getByTestId } = render(<AccountsMenu />);

      expect(getByText('MetaMask Card')).toBeDefined();
      expect(getByTestId(AccountsMenuSelectorsIDs.MANAGE_WALLET)).toBeDefined();
    });

    it('should NOT render MetaMask Card row when shouldDisplayCardButton is false', () => {
      (useSelector as jest.Mock).mockReturnValue(false);

      const { queryByText, queryByTestId } = render(<AccountsMenu />);

      expect(queryByText('MetaMask Card')).toBeNull();
      expect(queryByTestId(AccountsMenuSelectorsIDs.MANAGE_WALLET)).toBeNull();
    });

    it('should navigate to card and track analytics when MetaMask Card is pressed', () => {
      (useSelector as jest.Mock).mockReturnValue(true);

      const { getByTestId } = render(<AccountsMenu />);
      const cardButton = getByTestId(AccountsMenuSelectorsIDs.MANAGE_WALLET);

      fireEvent.press(cardButton);

      expect(mockTrackEvent).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('CardScreens');
    });
  });

  describe('Permissions Row', () => {
    it('should render Permissions row', () => {
      const { getByText, getByTestId } = render(<AccountsMenu />);

      expect(getByText('Permissions')).toBeDefined();
      expect(getByTestId(AccountsMenuSelectorsIDs.PERMISSIONS)).toBeDefined();
    });

    it('should navigate to SDKSessionsManager when Permissions is pressed', () => {
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
      it('should render About MetaMask row', () => {
        const { getByText, getByTestId } = render(<AccountsMenu />);

        expect(getByText('About MetaMask')).toBeDefined();
        expect(
          getByTestId(AccountsMenuSelectorsIDs.ABOUT_METAMASK),
        ).toBeDefined();
      });

      it('should navigate to CompanySettings when About MetaMask is pressed', () => {
        const { getByTestId } = render(<AccountsMenu />);
        const aboutButton = getByTestId(
          AccountsMenuSelectorsIDs.ABOUT_METAMASK,
        );

        fireEvent.press(aboutButton);

        expect(mockNavigate).toHaveBeenCalledWith('CompanySettings');
      });
    });

    describe('Request a Feature Row', () => {
      it('should render Request a feature row', () => {
        const { getByText, getByTestId } = render(<AccountsMenu />);

        expect(getByText('Request a feature')).toBeDefined();
        expect(
          getByTestId(AccountsMenuSelectorsIDs.REQUEST_FEATURE),
        ).toBeDefined();
      });

      it('should navigate to webview when Request a feature is pressed', () => {
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
      it('should render Support row', () => {
        const { getByText, getByTestId } = render(<AccountsMenu />);

        expect(getByText('Support')).toBeDefined();
        expect(getByTestId(AccountsMenuSelectorsIDs.SUPPORT)).toBeDefined();
      });

      it('should navigate to webview when Support is pressed', () => {
        const { getByTestId } = render(<AccountsMenu />);
        const supportButton = getByTestId(AccountsMenuSelectorsIDs.SUPPORT);

        fireEvent.press(supportButton);

        expect(mockNavigate).toHaveBeenCalledWith('Webview', {
          screen: 'SimpleWebview',
          params: {
            url: 'https://support.metamask.io',
            title: 'app_settings.contact_support',
          },
        });
      });
    });

    describe('Log Out Row', () => {
      it('should render Log Out row', () => {
        const { getByText, getByTestId } = render(<AccountsMenu />);

        expect(getByText('Log Out')).toBeDefined();
        expect(getByTestId(AccountsMenuSelectorsIDs.LOCK)).toBeDefined();
      });

      it('should show confirmation alert when Log Out is pressed', () => {
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

      it('should call Authentication.lockApp when confirmation is accepted', async () => {
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
    });
  });
});

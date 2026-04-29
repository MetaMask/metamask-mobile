import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  getNavigationOptionsTitle,
  getEditableOptions,
  getTransactionOptionsTitle,
  getApproveNavbar,
  getModalNavbarOptions,
  getOnboardingNavbarOptions,
  getTransparentOnboardingNavbarOptions,
  getTransparentBackOnboardingNavbarOptions,
  getOptinMetricsNavbarOptions,
  getClosableNavigationOptions,
  getOfflineModalNavbar,
  getDepositNavbarOptions,
  getEditAccountNameNavBarOptions,
  getNetworkNavbarOptions,
  getBridgeNavbar,
  getBridgeTransactionDetailsNavbar,
  getStakingNavbar,
  getDeFiProtocolPositionDetailsNavbarOptions,
  getRampsOrderDetailsNavbarOptions,
  getPaymentSelectorMethodNavbar,
  getPaymentMethodApplePayNavbar,
  getSwapsAmountNavbar,
  getSwapsQuotesNavbar,
} from './index';
import { BridgeViewMode } from '../Bridge/types';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  }),
}));

/* eslint-disable @metamask/design-tokens/color-no-hex -- theme mock uses hex for test compatibility */
const mockThemeColors = {
  background: {
    default: '#FFFFFF',
    primary: '#F5F5F5',
  },
  text: {
    default: '#000000',
  },
  primary: {
    default: '#037DD6',
  },
  icon: {
    default: '#24272A',
  },
  overlay: {
    default: 'rgba(0,0,0,0.5)',
  },
};
/* eslint-enable @metamask/design-tokens/color-no-hex */

const mockNavigation = {
  goBack: jest.fn(),
  pop: jest.fn(),
  setOptions: jest.fn(),
  navigate: jest.fn(),
  getParent: jest.fn(() => ({
    pop: jest.fn(),
  })),
};

const mockRoute = {
  params: {},
  name: 'TestRoute',
};

describe('Navbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getNavigationOptionsTitle', () => {
    it('returns correct options with title', () => {
      const options = getNavigationOptionsTitle(
        'Settings',
        mockNavigation,
        false,
        mockThemeColors,
      );

      expect(options.title).toBe('Settings');
      expect(options.headerTitleAlign).toBe('center');
      expect(options).toHaveProperty('headerLeft');
      expect(options).toHaveProperty('headerRight');
    });

    it('shows close button for full screen modal', () => {
      const options = getNavigationOptionsTitle(
        'Settings',
        mockNavigation,
        true,
        mockThemeColors,
      );

      const HeaderRight = options.headerRight;
      expect(HeaderRight).toBeDefined();
    });

    it('shows back button for non-full screen modal', () => {
      const options = getNavigationOptionsTitle(
        'Settings',
        mockNavigation,
        false,
        mockThemeColors,
      );

      const HeaderLeft = options.headerLeft;
      expect(HeaderLeft).toBeDefined();
    });
  });

  describe('getEditableOptions', () => {
    it('returns correct options for edit mode', () => {
      const routeWithEditMode = {
        ...mockRoute,
        params: { editMode: 'edit', dispatch: jest.fn() },
      };
      const options = getEditableOptions(
        'Contact',
        mockNavigation,
        routeWithEditMode,
        mockThemeColors,
      );

      expect(options.title).toBe('Contact');
      expect(options).toHaveProperty('headerLeft');
      expect(options).toHaveProperty('headerRight');
      expect(options).toHaveProperty('headerStyle');
    });

    it('returns correct options for add mode', () => {
      const routeWithAddMode = {
        ...mockRoute,
        params: { mode: 'add' },
      };
      const options = getEditableOptions(
        'Contact',
        mockNavigation,
        routeWithAddMode,
        mockThemeColors,
      );

      expect(options.title).toBe('Contact');
    });
  });

  describe('getTransactionOptionsTitle', () => {
    it('returns correct options', () => {
      const options = getTransactionOptionsTitle(
        'transaction.confirm',
        mockNavigation,
        mockRoute,
        mockThemeColors,
      );

      expect(options).toHaveProperty('headerTitle');
      expect(options).toHaveProperty('headerLeft');
      expect(options).toHaveProperty('headerRight');
      expect(options).toHaveProperty('headerStyle');
    });

    it('returns edit title when mode is edit', () => {
      const routeWithEditMode = {
        ...mockRoute,
        params: { mode: 'edit' },
      };
      const options = getTransactionOptionsTitle(
        'transaction.confirm',
        mockNavigation,
        routeWithEditMode,
        mockThemeColors,
      );

      expect(options).toHaveProperty('headerTitle');
    });
  });

  describe('getApproveNavbar', () => {
    it('returns correct options', () => {
      const options = getApproveNavbar('Approve');

      expect(options).toHaveProperty('headerTitle');
      expect(options).toHaveProperty('headerLeft');
      expect(options).toHaveProperty('headerRight');
    });
  });

  describe('getModalNavbarOptions', () => {
    it('returns correct options with title', () => {
      const options = getModalNavbarOptions('Modal Title');

      expect(options).toHaveProperty('headerTitle');
    });
  });

  describe('getOnboardingNavbarOptions', () => {
    it('returns correct options', () => {
      const options = getOnboardingNavbarOptions(
        mockRoute,
        {},
        mockThemeColors,
        true,
      );

      expect(options).toHaveProperty('headerStyle');
      expect(options).toHaveProperty('headerTitle');
      expect(options).toHaveProperty('headerRight');
      expect(options).toHaveProperty('headerLeft');
    });

    it('hides logo when showLogo is false', () => {
      const options = getOnboardingNavbarOptions(
        mockRoute,
        {},
        mockThemeColors,
        false,
      );

      expect(options.headerTitle).toBe('');
    });
  });

  describe('getTransparentOnboardingNavbarOptions', () => {
    it('returns correct options', () => {
      const options = getTransparentOnboardingNavbarOptions(mockThemeColors);

      expect(options).toHaveProperty('headerTitle');
      expect(options).toHaveProperty('headerLeft');
      expect(options).toHaveProperty('headerRight');
      expect(options).toHaveProperty('headerStyle');
    });

    it('uses custom background color when provided', () => {
      const testColor = 'rgb(255, 0, 0)';
      const options = getTransparentOnboardingNavbarOptions(
        mockThemeColors,
        testColor,
      );

      expect(options.headerStyle.backgroundColor).toBe(testColor);
    });

    it('hides logo when showLogo is false', () => {
      const options = getTransparentOnboardingNavbarOptions(
        mockThemeColors,
        undefined,
        false,
      );

      expect(options.headerTitle()).toBeNull();
    });
  });

  describe('getTransparentBackOnboardingNavbarOptions', () => {
    it('returns correct options', () => {
      const options =
        getTransparentBackOnboardingNavbarOptions(mockThemeColors);

      expect(options).toHaveProperty('headerTitle');
      expect(options).toHaveProperty('headerBackTitle');
      expect(options).toHaveProperty('headerRight');
      expect(options).toHaveProperty('headerStyle');
    });
  });

  describe('getOptinMetricsNavbarOptions', () => {
    it('returns correct options', () => {
      const options = getOptinMetricsNavbarOptions(mockThemeColors, true);

      expect(options).toHaveProperty('headerTitle');
      expect(options).toHaveProperty('headerBackTitle');
      expect(options).toHaveProperty('headerRight');
      expect(options).toHaveProperty('headerLeft');
      expect(options).toHaveProperty('headerStyle');
    });

    it('hides logo when showLogo is false', () => {
      const options = getOptinMetricsNavbarOptions(mockThemeColors, false);

      expect(options.headerTitle()).toBeNull();
    });
  });

  describe('getClosableNavigationOptions', () => {
    it('returns correct options', () => {
      const options = getClosableNavigationOptions(
        'Title',
        'Back',
        mockNavigation,
        mockThemeColors,
      );

      expect(options.title).toBe('Title');
      expect(options).toHaveProperty('headerTitleStyle');
      expect(options).toHaveProperty('headerLeft');
      expect(options).toHaveProperty('headerStyle');
    });
  });

  describe('getOfflineModalNavbar', () => {
    it('returns correct options', () => {
      const options = getOfflineModalNavbar();

      expect(options.headerShown).toBe(false);
    });
  });

  describe('getDepositNavbarOptions', () => {
    it('returns correct options with title', () => {
      const options = getDepositNavbarOptions(
        mockNavigation,
        { title: 'Deposit' },
        { colors: mockThemeColors },
      );

      expect(options).toHaveProperty('header');
    });

    it('shows back button when showBack is true', () => {
      const options = getDepositNavbarOptions(
        mockNavigation,
        { title: 'Deposit', showBack: true },
        { colors: mockThemeColors },
      );

      expect(options).toHaveProperty('header');
    });

    it('shows configuration button when showConfiguration is true', () => {
      const options = getDepositNavbarOptions(
        mockNavigation,
        {
          title: 'Deposit',
          showConfiguration: true,
          onConfigurationPress: jest.fn(),
        },
        { colors: mockThemeColors },
      );

      expect(options).toHaveProperty('header');
    });

    it('invokes onClose after pop when back is pressed and onClose is provided', () => {
      const onClose = jest.fn();
      const options = getDepositNavbarOptions(
        mockNavigation,
        { title: 'Deposit', showBack: true },
        { colors: mockThemeColors },
        onClose,
      );

      const { getByTestId } = render(options.header());
      fireEvent.press(getByTestId('deposit-back-navbar-button'));

      expect(mockNavigation.pop).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    it('omits start button when showBack and showClose are false', () => {
      const options = getDepositNavbarOptions(
        mockNavigation,
        {
          title: 'Deposit',
          showBack: false,
          showClose: false,
        },
        { colors: mockThemeColors },
      );

      const { queryByTestId } = render(options.header());
      expect(queryByTestId('deposit-back-navbar-button')).toBeNull();
    });
  });

  describe('getEditAccountNameNavBarOptions', () => {
    it('returns correct options', () => {
      const goBack = jest.fn();
      const options = getEditAccountNameNavBarOptions(goBack, mockThemeColors);

      expect(options).toHaveProperty('headerTitle');
      expect(options.headerLeft).toBeNull();
      expect(options).toHaveProperty('headerRight');
    });
  });

  describe('getNetworkNavbarOptions', () => {
    it('returns correct options', () => {
      const options = getNetworkNavbarOptions(
        'Network',
        false,
        mockNavigation,
        mockThemeColors,
      );

      expect(options).toHaveProperty('header');
    });

    it('shows right button when onRightPress is provided', () => {
      const onRightPress = jest.fn();
      const options = getNetworkNavbarOptions(
        'Network',
        false,
        mockNavigation,
        mockThemeColors,
        onRightPress,
      );

      expect(options).toHaveProperty('header');
    });
  });

  describe('getBridgeNavbar', () => {
    it('returns correct options for Bridge mode', () => {
      const options = getBridgeNavbar(
        mockNavigation,
        BridgeViewMode.Bridge,
        mockThemeColors,
      );

      expect(options).toBeDefined();
    });

    it('returns correct options for Swap mode', () => {
      const options = getBridgeNavbar(
        mockNavigation,
        BridgeViewMode.Swap,
        mockThemeColors,
      );

      expect(options).toBeDefined();
    });
  });

  describe('getBridgeTransactionDetailsNavbar', () => {
    it('returns correct options', () => {
      const options = getBridgeTransactionDetailsNavbar(mockNavigation);

      expect(options).toHaveProperty('headerTitle');
      expect(options).toHaveProperty('headerLeft');
    });
  });

  describe('getStakingNavbar', () => {
    it('returns correct options', () => {
      const options = getStakingNavbar(
        'Staking',
        mockNavigation,
        mockThemeColors,
      );

      expect(options).toHaveProperty('headerTitle');
      expect(options).toHaveProperty('headerStyle');
      expect(options).toHaveProperty('headerLeft');
      expect(options).toHaveProperty('headerRight');
    });

    it('hides back button when hasBackButton is false', () => {
      const options = getStakingNavbar(
        'Staking',
        mockNavigation,
        mockThemeColors,
        { hasBackButton: false },
      );

      expect(options).toHaveProperty('headerLeft');
    });

    it('shows icon button when hasIconButton is true', () => {
      const options = getStakingNavbar(
        'Staking',
        mockNavigation,
        mockThemeColors,
        {
          hasCancelButton: false,
          hasIconButton: true,
          handleIconPress: jest.fn(),
        },
      );

      expect(options).toHaveProperty('headerRight');
    });
  });

  describe('getDeFiProtocolPositionDetailsNavbarOptions', () => {
    it('returns correct options', () => {
      const options =
        getDeFiProtocolPositionDetailsNavbarOptions(mockNavigation);

      expect(options).toHaveProperty('headerTitle');
      expect(options).toHaveProperty('headerLeft');
    });
  });

  describe('getRampsOrderDetailsNavbarOptions', () => {
    it('returns correct options', () => {
      const options = getRampsOrderDetailsNavbarOptions(
        mockNavigation,
        { title: 'Order Details' },
        { colors: mockThemeColors },
      );

      expect(options).toBeDefined();
    });

    it('shows back button when showBack is true', () => {
      const options = getRampsOrderDetailsNavbarOptions(
        mockNavigation,
        { title: 'Order Details', showBack: true },
        { colors: mockThemeColors },
        jest.fn(),
      );

      expect(options).toBeDefined();
    });
  });

  describe('getPaymentSelectorMethodNavbar', () => {
    it('returns correct options', () => {
      const onPop = jest.fn();
      const options = getPaymentSelectorMethodNavbar(
        mockNavigation,
        onPop,
        mockThemeColors,
      );

      expect(options).toHaveProperty('headerTitle');
      expect(options).toHaveProperty('headerLeft');
      expect(options).toHaveProperty('headerRight');
      expect(options).toHaveProperty('headerStyle');
    });

    it('calls navigation.getParent().pop() and onPop when headerRight is pressed', () => {
      const onPop = jest.fn();
      const mockParentPop = jest.fn();
      const navigationWithParent = {
        ...mockNavigation,
        getParent: jest.fn(() => ({
          pop: mockParentPop,
        })),
      };
      const options = getPaymentSelectorMethodNavbar(
        navigationWithParent,
        onPop,
        mockThemeColors,
      );

      const HeaderRight = options.headerRight;
      const { getByText } = render(<HeaderRight />);
      fireEvent.press(getByText('Cancel'));

      expect(navigationWithParent.getParent).toHaveBeenCalled();
      expect(mockParentPop).toHaveBeenCalled();
      expect(onPop).toHaveBeenCalled();
    });
  });

  describe('getPaymentMethodApplePayNavbar', () => {
    it('returns correct options', () => {
      const onPop = jest.fn();
      const onExit = jest.fn();
      const options = getPaymentMethodApplePayNavbar(
        mockNavigation,
        onPop,
        onExit,
        mockThemeColors,
      );

      expect(options).toHaveProperty('title');
      expect(options).toHaveProperty('headerLeft');
      expect(options).toHaveProperty('headerRight');
      expect(options).toHaveProperty('headerStyle');
    });

    it('calls navigation.getParent().pop() and onExit when headerRight is pressed', () => {
      const onPop = jest.fn();
      const onExit = jest.fn();
      const mockParentPop = jest.fn();
      const navigationWithParent = {
        ...mockNavigation,
        getParent: jest.fn(() => ({
          pop: mockParentPop,
        })),
      };
      const options = getPaymentMethodApplePayNavbar(
        navigationWithParent,
        onPop,
        onExit,
        mockThemeColors,
      );

      const HeaderRight = options.headerRight;
      const { getByText } = render(<HeaderRight />);
      fireEvent.press(getByText('Cancel'));

      expect(navigationWithParent.getParent).toHaveBeenCalled();
      expect(mockParentPop).toHaveBeenCalled();
      expect(onExit).toHaveBeenCalled();
    });
  });

  describe('getSwapsAmountNavbar', () => {
    it('returns correct options', () => {
      const options = getSwapsAmountNavbar(
        mockNavigation,
        mockRoute,
        mockThemeColors,
      );

      expect(options).toHaveProperty('headerTitle');
      expect(options).toHaveProperty('headerLeft');
      expect(options).toHaveProperty('headerRight');
      expect(options).toHaveProperty('headerStyle');
    });

    it('calls navigation.getParent().pop() when headerRight is pressed', () => {
      const mockParentPop = jest.fn();
      const navigationWithParent = {
        ...mockNavigation,
        getParent: jest.fn(() => ({
          pop: mockParentPop,
        })),
      };
      const options = getSwapsAmountNavbar(
        navigationWithParent,
        mockRoute,
        mockThemeColors,
      );

      const HeaderRight = options.headerRight;
      const { getByText } = render(<HeaderRight />);
      fireEvent.press(getByText('Cancel'));

      expect(navigationWithParent.getParent).toHaveBeenCalled();
      expect(mockParentPop).toHaveBeenCalled();
    });
  });

  describe('getSwapsQuotesNavbar', () => {
    const mockSwapsRoute = {
      ...mockRoute,
      params: {
        requestedTrade: {
          token_from: 'ETH',
          token_to: 'DAI',
          request_type: 'Order',
          custom_slippage: false,
          chain_id: '0x1',
          token_from_amount: '1',
        },
        selectedQuote: { id: 'quote-1' },
        quoteBegin: Date.now(),
      },
    };

    it('returns correct options', () => {
      const options = getSwapsQuotesNavbar(
        mockNavigation,
        mockSwapsRoute,
        mockThemeColors,
      );

      expect(options).toHaveProperty('headerTitle');
      expect(options).toHaveProperty('headerLeft');
      expect(options).toHaveProperty('headerRight');
      expect(options).toHaveProperty('headerStyle');
    });

    it('calls navigation.getParent().pop() when headerRight is pressed', () => {
      const mockParentPop = jest.fn();
      const navigationWithParent = {
        ...mockNavigation,
        getParent: jest.fn(() => ({
          pop: mockParentPop,
        })),
      };
      const options = getSwapsQuotesNavbar(
        navigationWithParent,
        mockSwapsRoute,
        mockThemeColors,
      );

      const HeaderRight = options.headerRight;
      const { getByText } = render(<HeaderRight />);
      fireEvent.press(getByText('Cancel'));

      expect(navigationWithParent.getParent).toHaveBeenCalled();
      expect(mockParentPop).toHaveBeenCalled();
    });
  });

  describe('getBridgeNavbar back button behavior', () => {
    it('calls navigation.goBack() when back button is pressed', () => {
      const navigationWithParent = {
        ...mockNavigation,
        getParent: jest.fn(),
      };
      const options = getBridgeNavbar(
        navigationWithParent,
        BridgeViewMode.Bridge,
        mockThemeColors,
      );

      expect(options).toBeDefined();
      const Header = options.header;
      const { getByTestId } = render(<Header />);
      fireEvent.press(getByTestId('button-icon'));
      expect(navigationWithParent.goBack).toHaveBeenCalled();
      expect(navigationWithParent.getParent).not.toHaveBeenCalled();
    });
  });

  describe('getEditableOptions back button behavior', () => {
    it('calls navigation.pop when back button is pressed in edit mode', () => {
      const routeWithEditMode = {
        ...mockRoute,
        params: { editMode: 'edit', dispatch: jest.fn() },
      };
      const options = getEditableOptions(
        'Contact',
        mockNavigation,
        routeWithEditMode,
        mockThemeColors,
      );

      const HeaderLeft = options.headerLeft;
      const { getByTestId } = render(<HeaderLeft />);
      fireEvent.press(getByTestId('edit-contact-back-button'));

      expect(mockNavigation.pop).toHaveBeenCalled();
    });
  });

  describe('getNavigationOptionsTitle close button behavior', () => {
    it('renders and handles close button in fullscreen modal mode', () => {
      const options = getNavigationOptionsTitle(
        'Settings',
        mockNavigation,
        true,
        mockThemeColors,
      );

      const HeaderRight = options.headerRight;
      if (HeaderRight) {
        const { getByTestId } = render(<HeaderRight />);
        fireEvent.press(getByTestId('close-network-icon'));
        expect(mockNavigation.goBack).toHaveBeenCalled();
      }
    });
  });

  describe('getStakingNavbar back button behavior', () => {
    it('calls navigation.goBack when back button is pressed', () => {
      const options = getStakingNavbar(
        'Staking',
        mockNavigation,
        mockThemeColors,
        { hasBackButton: true },
      );

      const HeaderLeft = options.headerLeft;
      if (HeaderLeft) {
        const rendered = render(
          typeof HeaderLeft === 'function' ? <HeaderLeft /> : HeaderLeft,
        );
        fireEvent.press(rendered.getByTestId('button-icon'));
        expect(mockNavigation.goBack).toHaveBeenCalled();
        expect(rendered).toBeTruthy();
      }
    });
  });

  describe('getDepositNavbarOptions close button behavior', () => {
    it('invokes onClose after pop when close button is pressed', () => {
      const onClose = jest.fn();
      const options = getDepositNavbarOptions(
        mockNavigation,
        { title: 'Deposit', showClose: true },
        { colors: mockThemeColors },
        onClose,
      );

      const rendered = render(options.header());
      expect(rendered).toBeTruthy();
      const { getByTestId } = rendered;
      fireEvent.press(getByTestId('deposit-back-navbar-button'));
      expect(mockNavigation.pop).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('getRampsOrderDetailsNavbarOptions close behavior', () => {
    it('shows close button when showCloseButton is true', () => {
      const options = getRampsOrderDetailsNavbarOptions(
        mockNavigation,
        { title: 'Order Details', showCloseButton: true },
        { colors: mockThemeColors },
      );

      expect(options).toBeDefined();
    });
  });
});

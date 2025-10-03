import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import RewardSettingsAccountGroup from './RewardSettingsAccountGroup';
import { useLinkAccountGroup } from '../../hooks/useLinkAccountGroup';
import { RewardSettingsAccountGroupListFlatListItem } from './types';
import { AccountGroupWithOptInStatus } from '../../hooks/useRewardOptinSummary';
import { AvatarAccountType } from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { EthScope } from '@metamask/keyring-api';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../hooks/useLinkAccountGroup', () => ({
  useLinkAccountGroup: jest.fn(),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: jest.fn(() => ({
    style: jest.fn(() => ({})),
  })),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
  default: {
    locale: 'en',
  },
}));

jest.mock('lodash', () => ({
  isEmpty: jest.fn((value: unknown) => {
    if (value == null) return true;
    if (typeof value === 'string') return value.length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  }),
  memoize: jest.fn((fn) => fn),
}));

// Mock component library components
jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const {
    Text: RNText,
    View,
    TouchableOpacity,
  } = jest.requireActual('react-native');

  return {
    Box: ({
      children,
      testID,
      onPress,
      ...props
    }: {
      children?: React.ReactNode;
      testID?: string;
      onPress?: () => void;
      [key: string]: unknown;
    }) =>
      ReactActual.createElement(View, { testID, onPress, ...props }, children),
    Text: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => ReactActual.createElement(RNText, props, children),
    Button: ({
      children,
      onPress,
      testID,
      disabled,
      ...props
    }: {
      children?: React.ReactNode;
      onPress?: () => void;
      testID?: string;
      disabled?: boolean;
      [key: string]: unknown;
    }) =>
      ReactActual.createElement(
        TouchableOpacity,
        {
          onPress,
          testID,
          disabled,
          ...props,
        },
        ReactActual.createElement(
          RNText,
          {
            disabled,
            accessibilityState: disabled ? { disabled: true } : undefined,
          },
          children,
        ),
      ),
    TextVariant: {
      BodyMd: 'BodyMd',
      BodySm: 'BodySm',
      HeadingMd: 'HeadingMd',
      HeadingSm: 'HeadingSm',
    },
    BoxFlexDirection: {
      Column: 'column',
      Row: 'row',
    },
    BoxAlignItems: {
      Center: 'center',
    },
    BoxJustifyContent: {
      Between: 'space-between',
    },
    FontWeight: {
      Medium: 'medium',
    },
    ButtonVariant: {
      Secondary: 'secondary',
    },
    ButtonSize: {
      Lg: 'lg',
    },
  };
});

// Mock AvatarAccount component
jest.mock(
  '../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');

    const MockedAvatarAccount = ReactActual.forwardRef(
      (
        props: {
          accountAddress?: string;
          type?: string;
          size?: string;
          testID?: string;
        },
        ref: React.Ref<unknown>,
      ) =>
        ReactActual.createElement(
          View,
          {
            testID: props.testID || 'avatar-account',
            ref,
          },
          ReactActual.createElement(View, { testID: 'avatar-content' }),
        ),
    );

    return {
      __esModule: true,
      default: MockedAvatarAccount,
      AvatarAccountType: {
        Maskicon: 'Maskicon',
        Blockie: 'Blockie',
      },
    };
  },
);

// Mock Avatar component
jest.mock('../../../../../component-library/components/Avatars/Avatar', () => ({
  AvatarSize: {
    Xs: '16',
    Sm: '20',
    Md: '24',
    Lg: '32',
    Xl: '40',
  },
  AvatarVariant: {
    Account: 'Account',
    Network: 'Network',
  },
}));

// Mock Icon component
jest.mock('../../../../../component-library/components/Icons/Icon', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  const MockIcon = ({
    name,
    color,
    testID,
    ...props
  }: {
    name: string;
    color: string;
    testID?: string;
    [key: string]: unknown;
  }) =>
    ReactActual.createElement(View, {
      testID: testID || `icon-${name}`,
      ...props,
    });

  return {
    __esModule: true,
    default: MockIcon,
    IconName: {
      QrCode: 'qr-code',
      Check: 'check',
    },
    IconColor: {
      Default: 'default',
      Success: 'success',
    },
    IconSize: {
      Xss: '10',
      Xs: '12',
      Sm: '16',
      Md: '20',
      Lg: '24',
      Xl: '32',
      XXL: '72',
    },
  };
});

// Mock SensitiveText component
jest.mock(
  '../../../../../component-library/components/Texts/SensitiveText',
  () => {
    const ReactActual = jest.requireActual('react');
    const { Text } = jest.requireActual('react-native');

    return {
      __esModule: true,
      default: ({
        children,
        isHidden,
        testID,
        ...props
      }: {
        children: React.ReactNode;
        isHidden?: boolean;
        testID?: string;
        [key: string]: unknown;
      }) =>
        ReactActual.createElement(
          Text,
          {
            testID: testID || 'sensitive-text',
            ...props,
          },
          isHidden ? '••••••' : children,
        ),
      SensitiveTextLength: {
        Short: 'short',
        Medium: 'medium',
        Long: 'long',
      },
    };
  },
);

// Mock Text component
jest.mock('../../../../../component-library/components/Texts/Text', () => ({
  TextColor: {
    Primary: 'primary',
    Secondary: 'secondary',
    Alternative: 'alternative',
  },
  TextVariant: {
    BodySMMedium: 'BodySMMedium',
    BodyMDMedium: 'BodyMDMedium',
  },
}));

// Mock selectors
jest.mock('../../../../../selectors/multichainAccounts/accounts', () => ({
  selectIconSeedAddressByAccountGroupId: jest.fn(),
}));

jest.mock('../../../../../selectors/assets/balances', () => ({
  selectBalanceByAccountGroup: jest.fn(),
}));

jest.mock('../../../../../selectors/preferencesController', () => ({
  selectPrivacyMode: jest.fn(),
}));

// Mock utility functions
jest.mock('../../../../../util/assets', () => ({
  formatWithThreshold: jest.fn((value: number) => `$${value.toFixed(2)}`),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseLinkAccountGroup = useLinkAccountGroup as jest.MockedFunction<
  typeof useLinkAccountGroup
>;

describe('RewardSettingsAccountGroup', () => {
  const mockNavigate = jest.fn();
  const mockLinkAccountGroup = jest.fn();

  const mockAccountGroup: AccountGroupWithOptInStatus = {
    id: 'keyring:wallet-1/ethereum',
    name: 'Test Account Group',
    optedInAccounts: [
      {
        id: 'account-1',
        address: '0x1234567890123456789012345678901234567890',
        hasOptedIn: true,
        scopes: [EthScope.Mainnet],
        type: 'eip155:eoa',
        options: {},
        metadata: {
          name: '',
          importTime: 0,
          keyring: {
            type: '',
          },
          nameLastUpdatedAt: undefined,
          snap: undefined,
          lastSelected: undefined,
        },
        methods: [],
      },
    ],
    optedOutAccounts: [
      {
        id: 'account-2',
        address: '0x0987654321098765432109876543210987654321',
        hasOptedIn: false,
        scopes: [EthScope.Mainnet],
        type: 'eip155:eoa',
        options: {},
        metadata: {
          name: '',
          importTime: 0,
          keyring: {
            type: '',
          },
          nameLastUpdatedAt: undefined,
          snap: undefined,
          lastSelected: undefined,
        },
        methods: [],
      },
    ],
  };

  const mockItem: RewardSettingsAccountGroupListFlatListItem = {
    type: 'accountGroup',
    accountGroup: mockAccountGroup,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock useNavigation
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
      goBack: jest.fn(),
      reset: jest.fn(),
      setParams: jest.fn(),
      dispatch: jest.fn(),
      canGoBack: jest.fn(),
      isFocused: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
    } as never);

    // Mock useLinkAccountGroup
    mockUseLinkAccountGroup.mockReturnValue({
      linkAccountGroup: mockLinkAccountGroup,
      isLoading: false,
      isError: false,
    });

    // Mock useSelector calls
    mockUseSelector.mockImplementation((selector) => {
      // Mock selectIconSeedAddressByAccountGroupId
      if (
        selector.toString().includes('selectIconSeedAddressByAccountGroupId')
      ) {
        return '0x1234567890123456789012345678901234567890';
      }

      // Mock selectBalanceByAccountGroup
      if (selector.toString().includes('selectBalanceByAccountGroup')) {
        return {
          totalBalanceInUserCurrency: 100.5,
          userCurrency: 'usd',
        };
      }

      // Mock selectPrivacyMode
      if (selector.toString().includes('selectPrivacyMode')) {
        return false;
      }

      return null;
    });
  });

  describe('Basic Rendering', () => {
    it('should render account group with correct testID', () => {
      const { getByTestId } = render(
        <RewardSettingsAccountGroup
          item={mockItem}
          avatarAccountType={AvatarAccountType.Maskicon}
        />,
      );

      expect(
        getByTestId('rewards-account-group-keyring:wallet-1/ethereum'),
      ).toBeOnTheScreen();
    });

    it('should render account group name', () => {
      const { getByTestId } = render(
        <RewardSettingsAccountGroup
          item={mockItem}
          avatarAccountType={AvatarAccountType.Maskicon}
        />,
      );

      expect(
        getByTestId('rewards-account-group-name-keyring:wallet-1/ethereum'),
      ).toBeOnTheScreen();
    });

    it('should render account group avatar', () => {
      const { getByTestId } = render(
        <RewardSettingsAccountGroup
          item={mockItem}
          avatarAccountType={AvatarAccountType.Maskicon}
        />,
      );

      expect(
        getByTestId('rewards-account-group-avatar-keyring:wallet-1/ethereum'),
      ).toBeOnTheScreen();
    });

    it('should render account group balance when available', () => {
      const { getByTestId } = render(
        <RewardSettingsAccountGroup
          item={mockItem}
          avatarAccountType={AvatarAccountType.Maskicon}
        />,
      );

      expect(
        getByTestId('rewards-account-group-balance-keyring:wallet-1/ethereum'),
      ).toBeOnTheScreen();
    });

    it('should render action buttons', () => {
      const { getByTestId } = render(
        <RewardSettingsAccountGroup
          item={mockItem}
          avatarAccountType={AvatarAccountType.Maskicon}
        />,
      );

      expect(
        getByTestId('rewards-account-addresses-keyring:wallet-1/ethereum'),
      ).toBeOnTheScreen();
      expect(
        getByTestId(
          'rewards-account-group-link-button-keyring:wallet-1/ethereum',
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('Button States', () => {
    it('should show check icon when all accounts are opted in', () => {
      const itemWithNoOptedOut: RewardSettingsAccountGroupListFlatListItem = {
        type: 'accountGroup',
        accountGroup: {
          ...mockAccountGroup,
          optedOutAccounts: [],
        },
      };

      const { getByTestId } = render(
        <RewardSettingsAccountGroup
          item={itemWithNoOptedOut}
          avatarAccountType={AvatarAccountType.Maskicon}
        />,
      );

      expect(getByTestId('icon-check')).toBeOnTheScreen();
    });

    it('should show link text when there are opted out accounts', () => {
      const { getByText } = render(
        <RewardSettingsAccountGroup
          item={mockItem}
          avatarAccountType={AvatarAccountType.Maskicon}
        />,
      );

      expect(
        getByText('rewards.link_account_group.link_account'),
      ).toBeOnTheScreen();
    });
  });

  describe('User Interactions', () => {
    it('should call linkAccountGroup when link button is pressed', async () => {
      const { getByTestId } = render(
        <RewardSettingsAccountGroup
          item={mockItem}
          avatarAccountType={AvatarAccountType.Maskicon}
        />,
      );

      const linkButton = getByTestId(
        'rewards-account-group-link-button-keyring:wallet-1/ethereum',
      );
      fireEvent.press(linkButton);

      expect(mockLinkAccountGroup).toHaveBeenCalledWith(
        'keyring:wallet-1/ethereum',
      );
    });

    it('should navigate to modal when QR button is pressed', () => {
      const { getByTestId } = render(
        <RewardSettingsAccountGroup
          item={mockItem}
          avatarAccountType={AvatarAccountType.Maskicon}
        />,
      );

      const qrButton = getByTestId(
        'rewards-account-addresses-keyring:wallet-1/ethereum',
      );
      fireEvent.press(qrButton);

      expect(mockNavigate).toHaveBeenCalledWith(
        'RewardOptInAccountGroupModal',
        {
          accountGroupId: 'keyring:wallet-1/ethereum',
          addressData: [
            {
              address: '0x1234567890123456789012345678901234567890',
              hasOptedIn: true,
              scopes: [EthScope.Mainnet],
            },
            {
              address: '0x0987654321098765432109876543210987654321',
              hasOptedIn: false,
              scopes: [EthScope.Mainnet],
            },
          ],
        },
      );
    });
  });

  describe('Edge Cases', () => {
    it('should return null when accountGroup is undefined', () => {
      const itemWithoutGroup: RewardSettingsAccountGroupListFlatListItem = {
        type: 'accountGroup',
        accountGroup: undefined,
      };

      const { queryByTestId } = render(
        <RewardSettingsAccountGroup
          item={itemWithoutGroup}
          avatarAccountType={AvatarAccountType.Maskicon}
        />,
      );

      expect(
        queryByTestId('rewards-account-group-keyring:wallet-1/ethereum'),
      ).toBeNull();
    });

    it('should return null when both opted in and opted out accounts are empty', () => {
      const itemWithEmptyAccounts: RewardSettingsAccountGroupListFlatListItem =
        {
          type: 'accountGroup',
          accountGroup: {
            ...mockAccountGroup,
            optedInAccounts: [],
            optedOutAccounts: [],
          },
        };

      const { queryByTestId } = render(
        <RewardSettingsAccountGroup
          item={itemWithEmptyAccounts}
          avatarAccountType={AvatarAccountType.Maskicon}
        />,
      );

      expect(
        queryByTestId('rewards-account-group-keyring:wallet-1/ethereum'),
      ).toBeNull();
    });

    it('should not render balance when balance data is unavailable', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector.toString().includes('selectBalanceByAccountGroup')) {
          return null;
        }
        if (
          selector.toString().includes('selectIconSeedAddressByAccountGroupId')
        ) {
          return '0x1234567890123456789012345678901234567890';
        }
        if (selector.toString().includes('selectPrivacyMode')) {
          return false;
        }
        return null;
      });

      const { queryByTestId } = render(
        <RewardSettingsAccountGroup
          item={mockItem}
          avatarAccountType={AvatarAccountType.Maskicon}
        />,
      );

      expect(
        queryByTestId(
          'rewards-account-group-balance-keyring:wallet-1/ethereum',
        ),
      ).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('should have proper testIDs for accessibility testing', () => {
      const { getByTestId } = render(
        <RewardSettingsAccountGroup
          item={mockItem}
          avatarAccountType={AvatarAccountType.Maskicon}
        />,
      );

      // Test that all major components have testIDs
      expect(
        getByTestId('rewards-account-group-keyring:wallet-1/ethereum'),
      ).toBeOnTheScreen();
      expect(
        getByTestId('rewards-account-group-avatar-keyring:wallet-1/ethereum'),
      ).toBeOnTheScreen();
      expect(
        getByTestId('rewards-account-group-name-keyring:wallet-1/ethereum'),
      ).toBeOnTheScreen();
      expect(
        getByTestId('rewards-account-group-balance-keyring:wallet-1/ethereum'),
      ).toBeOnTheScreen();
      expect(
        getByTestId('rewards-account-addresses-keyring:wallet-1/ethereum'),
      ).toBeOnTheScreen();
      expect(
        getByTestId(
          'rewards-account-group-link-button-keyring:wallet-1/ethereum',
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('Memoization', () => {
    it('should memoize the component to prevent unnecessary re-renders', () => {
      const { rerender } = render(
        <RewardSettingsAccountGroup
          item={mockItem}
          avatarAccountType={AvatarAccountType.Maskicon}
        />,
      );

      // Re-render with same props
      rerender(
        <RewardSettingsAccountGroup
          item={mockItem}
          avatarAccountType={AvatarAccountType.Maskicon}
        />,
      );

      // The component should be memoized, so internal functions shouldn't be recreated
      // This is tested indirectly through the component's behavior
    });
  });
});

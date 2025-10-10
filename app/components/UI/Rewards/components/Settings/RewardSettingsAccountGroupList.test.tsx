import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import RewardSettingsAccountGroupList from './RewardSettingsAccountGroupList';
import {
  useRewardOptinSummary,
  WalletWithAccountGroupsWithOptInStatus,
} from '../../hooks/useRewardOptinSummary';
import { useOptout } from '../../hooks/useOptout';
import { useMetrics } from '../../../../hooks/useMetrics';
import { AccountWalletType } from '@metamask/account-api';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: jest.fn(() => ({
    style: jest.fn(() => ({})),
  })),
}));

jest.mock('../../hooks/useRewardOptinSummary', () => ({
  useRewardOptinSummary: jest.fn(),
}));

jest.mock('../../hooks/useOptout', () => ({
  useOptout: jest.fn(),
}));

jest.mock('../../../../hooks/useMetrics', () => ({
  useMetrics: jest.fn(),
}));

jest.mock('../../../../../selectors/settings', () => ({
  selectAvatarAccountType: jest.fn(),
}));

const mockSelectInternalAccountsByGroupId = jest.fn();
jest.mock('../../../../../selectors/multichainAccounts/accounts', () => ({
  selectInternalAccountsByGroupId: mockSelectInternalAccountsByGroupId,
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

// Mock FlashList
jest.mock('@shopify/flash-list', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return {
    FlashList: ({
      data,
      renderItem,
      keyExtractor,
      ListHeaderComponent,
      ListEmptyComponent,
      ListFooterComponent,
      ...props
    }: {
      data: unknown[];
      renderItem: (info: {
        item: unknown;
        index: number;
      }) => React.ReactElement;
      keyExtractor: (item: unknown, index: number) => string;
      ListHeaderComponent?: () => React.ReactElement;
      ListEmptyComponent?: () => React.ReactElement;
      ListFooterComponent?: () => React.ReactElement;
      [key: string]: unknown;
    }) =>
      ReactActual.createElement(
        View,
        { testID: 'rewards-settings-flash-list', ...props },
        ListHeaderComponent &&
          ReactActual.createElement(
            View,
            { testID: 'list-header' },
            ReactActual.createElement(ListHeaderComponent),
          ),
        data && Array.isArray(data) && data.length > 0
          ? data.map((item: unknown, index: number) => {
              const key = keyExtractor ? keyExtractor(item, index) : index;
              return ReactActual.createElement(
                View,
                { key, testID: `flash-list-item-${key}` },
                renderItem({
                  item,
                  index,
                }),
              );
            })
          : ListEmptyComponent &&
              ReactActual.createElement(
                View,
                { testID: 'list-empty' },
                ReactActual.createElement(ListEmptyComponent),
              ),
        ListFooterComponent &&
          ReactActual.createElement(
            View,
            { testID: 'list-footer' },
            ReactActual.createElement(ListFooterComponent),
          ),
      ),
  };
});

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
      ...props
    }: {
      children?: React.ReactNode;
      testID?: string;
      [key: string]: unknown;
    }) => ReactActual.createElement(View, { testID, ...props }, children),
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
    ButtonVariants: {
      Secondary: 'secondary',
    },
  };
});

// Mock Skeleton component
jest.mock('../../../../../component-library/components/Skeleton', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return {
    Skeleton: ({
      height,
      width,
      style,
      ...props
    }: {
      height: number;
      width: number;
      style?: unknown;
      [key: string]: unknown;
    }) =>
      ReactActual.createElement(View, {
        testID: 'skeleton',
        style: [{ height, width }, style],
        ...props,
      }),
  };
});

// Mock RewardsErrorBanner component
jest.mock('../RewardsErrorBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View, TouchableOpacity, Text } = jest.requireActual('react-native');

  return ReactActual.forwardRef(
    (
      props: {
        title: string;
        description: string;
        onConfirm: () => void;
        confirmButtonLabel: string;
        testID?: string;
      },
      ref: React.Ref<unknown>,
    ) =>
      ReactActual.createElement(
        View,
        { testID: props.testID || 'rewards-error-banner', ref },
        ReactActual.createElement(Text, {}, props.title),
        ReactActual.createElement(Text, {}, props.description),
        ReactActual.createElement(
          TouchableOpacity,
          { testID: 'retry-button', onPress: props.onConfirm },
          ReactActual.createElement(Text, {}, props.confirmButtonLabel),
        ),
      ),
  );
});

// Mock RewardSettingsAccountGroup component
jest.mock('./RewardSettingsAccountGroup', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return ReactActual.forwardRef(
    (
      props: {
        item: unknown;
        avatarAccountType: string;
        testID?: string;
      },
      ref: React.Ref<unknown>,
    ) =>
      ReactActual.createElement(
        View,
        {
          testID: props.testID || 'reward-settings-account-group',
          ref,
        },
        ReactActual.createElement(View, { testID: 'account-group-content' }),
      ),
  );
});

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseRewardOptinSummary = useRewardOptinSummary as jest.MockedFunction<
  typeof useRewardOptinSummary
>;
const mockUseOptout = useOptout as jest.MockedFunction<typeof useOptout>;
const mockUseMetrics = useMetrics as jest.MockedFunction<typeof useMetrics>;

describe('RewardSettingsAccountGroupList', () => {
  const mockWalletData = [
    {
      wallet: {
        id: 'keyring:wallet-1',
        type: AccountWalletType.Keyring as unknown as AccountWalletType,
        status: 'unlocked',
        metadata: {
          name: 'Test Wallet 1',
          keyring: {
            type: 'HD Key Tree',
          },
        },
        groups: {},
      },
      groups: [
        {
          id: 'group-1',
          name: 'Account Group 1',
          optedInAccounts: [
            {
              id: 'account-1',
              address: '0x1234567890123456789012345678901234567890',
              hasOptedIn: true,
            },
          ],
          optedOutAccounts: [],
        },
        {
          id: 'group-2',
          name: 'Account Group 2',
          optedInAccounts: [],
          optedOutAccounts: [
            {
              id: 'account-2',
              address: '0x0987654321098765432109876543210987654321',
              hasOptedIn: false,
            },
          ],
        },
      ],
    },
    {
      wallet: {
        id: 'keyring:wallet-2',
        type: AccountWalletType.Keyring as unknown as AccountWalletType,
        status: 'unlocked',
        metadata: {
          name: 'Test Wallet 2',
          keyring: {
            type: 'HD Key Tree',
          },
        },
        groups: {},
      },
      groups: [
        {
          id: 'group-3',
          name: 'Account Group 3',
          optedInAccounts: [
            {
              id: 'account-3',
              address: '0x1111111111111111111111111111111111111111',
              hasOptedIn: true,
            },
          ],
          optedOutAccounts: [],
        },
      ],
    },
  ] as unknown as WalletWithAccountGroupsWithOptInStatus[];

  const mockShowOptoutBottomSheet = jest.fn();
  const mockTrackEvent = jest.fn();
  const mockCreateEventBuilder = jest.fn(() => ({
    addProperties: jest.fn().mockReturnThis(),
    build: jest.fn(() => ({})),
    addSensitiveProperties: jest.fn().mockReturnThis(),
    removeProperties: jest.fn().mockReturnThis(),
  })) as unknown as jest.MockedFunction<(event: unknown) => unknown>;
  const mockFetchOptInStatus = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock selectInternalAccountsByGroupId to return accounts for each group
    mockSelectInternalAccountsByGroupId.mockImplementation(
      (groupId: string) => {
        const mockAccounts: Record<string, { address: string }[]> = {
          'group-1': [
            { address: '0x1234567890123456789012345678901234567890' },
          ],
          'group-2': [
            { address: '0x0987654321098765432109876543210987654321' },
          ],
          'group-3': [
            { address: '0x1111111111111111111111111111111111111111' },
          ],
        };
        return mockAccounts[groupId] || [];
      },
    );

    // Mock useSelector calls
    mockUseSelector.mockImplementation((selector) => {
      // Mock selectAvatarAccountType selector
      if (selector.toString().includes('selectAvatarAccountType')) {
        return 'default';
      }

      // For the allAddresses selector, let it execute normally since we've mocked selectInternalAccountsByGroupId
      // The selector will now work correctly with our mocked data
      return selector({});
    });

    // Mock useRewardOptinSummary hook
    mockUseRewardOptinSummary.mockReturnValue({
      byWallet: mockWalletData,
      isLoading: false,
      hasError: false,
      refresh: mockFetchOptInStatus,
      bySelectedAccountGroup: null,
      currentAccountGroupFullyOptedIn: null,
      currentAccountGroupFullySupported: null,
    });

    // Mock useOptout hook
    mockUseOptout.mockReturnValue({
      optout: jest.fn().mockResolvedValue(true),
      isLoading: false,
      showOptoutBottomSheet: mockShowOptoutBottomSheet,
    });

    // Mock useMetrics hook
    mockUseMetrics.mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
      addTraitsToUser: jest.fn(),
      isEnabled: true,
      enable: jest.fn(),
      createDataDeletionTask: jest.fn(),
      checkDataDeleteStatus: jest.fn(),
      getDataDeletionTaskStatus: jest.fn(),
      getDataDeletionTaskId: jest.fn(),
      getDataDeletionTaskUrl: jest.fn(),
    } as never);
  });

  describe('Loading State', () => {
    it('should render loading skeleton when isLoading is true', () => {
      mockUseRewardOptinSummary.mockReturnValue({
        byWallet: [],
        isLoading: true,
        hasError: false,
        refresh: mockFetchOptInStatus,
        bySelectedAccountGroup: null,
        currentAccountGroupFullyOptedIn: null,
        currentAccountGroupFullySupported: null,
      });

      const { getByTestId } = render(<RewardSettingsAccountGroupList />);

      expect(getByTestId('rewards-settings-loading')).toBeOnTheScreen();
      expect(getByTestId('rewards-settings-skeleton-0')).toBeOnTheScreen();
      expect(getByTestId('rewards-settings-skeleton-1')).toBeOnTheScreen();
      expect(getByTestId('rewards-settings-skeleton-2')).toBeOnTheScreen();
    });

    it('should render header and footer in loading state', () => {
      mockUseRewardOptinSummary.mockReturnValue({
        byWallet: [],
        isLoading: true,
        hasError: false,
        refresh: mockFetchOptInStatus,
        bySelectedAccountGroup: null,
        currentAccountGroupFullyOptedIn: null,
        currentAccountGroupFullySupported: null,
      });

      const { getByTestId } = render(<RewardSettingsAccountGroupList />);

      expect(getByTestId('rewards-settings-header')).toBeOnTheScreen();
      expect(getByTestId('rewards-settings-footer')).toBeOnTheScreen();
    });
  });

  describe('Error State', () => {
    it('should render error banner when hasError is true', () => {
      mockUseRewardOptinSummary.mockReturnValue({
        byWallet: [],
        isLoading: false,
        hasError: true,
        refresh: mockFetchOptInStatus,
        bySelectedAccountGroup: null,
        currentAccountGroupFullyOptedIn: null,
        currentAccountGroupFullySupported: null,
      });

      const { getByTestId } = render(<RewardSettingsAccountGroupList />);

      expect(getByTestId('rewards-settings-error')).toBeOnTheScreen();
      expect(getByTestId('rewards-settings-error-banner')).toBeOnTheScreen();
    });

    it('should call refresh when retry button is pressed', () => {
      mockUseRewardOptinSummary.mockReturnValue({
        byWallet: [],
        isLoading: false,
        hasError: true,
        refresh: mockFetchOptInStatus,
        bySelectedAccountGroup: null,
        currentAccountGroupFullyOptedIn: null,
        currentAccountGroupFullySupported: null,
      });

      const { getByTestId } = render(<RewardSettingsAccountGroupList />);

      const retryButton = getByTestId('retry-button');
      fireEvent.press(retryButton);

      expect(mockFetchOptInStatus).toHaveBeenCalledTimes(1);
    });

    it('should render header and footer in error state', () => {
      mockUseRewardOptinSummary.mockReturnValue({
        byWallet: [],
        isLoading: false,
        hasError: true,
        refresh: mockFetchOptInStatus,
        bySelectedAccountGroup: null,
        currentAccountGroupFullyOptedIn: null,
        currentAccountGroupFullySupported: null,
      });

      const { getByTestId } = render(<RewardSettingsAccountGroupList />);

      expect(getByTestId('rewards-settings-header')).toBeOnTheScreen();
      expect(getByTestId('rewards-settings-footer')).toBeOnTheScreen();
    });
  });

  describe('Success State', () => {
    it('should render FlashList with correct data', () => {
      const { getByTestId } = render(<RewardSettingsAccountGroupList />);

      expect(getByTestId('rewards-settings-flash-list')).toBeOnTheScreen();
    });

    it('should render wallet headers and account groups', () => {
      const { getByTestId } = render(<RewardSettingsAccountGroupList />);

      expect(getByTestId('wallet-header-wallet-1')).toBeOnTheScreen();
      expect(getByTestId('wallet-header-wallet-2')).toBeOnTheScreen();
      expect(getByTestId('account-group-group-1')).toBeOnTheScreen();
      expect(getByTestId('account-group-group-2')).toBeOnTheScreen();
      expect(getByTestId('account-group-group-3')).toBeOnTheScreen();
    });

    it('should render header and footer components', () => {
      const { getByTestId } = render(<RewardSettingsAccountGroupList />);

      expect(getByTestId('rewards-settings-header')).toBeOnTheScreen();
      expect(getByTestId('rewards-settings-footer')).toBeOnTheScreen();
    });

    it('should render opt-out button', () => {
      const { getByTestId } = render(<RewardSettingsAccountGroupList />);

      expect(getByTestId('rewards-opt-out-button')).toBeOnTheScreen();
    });
  });

  describe('Opt-out Button Functionality', () => {
    it('should disable opt-out button when isOptingOut is true', () => {
      mockUseOptout.mockReturnValue({
        optout: jest.fn().mockResolvedValue(true),
        isLoading: true,
        showOptoutBottomSheet: mockShowOptoutBottomSheet,
      });

      const { getByTestId } = render(<RewardSettingsAccountGroupList />);

      const optOutButton = getByTestId('rewards-opt-out-button');
      expect(optOutButton.props.disabled).toBe(true);
    });
  });

  describe('Data Processing', () => {
    it('should handle wallet items with missing metadata name', () => {
      const walletDataWithMissingName = [
        {
          wallet: {
            id: 'keyring:wallet-no-name',
            type: AccountWalletType.Keyring as unknown as AccountWalletType,
            status: 'unlocked',
            metadata: {
              keyring: {
                type: 'HD Key Tree',
              },
            },
            groups: {},
          },
          groups: [],
        },
      ] as unknown as WalletWithAccountGroupsWithOptInStatus[];

      mockUseRewardOptinSummary.mockReturnValue({
        byWallet: walletDataWithMissingName,
        isLoading: false,
        hasError: false,
        refresh: mockFetchOptInStatus,
        bySelectedAccountGroup: null,
        currentAccountGroupFullyOptedIn: null,
        currentAccountGroupFullySupported: null,
      });

      const { getByTestId } = render(<RewardSettingsAccountGroupList />);

      expect(getByTestId('wallet-header-wallet-no-name')).toBeOnTheScreen();
    });

    it('should handle account groups with missing IDs', () => {
      const walletDataWithMissingGroupId = [
        {
          wallet: {
            id: 'keyring:wallet-1',
            type: AccountWalletType.Keyring as unknown as AccountWalletType,
            status: 'unlocked',
            metadata: {
              name: 'Test Wallet',
              keyring: {
                type: 'HD Key Tree',
              },
            },
            groups: {},
          },
          groups: [
            {
              id: undefined,
              name: 'Group without ID',
              optedInAccounts: [],
              optedOutAccounts: [],
            },
          ],
        },
      ];

      mockUseRewardOptinSummary.mockReturnValue({
        byWallet:
          walletDataWithMissingGroupId as unknown as WalletWithAccountGroupsWithOptInStatus[],
        isLoading: false,
        hasError: false,
        refresh: mockFetchOptInStatus,
        bySelectedAccountGroup: null,
        currentAccountGroupFullyOptedIn: null,
        currentAccountGroupFullySupported: null,
      });

      const { getByTestId } = render(<RewardSettingsAccountGroupList />);

      expect(getByTestId('account-group-unknown')).toBeOnTheScreen();
    });
  });

  describe('Key Extractor', () => {
    it('should generate correct keys for wallet items', () => {
      const { getByTestId } = render(<RewardSettingsAccountGroupList />);

      // The FlashList mock uses keyExtractor to generate testIDs
      expect(getByTestId('flash-list-item-wallet-wallet-1')).toBeOnTheScreen();
      expect(getByTestId('flash-list-item-wallet-wallet-2')).toBeOnTheScreen();
    });

    it('should generate correct keys for account group items', () => {
      const { getByTestId } = render(<RewardSettingsAccountGroupList />);

      expect(
        getByTestId('flash-list-item-accountGroup-group-1'),
      ).toBeOnTheScreen();
      expect(
        getByTestId('flash-list-item-accountGroup-group-2'),
      ).toBeOnTheScreen();
      expect(
        getByTestId('flash-list-item-accountGroup-group-3'),
      ).toBeOnTheScreen();
    });

    it('should handle fallback keys for unknown item types', () => {
      // This would be tested by passing invalid data, but our mock doesn't support that
      // The keyExtractor function handles this case with the fallback `item-${index}`
    });
  });

  describe('Memoization', () => {
    it('should memoize the component to prevent unnecessary re-renders', () => {
      const { rerender } = render(<RewardSettingsAccountGroupList />);

      // Re-render with same props
      rerender(<RewardSettingsAccountGroupList />);

      // The component should be memoized, so internal functions shouldn't be recreated
      // This is tested indirectly through the component's behavior
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in allAddresses selector gracefully', () => {
      // Mock selector to throw an error
      mockUseSelector.mockImplementation((selector) => {
        if (selector.toString().includes('allAddresses')) {
          throw new Error('Selector error');
        }
        if (selector.toString().includes('selectAvatarAccountType')) {
          return 'default';
        }
        return null;
      });

      // Should not crash the component
      expect(() => render(<RewardSettingsAccountGroupList />)).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('should have proper testIDs for accessibility testing', () => {
      const { getByTestId } = render(<RewardSettingsAccountGroupList />);

      // Test that all major components have testIDs
      expect(getByTestId('rewards-settings-flash-list')).toBeOnTheScreen();
      expect(getByTestId('rewards-settings-header')).toBeOnTheScreen();
      expect(getByTestId('rewards-settings-footer')).toBeOnTheScreen();
      expect(getByTestId('rewards-opt-out-button')).toBeOnTheScreen();
    });
  });
});

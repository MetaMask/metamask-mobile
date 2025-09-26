import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import RewardSettingsTabs from './RewardSettingsTabs';
import { InternalAccount } from '@metamask/keyring-internal-api';

// Mock React Native FlatList with scroll methods first
jest.mock('react-native', () => {
  const ReactActual = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    FlatList: ReactActual.forwardRef(
      (
        props: {
          data?: unknown[];
          renderItem?: ({ item }: { item: unknown }) => React.ReactElement;
          keyExtractor?: (item: unknown) => string;
          [key: string]: unknown;
        },
        ref: React.Ref<unknown>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          scrollToIndex: jest.fn(),
        }));
        return ReactActual.createElement(RN.FlatList, props);
      },
    ),
  };
});

// Mock hooks
const mockUseRewardOptinSummary = jest.fn();
const mockUseLinkAccount = jest.fn();

jest.mock('../../hooks/useRewardOptinSummary', () => ({
  useRewardOptinSummary: () => mockUseRewardOptinSummary(),
}));

jest.mock('../../hooks/useLinkAccount', () => ({
  useLinkAccount: () => mockUseLinkAccount(),
}));

// Mock selectors
const mockSelectSelectedInternalAccount = jest.fn();
jest.mock('../../../../../selectors/accountsController', () => ({
  selectSelectedInternalAccount: (state: unknown) =>
    mockSelectSelectedInternalAccount(state),
}));

// Mock useTailwind
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: jest.fn(() => ({
    style: jest.fn((styles: unknown) => {
      if (Array.isArray(styles)) {
        return styles.reduce((acc, style) => ({ ...acc, ...style }), {});
      }
      if (typeof styles === 'string') {
        return { testID: `tw-${styles}` };
      }
      return styles || {};
    }),
  })),
}));

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, options?: Record<string, unknown>) => {
    if (options?.count !== undefined) {
      return `mocked_${key}_${options.count}`;
    }
    if (options?.accountName) {
      return `mocked_${key}_${options.accountName}`;
    }
    return `mocked_${key}`;
  },
}));

// Mock design system components
jest.mock('@metamask/design-system-react-native', () => {
  const ReactForDesignSystem = jest.requireActual('react');
  const { Text: RNText, View } = jest.requireActual('react-native');

  return {
    Box: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) =>
      ReactForDesignSystem.createElement(
        View,
        { testID: 'box', ...props },
        children,
      ),
    Text: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) =>
      ReactForDesignSystem.createElement(
        RNText,
        { testID: 'text', ...props },
        children,
      ),
    Icon: ({ name, ...props }: { name: string; [key: string]: unknown }) =>
      ReactForDesignSystem.createElement(View, {
        testID: `icon-${name}`,
        ...props,
      }),
    TextVariant: {
      BodyMd: 'BodyMd',
    },
    FontWeight: {
      Medium: 'Medium',
    },
    BoxFlexDirection: {
      Row: 'row',
    },
    BoxAlignItems: {
      Center: 'center',
    },
    BoxJustifyContent: {
      Between: 'space-between',
    },
    IconName: {
      Loading: 'Loading',
    },
    IconSize: {
      Md: 'md',
    },
  };
});

// Mock TabsList
jest.mock('../../../../../component-library/components-temp/Tabs', () => ({
  TabsList: ({
    children,
    initialActiveIndex,
  }: {
    children: React.ReactNode;
    initialActiveIndex: number;
  }) => {
    const ReactForTabs = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return ReactForTabs.createElement(
      View,
      { testID: `tabs-list-${initialActiveIndex}` },
      children,
    );
  },
}));

// Mock AccountDisplayItem
jest.mock(
  '../AccountDisplayItem/AccountDisplayItem',
  () =>
    ({
      account,
      isCurrentAccount,
    }: {
      account: InternalAccount;
      isCurrentAccount: boolean;
    }) => {
      const ReactForAccount = jest.requireActual('react');
      const { View, Text } = jest.requireActual('react-native');
      return ReactForAccount.createElement(
        View,
        { testID: `account-display-item-${account.address}` },
        ReactForAccount.createElement(
          Text,
          {},
          `${account.metadata.name} ${isCurrentAccount ? '(current)' : ''}`,
        ),
      );
    },
);

// Mock Banner
jest.mock('../../../../../component-library/components/Banners/Banner', () => {
  const ReactForBanner = jest.requireActual('react');
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');

  const Banner = ({
    title,
    description,
    actionButtonProps,
  }: {
    title: string;
    description: string;
    actionButtonProps?: { label: string; onPress: () => void };
  }) =>
    ReactForBanner.createElement(
      View,
      { testID: 'banner' },
      ReactForBanner.createElement(Text, { testID: 'banner-title' }, title),
      ReactForBanner.createElement(
        Text,
        { testID: 'banner-description' },
        description,
      ),
      actionButtonProps &&
        ReactForBanner.createElement(
          TouchableOpacity,
          {
            onPress: actionButtonProps.onPress,
            testID: 'banner-action-button',
          },
          ReactForBanner.createElement(Text, {}, actionButtonProps.label),
        ),
    );

  return {
    __esModule: true,
    default: Banner,
    BannerVariant: {
      Alert: 'Alert',
    },
    BannerAlertSeverity: {
      Error: 'Error',
      Info: 'Info',
    },
  };
});

// Mock Skeleton
jest.mock('../../../../../component-library/components/Skeleton', () => ({
  Skeleton: ({ height, width }: { height: number; width: number }) => {
    const ReactForSkeleton = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return ReactForSkeleton.createElement(View, {
      testID: 'skeleton',
      style: { height, width },
    });
  },
}));

// Mock Button components and enums
jest.mock('../../../../../component-library/components/Buttons/Button', () => ({
  ButtonVariants: {
    Link: 'Link',
    Primary: 'Primary',
    Secondary: 'Secondary',
  },
  ButtonSize: {
    Auto: 'Auto',
    Sm: 'Sm',
    Md: 'Md',
    Lg: 'Lg',
  },
}));

describe('RewardSettingsTabs', () => {
  let store: ReturnType<typeof configureStore>;

  const mockAccount1: InternalAccount = {
    id: 'account-1',
    address: '0x123',
    metadata: {
      name: 'Account 1',
      importTime: Date.now(),
      keyring: { type: 'HD Key Tree' },
    },
    options: {},
    methods: [],
    scopes: ['eip155:1' as `${string}:${string}`],
    type: 'eip155:eoa',
  };

  const mockAccount2: InternalAccount = {
    id: 'account-2',
    address: '0x456',
    metadata: {
      name: 'Account 2',
      importTime: Date.now(),
      keyring: { type: 'HD Key Tree' },
    },
    options: {},
    methods: [],
    scopes: ['eip155:1' as `${string}:${string}`],
    type: 'eip155:eoa',
  };

  const createMockStore = (initialState: Record<string, unknown> = {}) =>
    configureStore({
      reducer: {
        engine: (
          state = {
            backgroundState: {
              AccountsController: {
                internalAccounts: {
                  selectedAccount: 'account-1',
                  accounts: {
                    'account-1': mockAccount1,
                    'account-2': mockAccount2,
                  },
                },
              },
            },
          },
        ) => state,
        ...initialState,
      },
    });

  beforeEach(() => {
    jest.clearAllMocks();
    store = createMockStore();

    // Default mock values
    mockSelectSelectedInternalAccount.mockReturnValue(mockAccount1);
    mockUseRewardOptinSummary.mockReturnValue({
      linkedAccounts: [],
      unlinkedAccounts: [],
      isLoading: false,
      hasError: false,
      refresh: jest.fn(),
    });
    mockUseLinkAccount.mockReturnValue({
      linkAccount: jest.fn(),
      isLoading: false,
    });
  });

  const renderWithProvider = (component: React.ReactElement) =>
    render(<Provider store={store}>{component}</Provider>);

  describe('rendering', () => {
    it('should render without crashing', () => {
      expect(() =>
        renderWithProvider(<RewardSettingsTabs initialTabIndex={0} />),
      ).not.toThrow();
    });

    it('should render tabs with initial tab index', () => {
      const { getByTestId } = renderWithProvider(
        <RewardSettingsTabs initialTabIndex={1} />,
      );
      expect(getByTestId('tabs-list-1')).toBeTruthy();
    });
  });

  describe('loading state', () => {
    it('should render skeleton loading when isLoading is true', () => {
      mockUseRewardOptinSummary.mockReturnValue({
        linkedAccounts: [],
        unlinkedAccounts: [],
        isLoading: true,
        hasError: false,
        refresh: jest.fn(),
      });

      const { getAllByTestId } = renderWithProvider(
        <RewardSettingsTabs initialTabIndex={0} />,
      );

      const skeletons = getAllByTestId('skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('error state', () => {
    it('should render error banner when hasError is true', () => {
      const mockRefresh = jest.fn();
      mockUseRewardOptinSummary.mockReturnValue({
        linkedAccounts: [],
        unlinkedAccounts: [],
        isLoading: false,
        hasError: true,
        refresh: mockRefresh,
      });

      const { getByTestId, getByText } = renderWithProvider(
        <RewardSettingsTabs initialTabIndex={0} />,
      );

      expect(getByTestId('banner')).toBeTruthy();
      expect(getByText('mocked_rewards.settings.error_title')).toBeTruthy();
      expect(
        getByText('mocked_rewards.settings.error_description'),
      ).toBeTruthy();
    });

    it('should call refresh when retry button is pressed', () => {
      const mockRefresh = jest.fn();
      mockUseRewardOptinSummary.mockReturnValue({
        linkedAccounts: [],
        unlinkedAccounts: [],
        isLoading: false,
        hasError: true,
        refresh: mockRefresh,
      });

      const { getByTestId } = renderWithProvider(
        <RewardSettingsTabs initialTabIndex={0} />,
      );

      const retryButton = getByTestId('banner-action-button');
      fireEvent.press(retryButton);
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  describe('linked accounts', () => {
    it('should render linked accounts list', () => {
      mockUseRewardOptinSummary.mockReturnValue({
        linkedAccounts: [mockAccount1, mockAccount2],
        unlinkedAccounts: [],
        isLoading: false,
        hasError: false,
        refresh: jest.fn(),
      });

      const { getByTestId } = renderWithProvider(
        <RewardSettingsTabs initialTabIndex={0} />,
      );

      expect(getByTestId('account-display-item-0x123')).toBeTruthy();
      expect(getByTestId('account-display-item-0x456')).toBeTruthy();
    });

    it('should show no linked accounts message when list is empty', () => {
      mockUseRewardOptinSummary.mockReturnValue({
        linkedAccounts: [],
        unlinkedAccounts: [mockAccount1],
        isLoading: false,
        hasError: false,
        refresh: jest.fn(),
      });

      const { getByText } = renderWithProvider(
        <RewardSettingsTabs initialTabIndex={0} />,
      );

      expect(
        getByText('mocked_rewards.settings.no_linked_accounts'),
      ).toBeTruthy();
    });

    it('should mark current account correctly', () => {
      mockUseRewardOptinSummary.mockReturnValue({
        linkedAccounts: [mockAccount1, mockAccount2],
        unlinkedAccounts: [],
        isLoading: false,
        hasError: false,
        refresh: jest.fn(),
      });

      const { getByText } = renderWithProvider(
        <RewardSettingsTabs initialTabIndex={0} />,
      );

      expect(getByText('Account 1 (current)')).toBeTruthy();
      expect(getByText('Account 2 ')).toBeTruthy();
    });
  });

  describe('unlinked accounts', () => {
    it('should render unlinked accounts list with link buttons', () => {
      mockUseRewardOptinSummary.mockReturnValue({
        linkedAccounts: [],
        unlinkedAccounts: [mockAccount1, mockAccount2],
        isLoading: false,
        hasError: false,
        refresh: jest.fn(),
      });

      const { getByTestId, getAllByText } = renderWithProvider(
        <RewardSettingsTabs initialTabIndex={0} />,
      );

      expect(getByTestId('account-display-item-0x123')).toBeTruthy();
      expect(getByTestId('account-display-item-0x456')).toBeTruthy();

      const linkButtons = getAllByText(
        'mocked_rewards.settings.link_account_button',
      );
      expect(linkButtons.length).toBe(2);
    });

    it('should show all accounts linked banner when unlinked list is empty', () => {
      mockUseRewardOptinSummary.mockReturnValue({
        linkedAccounts: [mockAccount1],
        unlinkedAccounts: [],
        isLoading: false,
        hasError: false,
        refresh: jest.fn(),
      });

      const { getByText } = renderWithProvider(
        <RewardSettingsTabs initialTabIndex={0} />,
      );

      expect(
        getByText('mocked_rewards.settings.all_accounts_linked_title'),
      ).toBeTruthy();
      expect(
        getByText('mocked_rewards.settings.all_accounts_linked_description'),
      ).toBeTruthy();
    });
  });

  describe('account linking', () => {
    it('should call linkAccount when link button is pressed', async () => {
      const mockLinkAccount = jest.fn().mockResolvedValue(true);
      mockUseLinkAccount.mockReturnValue({
        linkAccount: mockLinkAccount,
        isLoading: false,
      });
      mockUseRewardOptinSummary.mockReturnValue({
        linkedAccounts: [],
        unlinkedAccounts: [mockAccount1],
        isLoading: false,
        hasError: false,
        refresh: jest.fn(),
      });

      const { getByText } = renderWithProvider(
        <RewardSettingsTabs initialTabIndex={0} />,
      );

      const linkButton = getByText(
        'mocked_rewards.settings.link_account_button',
      );
      fireEvent.press(linkButton);

      expect(mockLinkAccount).toHaveBeenCalledWith(mockAccount1);
    });

    it('should show linking overlay when account is being linked', async () => {
      const mockLinkAccount = jest.fn(
        () => new Promise((resolve) => setTimeout(() => resolve(true), 100)),
      );
      mockUseLinkAccount.mockReturnValue({
        linkAccount: mockLinkAccount,
        isLoading: false,
      });
      mockUseRewardOptinSummary.mockReturnValue({
        linkedAccounts: [],
        unlinkedAccounts: [mockAccount1],
        isLoading: false,
        hasError: false,
        refresh: jest.fn(),
      });

      const { getByText, getByTestId } = renderWithProvider(
        <RewardSettingsTabs initialTabIndex={0} />,
      );

      const linkButton = getByText(
        'mocked_rewards.settings.link_account_button',
      );
      fireEvent.press(linkButton);

      await waitFor(() => {
        expect(getByTestId('icon-Loading')).toBeTruthy();
        expect(
          getByText('mocked_rewards.linking_account_Account 1'),
        ).toBeTruthy();
      });
    });

    it('should prevent double-press on link button', async () => {
      const mockLinkAccount = jest.fn().mockResolvedValue(true);
      mockUseLinkAccount.mockReturnValue({
        linkAccount: mockLinkAccount,
        isLoading: true, // Simulate already linking
      });
      mockUseRewardOptinSummary.mockReturnValue({
        linkedAccounts: [],
        unlinkedAccounts: [mockAccount1],
        isLoading: false,
        hasError: false,
        refresh: jest.fn(),
      });

      const { getByText } = renderWithProvider(
        <RewardSettingsTabs initialTabIndex={0} />,
      );

      const linkButton = getByText(
        'mocked_rewards.settings.link_account_button',
      );
      fireEvent.press(linkButton);
      fireEvent.press(linkButton); // Second press should be ignored

      expect(mockLinkAccount).not.toHaveBeenCalled();
    });
  });

  describe('local state management', () => {
    it('should move locally linked accounts from unlinked to linked list', async () => {
      const mockLinkAccount = jest.fn().mockResolvedValue(true);
      mockUseLinkAccount.mockReturnValue({
        linkAccount: mockLinkAccount,
        isLoading: false,
      });
      mockUseRewardOptinSummary.mockReturnValue({
        linkedAccounts: [],
        unlinkedAccounts: [mockAccount1, mockAccount2],
        isLoading: false,
        hasError: false,
        refresh: jest.fn(),
      });

      const { getAllByText } = renderWithProvider(
        <RewardSettingsTabs initialTabIndex={0} />,
      );

      // Initially should have 2 link buttons
      expect(
        getAllByText('mocked_rewards.settings.link_account_button').length,
      ).toBe(2);

      // Link an account
      const linkButtons = getAllByText(
        'mocked_rewards.settings.link_account_button',
      );
      fireEvent.press(linkButtons[0]);

      await waitFor(() => {
        expect(mockLinkAccount).toHaveBeenCalledWith(mockAccount1);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty account lists gracefully', () => {
      mockUseRewardOptinSummary.mockReturnValue({
        linkedAccounts: [],
        unlinkedAccounts: [],
        isLoading: false,
        hasError: false,
        refresh: jest.fn(),
      });

      expect(() =>
        renderWithProvider(<RewardSettingsTabs initialTabIndex={0} />),
      ).not.toThrow();
    });

    it('should handle missing selected account', () => {
      mockSelectSelectedInternalAccount.mockReturnValue(null);
      mockUseRewardOptinSummary.mockReturnValue({
        linkedAccounts: [mockAccount1],
        unlinkedAccounts: [],
        isLoading: false,
        hasError: false,
        refresh: jest.fn(),
      });

      expect(() =>
        renderWithProvider(<RewardSettingsTabs initialTabIndex={0} />),
      ).not.toThrow();
    });

    it('should handle failed account linking', async () => {
      const mockLinkAccount = jest.fn().mockResolvedValue(false);
      mockUseLinkAccount.mockReturnValue({
        linkAccount: mockLinkAccount,
        isLoading: false,
      });
      mockUseRewardOptinSummary.mockReturnValue({
        linkedAccounts: [],
        unlinkedAccounts: [mockAccount1],
        isLoading: false,
        hasError: false,
        refresh: jest.fn(),
      });

      const { getByText } = renderWithProvider(
        <RewardSettingsTabs initialTabIndex={0} />,
      );

      const linkButton = getByText(
        'mocked_rewards.settings.link_account_button',
      );
      fireEvent.press(linkButton);

      await waitFor(() => {
        expect(mockLinkAccount).toHaveBeenCalledWith(mockAccount1);
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper testIDs for key elements', () => {
      mockUseRewardOptinSummary.mockReturnValue({
        linkedAccounts: [mockAccount1],
        unlinkedAccounts: [mockAccount2],
        isLoading: false,
        hasError: false,
        refresh: jest.fn(),
      });

      const { getByTestId } = renderWithProvider(
        <RewardSettingsTabs initialTabIndex={0} />,
      );

      expect(getByTestId('tabs-list-0')).toBeTruthy();
      expect(getByTestId('account-display-item-0x123')).toBeTruthy();
      expect(getByTestId('account-display-item-0x456')).toBeTruthy();
    });
  });
});

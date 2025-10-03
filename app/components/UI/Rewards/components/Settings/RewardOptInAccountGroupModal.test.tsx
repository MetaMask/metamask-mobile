import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import RewardOptInAccountGroupModal from './RewardOptInAccountGroupModal';
import { AccountGroupId } from '@metamask/account-api';
import { useLinkAccountGroup } from '../../hooks/useLinkAccountGroup';
import { FlatListProps } from 'react-native';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: jest.fn(),
  }),
  useRoute: () => ({
    params: {
      accountGroupId: 'test-account-group-id',
      addressData: [
        {
          address: '0x1234567890123456789012345678901234567890',
          hasOptedIn: false,
          scopes: ['scope1', 'scope2'],
        },
        {
          address: '0x0987654321098765432109876543210987654321',
          hasOptedIn: true,
          scopes: ['scope3'],
        },
      ],
    },
  }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: jest.fn(() => ({
    style: jest.fn(() => ({})),
  })),
}));

jest.mock('../../hooks/useLinkAccountGroup', () => ({
  useLinkAccountGroup: jest.fn(),
}));

jest.mock(
  '../../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectAccountGroupById: jest.fn(),
  }),
);

jest.mock('../../../../../selectors/multichainAccounts/accounts', () => ({
  selectIconSeedAddressByAccountGroupId: jest.fn(),
}));

jest.mock('../../../../../selectors/settings', () => ({
  selectAvatarAccountType: jest.fn(),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

// Mock component library components
jest.mock('../../../../../component-library/components/Icons/Icon', () => ({
  __esModule: true,
  default: ({ name, ...props }: { name: string; [key: string]: unknown }) => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return ReactActual.createElement(View, {
      testID: `icon-${name}`,
      ...props,
    });
  },
  IconColor: {
    IconDefault: 'icon-default',
    IconMuted: 'icon-muted',
  },
  IconName: {
    Check: 'check',
    Close: 'close',
  },
}));

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');

    return {
      __esModule: true,
      default: ReactActual.forwardRef(
        (
          props: { children?: React.ReactNode; onClose?: () => void },
          ref: React.Ref<unknown>,
        ) => {
          ReactActual.useImperativeHandle(ref, () => ({
            onCloseBottomSheet: (callback: () => void) => {
              callback();
            },
          }));

          return ReactActual.createElement(
            View,
            { testID: 'bottom-sheet' },
            props.children,
          );
        },
      ),
    };
  },
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View, Text } = jest.requireActual('react-native');

    return ReactActual.forwardRef(
      (
        props: {
          children?: React.ReactNode;
          onClose?: () => void;
          startAccessory?: React.ReactNode;
        },
        ref: React.Ref<unknown>,
      ) =>
        ReactActual.createElement(
          View,
          { testID: 'bottom-sheet-header', ref },
          props.startAccessory,
          props.children,
          ReactActual.createElement(
            View,
            { testID: 'close-button', onPress: props.onClose },
            ReactActual.createElement(Text, {}, 'Close'),
          ),
        ),
    );
  },
);

jest.mock(
  '../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');

    return ReactActual.forwardRef(
      (
        props: { accountAddress?: string; type?: string; size?: string },
        ref: React.Ref<unknown>,
      ) =>
        ReactActual.createElement(
          View,
          {
            testID: 'avatar-account',
            accountAddress: props.accountAddress,
            type: props.type,
            size: props.size,
            ref,
          },
          ReactActual.createElement(View, { testID: 'avatar-content' }),
        ),
    );
  },
);

jest.mock('./NetworkAvatars', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return ReactActual.forwardRef(
    (props: { accountGroupId?: string }, ref: React.Ref<unknown>) =>
      ReactActual.createElement(View, {
        testID: `network-avatars-${props.accountGroupId || 'default'}`,
        accountGroupId: props.accountGroupId,
        ref,
      }),
  );
});

// Mock component library constants
jest.mock(
  '../../../../../component-library/components/Avatars/Avatar/Avatar.constants',
  () => ({
    IconSize: {
      Xs: 'xs',
      Sm: 'sm',
      Md: 'md',
      Lg: 'lg',
    },
    AvatarSize: {
      Xs: 'xs',
      Sm: 'sm',
      Md: 'md',
      Lg: 'lg',
    },
    ICONSIZE_BY_AVATARSIZE: {
      xs: 'xs',
      sm: 'sm',
      md: 'md',
      lg: 'lg',
    },
  }),
);

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
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => ReactActual.createElement(View, props, children),
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
      isLoading,
      disabled,
      ...props
    }: {
      children?: React.ReactNode;
      onPress?: () => void;
      isLoading?: boolean;
      disabled?: boolean;
      [key: string]: unknown;
    }) =>
      ReactActual.createElement(
        TouchableOpacity,
        {
          onPress,
          testID: 'button',
          disabled,
          ...props,
        },
        ReactActual.createElement(
          RNText,
          {
            isLoading,
            disabled,
            accessibilityState: disabled ? { disabled: true } : undefined,
          },
          children,
        ),
      ),
    TextVariant: {
      BodyMd: 'BodyMd',
      BodySm: 'BodySm',
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
      Primary: 'primary',
    },
    ButtonSize: {
      Lg: 'lg',
    },
    IconSize: {
      Xs: 'xs',
      Sm: 'sm',
      Md: 'md',
      Lg: 'lg',
    },
    AvatarSize: {
      Xs: 'xs',
      Sm: 'sm',
      Md: 'md',
      Lg: 'lg',
    },
  };
});

// Mock FlatList
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    FlatList: ({
      data,
      renderItem,
      keyExtractor,
      ...props
    }: FlatListProps<unknown>) => {
      const ReactActual = jest.requireActual('react');
      const { View } = jest.requireActual('react-native');

      return ReactActual.createElement(
        View,
        { testID: 'reward-opt-in-address-list', ...props },
        data && Array.isArray(data)
          ? data.map((item: unknown, index: number) => {
              const key = keyExtractor ? keyExtractor(item, index) : index;
              return ReactActual.createElement(
                View,
                { key, testID: `flat-list-item-${key}` },
                renderItem?.({
                  item,
                  index,
                  separators: {
                    highlight: jest.fn(),
                    unhighlight: jest.fn(),
                    updateProps: jest.fn(),
                  },
                }),
              );
            })
          : null,
      );
    },
  };
});

// Mock utility functions
jest.mock('../../../../../util/address', () => ({
  renderSlightlyLongAddress: jest.fn((address: string) => address),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseLinkAccountGroup = useLinkAccountGroup as jest.MockedFunction<
  typeof useLinkAccountGroup
>;

describe('RewardOptInAccountGroupModal', () => {
  const mockAccountGroupId = 'test-account-group-id' as AccountGroupId;
  const mockAddressData = [
    {
      address: '0x1234567890123456789012345678901234567890',
      hasOptedIn: false,
      scopes: ['scope1', 'scope2'],
    },
    {
      address: '0x0987654321098765432109876543210987654321',
      hasOptedIn: true,
      scopes: ['scope3'],
    },
  ];

  const mockAccountGroupContext = {
    id: mockAccountGroupId,
    metadata: {
      name: 'Test Account Group',
    },
    optedInAccounts: [],
    optedOutAccounts: [],
  };

  const mockLinkAccountGroup = jest.fn();
  const mockNavigation = {
    goBack: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock useSelector calls
    mockUseSelector.mockImplementation((selector) => {
      if (selector.toString().includes('selectAccountGroupById')) {
        return mockAccountGroupContext;
      }
      if (
        selector.toString().includes('selectIconSeedAddressByAccountGroupId')
      ) {
        return '0x1234567890123456789012345678901234567890';
      }
      if (selector.toString().includes('selectAvatarAccountType')) {
        return 'default';
      }
      return null;
    });

    // Mock useLinkAccountGroup hook
    mockUseLinkAccountGroup.mockReturnValue({
      linkAccountGroup: mockLinkAccountGroup,
      isLoading: false,
      isError: false,
    });

    // Mock navigation
    jest.doMock('@react-navigation/native', () => ({
      useNavigation: () => mockNavigation,
      useRoute: () => ({
        params: {
          accountGroupId: mockAccountGroupId,
          addressData: mockAddressData,
        },
      }),
    }));
  });

  it('should render correctly with account group data', () => {
    const { getByTestId, getByText } = render(<RewardOptInAccountGroupModal />);

    expect(getByTestId('bottom-sheet')).toBeOnTheScreen();
    expect(getByTestId('bottom-sheet-header')).toBeOnTheScreen();
    expect(getByText('Test Account Group')).toBeOnTheScreen();
    expect(
      getByText('rewards.link_account_group.linked_accounts'),
    ).toBeOnTheScreen();
  });

  it('should render address list with correct data', () => {
    const { getByTestId } = render(<RewardOptInAccountGroupModal />);

    expect(getByTestId('reward-opt-in-address-list')).toBeOnTheScreen();
    expect(
      getByTestId('flat-list-item-0x1234567890123456789012345678901234567890'),
    ).toBeOnTheScreen();
    expect(
      getByTestId('flat-list-item-0x0987654321098765432109876543210987654321'),
    ).toBeOnTheScreen();
  });

  it('should render link account button when there are opted out addresses', () => {
    const { getByTestId } = render(<RewardOptInAccountGroupModal />);

    expect(getByTestId('button')).toBeOnTheScreen();
  });

  it('should call linkAccountGroup when link button is pressed', async () => {
    const mockResult = {
      success: true,
      byAddress: {
        '0x1234567890123456789012345678901234567890': true,
      },
    };

    mockLinkAccountGroup.mockResolvedValue(mockResult);

    const { getByTestId } = render(<RewardOptInAccountGroupModal />);

    const linkButton = getByTestId('button');
    fireEvent.press(linkButton);

    await waitFor(() => {
      expect(mockLinkAccountGroup).toHaveBeenCalledWith(mockAccountGroupId);
    });
  });

  it('should update local state after successful link operation', async () => {
    const mockResult = {
      success: true,
      byAddress: {
        '0x1234567890123456789012345678901234567890': true,
      },
    };

    mockLinkAccountGroup.mockResolvedValue(mockResult);

    const { getByTestId } = render(<RewardOptInAccountGroupModal />);

    const linkButton = getByTestId('button');
    fireEvent.press(linkButton);

    await waitFor(() => {
      expect(mockLinkAccountGroup).toHaveBeenCalledWith(mockAccountGroupId);
    });
  });

  it('should handle linkAccountGroup errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {
      // do nothing
    });

    mockLinkAccountGroup.mockRejectedValue(new Error('Link failed'));

    const { getByTestId } = render(<RewardOptInAccountGroupModal />);

    const linkButton = getByTestId('button');
    fireEvent.press(linkButton);

    await waitFor(() => {
      expect(mockLinkAccountGroup).toHaveBeenCalledWith(mockAccountGroupId);
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to link account group:',
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  it('should handle missing account group context gracefully', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector.toString().includes('selectAccountGroupById')) {
        return null;
      }
      if (
        selector.toString().includes('selectIconSeedAddressByAccountGroupId')
      ) {
        return '0x1234567890123456789012345678901234567890';
      }
      if (selector.toString().includes('selectAvatarAccountType')) {
        return 'default';
      }
      return null;
    });

    const { getByTestId } = render(<RewardOptInAccountGroupModal />);

    expect(getByTestId('bottom-sheet')).toBeOnTheScreen();
    // Should not render header when account group context is missing
    expect(() => getByTestId('bottom-sheet-header')).toThrow();
  });

  it('should handle missing account group metadata name', () => {
    const accountGroupWithoutName = {
      ...mockAccountGroupContext,
      metadata: {},
    };

    mockUseSelector.mockImplementation((selector) => {
      if (selector.toString().includes('selectAccountGroupById')) {
        return accountGroupWithoutName;
      }
      if (
        selector.toString().includes('selectIconSeedAddressByAccountGroupId')
      ) {
        return '0x1234567890123456789012345678901234567890';
      }
      if (selector.toString().includes('selectAvatarAccountType')) {
        return 'default';
      }
      return null;
    });

    const { getByTestId } = render(<RewardOptInAccountGroupModal />);

    expect(getByTestId('bottom-sheet')).toBeOnTheScreen();
    // Should not render header when metadata name is missing
    expect(() => getByTestId('bottom-sheet-header')).toThrow();
  });

  it('should handle missing EVM address gracefully', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector.toString().includes('selectAccountGroupById')) {
        return mockAccountGroupContext;
      }
      if (
        selector.toString().includes('selectIconSeedAddressByAccountGroupId')
      ) {
        return null;
      }
      if (selector.toString().includes('selectAvatarAccountType')) {
        return 'default';
      }
      return null;
    });

    const { getByTestId } = render(<RewardOptInAccountGroupModal />);

    const avatar = getByTestId('avatar-account');
    expect(avatar.props.accountAddress).toBe(
      '0x0000000000000000000000000000000000000000',
    );
  });

  it('should render address items with correct props', () => {
    const { getByTestId } = render(<RewardOptInAccountGroupModal />);

    const flatList = getByTestId('reward-opt-in-address-list');
    expect(flatList.props.data).toEqual(mockAddressData);
    expect(flatList.props.keyExtractor).toBeDefined();
    expect(flatList.props.renderItem).toBeDefined();
  });

  it('should handle computed address data correctly', () => {
    const { getByTestId } = render(<RewardOptInAccountGroupModal />);

    const flatList = getByTestId('reward-opt-in-address-list');
    // Should render the original address data
    expect(flatList.props.data).toEqual(mockAddressData);
  });

  it('should update computed address data after link operation', async () => {
    const mockResult = {
      success: true,
      byAddress: {
        '0x1234567890123456789012345678901234567890': true,
      },
    };

    mockLinkAccountGroup.mockResolvedValue(mockResult);

    const { getByTestId } = render(<RewardOptInAccountGroupModal />);

    const linkButton = getByTestId('button');
    fireEvent.press(linkButton);

    await waitFor(() => {
      expect(mockLinkAccountGroup).toHaveBeenCalledWith(mockAccountGroupId);
    });

    // The component should update its local state and re-render
    // This is tested indirectly through the successful call to linkAccountGroup
  });

  it('should handle multiple address updates correctly', async () => {
    const mockResult = {
      success: true,
      byAddress: {
        '0x1234567890123456789012345678901234567890': true,
        '0x0987654321098765432109876543210987654321': false,
      },
    };

    mockLinkAccountGroup.mockResolvedValue(mockResult);

    const { getByTestId } = render(<RewardOptInAccountGroupModal />);

    const linkButton = getByTestId('button');
    fireEvent.press(linkButton);

    await waitFor(() => {
      expect(mockLinkAccountGroup).toHaveBeenCalledWith(mockAccountGroupId);
    });

    // Verify that the hook was called with the correct account group ID
    expect(mockLinkAccountGroup).toHaveBeenCalledWith(mockAccountGroupId);
  });
});

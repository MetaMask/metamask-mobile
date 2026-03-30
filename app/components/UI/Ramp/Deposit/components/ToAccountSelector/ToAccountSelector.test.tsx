import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { mockTheme } from '../../../../../../util/theme';
import ToAccountSelector, { TO_ACCOUNT_SELECTOR_TEST_IDS } from './ToAccountSelector';

const MOCK_ADDRESS_1 = '0x1234567890123456789012345678901234567890';
const MOCK_ADDRESS_2 = '0xABCDEF1234567890ABCDEF1234567890ABCDEF12';
const MOCK_ACCOUNT_ID_1 = 'account-id-1';
const MOCK_ACCOUNT_ID_2 = 'account-id-2';
const MOCK_ACCOUNT_NAME = 'My Account';
const MOCK_GROUP_ID = 'group-1';
const MOCK_WALLET_ID = 'wallet-1';

const mockInternalAccountsById: Record<
  string,
  { address: string; scopes: string[] }
> = {
  [MOCK_ACCOUNT_ID_1]: {
    address: MOCK_ADDRESS_1,
    scopes: ['eip155:1', 'eip155:eoa'],
  },
  [MOCK_ACCOUNT_ID_2]: {
    address: MOCK_ADDRESS_2,
    scopes: ['eip155:1', 'eip155:eoa'],
  },
};

const mockAccountGroup = {
  id: MOCK_GROUP_ID,
  accounts: [MOCK_ACCOUNT_ID_1],
  metadata: { name: MOCK_ACCOUNT_NAME },
};

const mockAccountGroup2 = {
  id: 'group-2',
  accounts: [MOCK_ACCOUNT_ID_2],
  metadata: { name: 'Account 2' },
};

const mockAccountToGroupMap: Record<string, typeof mockAccountGroup> = {
  [MOCK_ACCOUNT_ID_1]: mockAccountGroup,
  [MOCK_ACCOUNT_ID_2]: mockAccountGroup2,
};

const mockWallet = {
  id: MOCK_WALLET_ID,
  metadata: { name: 'HD Wallet' },
  groups: {
    [MOCK_GROUP_ID]: mockAccountGroup,
    'group-2': mockAccountGroup2,
  },
};

const mockAccountGroupsByWallet = [
  {
    title: 'HD Wallet',
    wallet: mockWallet,
    data: [mockAccountGroup, mockAccountGroup2],
  },
];

const mockSelectInternalAccountsById = jest.fn(() => mockInternalAccountsById);
const mockSelectAccountToGroupMap = jest.fn(() => mockAccountToGroupMap);
const mockSelectAccountGroupsByWallet = jest.fn(
  () => mockAccountGroupsByWallet,
);
const mockSelectAvatarAccountType = jest.fn(() => 'Maskicon');

jest.mock('../../../../../../selectors/accountsController', () => ({
  selectInternalAccountsById: () => mockSelectInternalAccountsById(),
}));

jest.mock(
  '../../../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectAccountToGroupMap: () => mockSelectAccountToGroupMap(),
    selectAccountGroupsByWallet: () => mockSelectAccountGroupsByWallet(),
  }),
);

jest.mock('../../../../../../selectors/settings', () => ({
  selectAvatarAccountType: () => mockSelectAvatarAccountType(),
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: () => unknown) => selector(),
}));

jest.mock('../../../../../../component-library/hooks', () => ({
  useStyles: (
    styleFn: (params: {
      theme: typeof mockTheme;
    }) => Record<string, Record<string, unknown>>,
  ) => ({
    styles: styleFn({ theme: mockTheme }),
    theme: mockTheme,
  }),
}));

jest.mock('@metamask/bridge-controller', () => ({
  formatChainIdToCaip: jest.fn((chainId: string) => {
    if (chainId === '0x1') return 'eip155:1';
    if (chainId === '0x89') return 'eip155:137';
    return `eip155:${parseInt(chainId, 16)}`;
  }),
}));

jest.mock(
  '../../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const { View } = jest.requireActual('react-native');
    return ({
      children,
      testID,
    }: {
      children: React.ReactNode;
      testID?: string;
      onClose?: () => void;
    }) => <View testID={testID}>{children}</View>;
  },
);

jest.mock(
  '../../../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const { Text } = jest.requireActual('react-native');
    return ({
      children,
    }: {
      children: React.ReactNode;
      onClose?: () => void;
    }) => <Text>{children}</Text>;
  },
);

jest.mock(
  '../../../../../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList/MultichainAccountSelectorList',
  () => {
    const { View, TouchableOpacity, Text } = jest.requireActual('react-native');
    return ({
      onSelectAccount,
      accountSections,
    }: {
      onSelectAccount?: (accountGroup: {
        id: string;
        accounts: string[];
        metadata: { name: string };
      }) => void;
      accountSections?: {
        data: {
          id: string;
          accounts: string[];
          metadata: { name: string };
        }[];
      }[];
      selectedAccountGroups?: unknown[];
      chainId?: string;
      hideAccountCellMenu?: boolean;
      showFooter?: boolean;
    }) => (
      <View testID="account-selector-list">
        {accountSections?.map((section) =>
          section.data.map((group) => (
            <TouchableOpacity
              key={group.id}
              testID={`account-group-${group.id}`}
              onPress={() => onSelectAccount?.(group)}
            >
              <Text>{group.metadata.name}</Text>
            </TouchableOpacity>
          )),
        )}
      </View>
    );
  },
);

jest.mock(
  '../../../../../../component-library/components/Avatars/Avatar',
  () => {
    const { View } = jest.requireActual('react-native');
    const Avatar = ({ testID }: { testID?: string }) => (
      <View testID={testID ?? 'avatar'} />
    );
    return {
      __esModule: true,
      default: Avatar,
      AvatarVariant: { Account: 'Account' },
      AvatarSize: { Sm: 'Sm' },
    };
  },
);

jest.mock('../../../../../../component-library/components/Texts/Text', () => {
  const { Text: RNText } = jest.requireActual('react-native');
  const Text = ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    style?: unknown;
    variant?: string;
    numberOfLines?: number;
    ellipsizeMode?: string;
  }) => <RNText {...props}>{children}</RNText>;
  return {
    __esModule: true,
    default: Text,
    TextVariant: { BodyMD: 'BodyMD' },
  };
});

jest.mock('../../../../../../component-library/components/Icons/Icon', () => {
  const { View } = jest.requireActual('react-native');
  const Icon = () => <View testID="icon" />;
  return {
    __esModule: true,
    default: Icon,
    IconName: { ArrowDown: 'ArrowDown' },
    IconSize: { Sm: 'Sm' },
  };
});

describe('ToAccountSelector', () => {
  const mockOnAccountSelected = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectInternalAccountsById.mockReturnValue(mockInternalAccountsById);
    mockSelectAccountToGroupMap.mockReturnValue(mockAccountToGroupMap);
    mockSelectAccountGroupsByWallet.mockReturnValue(mockAccountGroupsByWallet);
    mockSelectAvatarAccountType.mockReturnValue('Maskicon');
  });

  it('renders placeholder text when no account is selected', () => {
    const { getByText, getByTestId } = render(
      <ToAccountSelector onAccountSelected={mockOnAccountSelected} />,
    );

    expect(getByTestId(TO_ACCOUNT_SELECTOR_TEST_IDS.PILL)).toBeOnTheScreen();
    expect(getByText('Select recipient')).toBeOnTheScreen();
  });

  it('renders avatar and account name when selectedAddress is provided', () => {
    const { getByText, getByTestId, queryByText } = render(
      <ToAccountSelector
        selectedAddress={MOCK_ADDRESS_1}
        onAccountSelected={mockOnAccountSelected}
      />,
    );

    expect(getByTestId(TO_ACCOUNT_SELECTOR_TEST_IDS.PILL)).toBeOnTheScreen();
    expect(getByText(MOCK_ACCOUNT_NAME)).toBeOnTheScreen();
    expect(queryByText('Select recipient')).not.toBeOnTheScreen();
  });

  it('opens bottom sheet when pill is pressed', () => {
    const { getByTestId, queryByTestId } = render(
      <ToAccountSelector
        chainId="0x1"
        onAccountSelected={mockOnAccountSelected}
      />,
    );

    expect(
      queryByTestId(TO_ACCOUNT_SELECTOR_TEST_IDS.BOTTOM_SHEET),
    ).not.toBeOnTheScreen();

    fireEvent.press(getByTestId(TO_ACCOUNT_SELECTOR_TEST_IDS.PILL));

    expect(
      getByTestId(TO_ACCOUNT_SELECTOR_TEST_IDS.BOTTOM_SHEET),
    ).toBeOnTheScreen();
  });

  it('calls onAccountSelected with correct address when account is selected', () => {
    const { getByTestId } = render(
      <ToAccountSelector
        chainId="0x1"
        onAccountSelected={mockOnAccountSelected}
      />,
    );

    fireEvent.press(getByTestId(TO_ACCOUNT_SELECTOR_TEST_IDS.PILL));
    fireEvent.press(getByTestId(`account-group-${MOCK_GROUP_ID}`));

    expect(mockOnAccountSelected).toHaveBeenCalledWith(MOCK_ADDRESS_1);
  });

  it('filters account sections based on chainId compatibility', () => {
    const incompatibleAccountsById = {
      ...mockInternalAccountsById,
      [MOCK_ACCOUNT_ID_2]: {
        address: MOCK_ADDRESS_2,
        scopes: ['solana:mainnet'],
      },
    };

    mockSelectInternalAccountsById.mockReturnValue(incompatibleAccountsById);

    const { getByTestId, queryByTestId } = render(
      <ToAccountSelector
        chainId="0x1"
        onAccountSelected={mockOnAccountSelected}
      />,
    );

    fireEvent.press(getByTestId(TO_ACCOUNT_SELECTOR_TEST_IDS.PILL));

    expect(getByTestId(`account-group-${MOCK_GROUP_ID}`)).toBeOnTheScreen();
    expect(queryByTestId('account-group-group-2')).not.toBeOnTheScreen();
  });

  it('closes bottom sheet after selecting an account', () => {
    const { getByTestId, queryByTestId } = render(
      <ToAccountSelector
        chainId="0x1"
        onAccountSelected={mockOnAccountSelected}
      />,
    );

    fireEvent.press(getByTestId(TO_ACCOUNT_SELECTOR_TEST_IDS.PILL));
    expect(
      getByTestId(TO_ACCOUNT_SELECTOR_TEST_IDS.BOTTOM_SHEET),
    ).toBeOnTheScreen();

    fireEvent.press(getByTestId(`account-group-${MOCK_GROUP_ID}`));

    expect(
      queryByTestId(TO_ACCOUNT_SELECTOR_TEST_IDS.BOTTOM_SHEET),
    ).not.toBeOnTheScreen();
  });

  it('renders placeholder when selectedAddress has no matching account group', () => {
    const { getByText } = render(
      <ToAccountSelector
        selectedAddress="0xunknownaddress"
        onAccountSelected={mockOnAccountSelected}
      />,
    );

    expect(getByText('Select recipient')).toBeOnTheScreen();
  });
});

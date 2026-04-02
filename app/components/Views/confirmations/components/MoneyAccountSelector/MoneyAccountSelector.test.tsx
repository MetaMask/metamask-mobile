import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { mockTheme } from '../../../../../util/theme';
import MoneyAccountSelector, {
  MONEY_ACCOUNT_SELECTOR_TEST_IDS,
} from './MoneyAccountSelector';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: (
    styleFn: (params: {
      theme: typeof mockTheme;
    }) => Record<string, Record<string, unknown>>,
  ) => ({
    styles: styleFn({ theme: mockTheme }),
    theme: mockTheme,
  }),
}));

jest.mock('../../../../../component-library/components/Texts/Text', () => {
  const { Text: RNText } = jest.requireActual('react-native');
  const MockText = ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    style?: unknown;
    variant?: string;
    testID?: string;
  }) => <RNText {...props}>{children}</RNText>;
  return {
    __esModule: true,
    default: MockText,
    TextVariant: { BodyMD: 'BodyMD', HeadingMD: 'HeadingMD' },
  };
});

jest.mock('../../../../../component-library/components/Avatars/Avatar', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: { accountAddress?: string }) => (
      <View testID={`avatar-${props.accountAddress}`} />
    ),
    AvatarVariant: { Account: 'Account' },
    AvatarSize: { Sm: 'Sm' },
  };
});

jest.mock('../../../../../component-library/components/Icons/Icon', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ name }: { name: string }) => <View testID={`icon-${name}`} />,
    IconName: { ArrowDown: 'ArrowDown', Close: 'Close' },
    IconSize: { Sm: 'Sm', Md: 'Md' },
  };
});

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  const { View } = RN;
  return {
    ...RN,
    Modal: ({
      children,
      visible,
      testID,
    }: {
      children: React.ReactNode;
      visible?: boolean;
      testID?: string;
      animationType?: string;
      presentationStyle?: string;
      onRequestClose?: () => void;
    }) => {
      if (!visible) return null;
      return <View testID={testID}>{children}</View>;
    },
    SafeAreaView: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
  };
});

const mockInternalAccountsById = {
  'account-1': {
    address: '0xAccount1Address',
    scopes: ['eip155:0'],
    metadata: { name: 'Account 1' },
  },
  'account-2': {
    address: '0xAccount2Address',
    scopes: ['eip155:0'],
    metadata: { name: 'Account 2' },
  },
};

const mockAccountGroupsByWallet = [
  {
    title: 'Wallet 1',
    wallet: { id: 'wallet-1' },
    data: [
      {
        id: 'group-1',
        accounts: ['account-1'],
        metadata: { name: 'Account 1' },
      },
    ],
  },
];

const mockAccountToGroupMap = {
  'account-1': {
    id: 'group-1',
    accounts: ['account-1'],
    metadata: { name: 'Account 1' },
  },
};

jest.mock('../../../../../selectors/accountsController', () => ({
  selectInternalAccountsById: jest.fn(),
}));

jest.mock(
  '../../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectAccountToGroupMap: jest.fn(),
    selectAccountGroupsByWallet: jest.fn(),
  }),
);

jest.mock('../../../../../selectors/settings', () => ({
  selectAvatarAccountType: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector) => {
    const { selectInternalAccountsById } = jest.requireMock(
      '../../../../../selectors/accountsController',
    );
    const { selectAccountGroupsByWallet, selectAccountToGroupMap } =
      jest.requireMock(
        '../../../../../selectors/multichainAccounts/accountTreeController',
      );
    const { selectAvatarAccountType } = jest.requireMock(
      '../../../../../selectors/settings',
    );
    if (selector === selectInternalAccountsById)
      return mockInternalAccountsById;
    if (selector === selectAccountGroupsByWallet)
      return mockAccountGroupsByWallet;
    if (selector === selectAccountToGroupMap) return mockAccountToGroupMap;
    if (selector === selectAvatarAccountType) return 'HD Key Tree';
    return undefined;
  }),
}));

jest.mock(
  '../../../../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList/MultichainAccountSelectorList',
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
        data: { id: string; accounts: string[]; metadata: { name: string } }[];
      }[];
      selectedAccountGroups?: unknown[];
      showFooter?: boolean;

      hideAccountCellMenu?: boolean;
    }) => (
      <View testID="account-selector-list">
        {accountSections?.flatMap((section) =>
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

describe('MoneyAccountSelector', () => {
  const mockOnAccountSelected = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders pill with placeholder when no account selected', () => {
    const { getByTestId, getByText } = render(
      <MoneyAccountSelector onAccountSelected={mockOnAccountSelected} />,
    );

    expect(getByTestId(MONEY_ACCOUNT_SELECTOR_TEST_IDS.PILL)).toBeOnTheScreen();
    expect(getByText('transaction.recipient_address')).toBeOnTheScreen();
  });

  it('renders avatar and account name when selectedAddress is provided', () => {
    const { getByText } = render(
      <MoneyAccountSelector
        selectedAddress="0xAccount1Address"
        onAccountSelected={mockOnAccountSelected}
      />,
    );

    expect(getByText('Account 1')).toBeOnTheScreen();
  });

  it('opens modal when pill is pressed', () => {
    const { getByTestId } = render(
      <MoneyAccountSelector onAccountSelected={mockOnAccountSelected} />,
    );

    fireEvent.press(getByTestId(MONEY_ACCOUNT_SELECTOR_TEST_IDS.PILL));

    expect(
      getByTestId(MONEY_ACCOUNT_SELECTOR_TEST_IDS.MODAL),
    ).toBeOnTheScreen();
  });

  it('calls onAccountSelected with correct address when account is selected', () => {
    const { getByTestId } = render(
      <MoneyAccountSelector onAccountSelected={mockOnAccountSelected} />,
    );

    fireEvent.press(getByTestId(MONEY_ACCOUNT_SELECTOR_TEST_IDS.PILL));
    fireEvent.press(getByTestId('account-group-group-1'));

    expect(mockOnAccountSelected).toHaveBeenCalledWith('0xAccount1Address');
  });

  it('closes modal after selecting an account', () => {
    const { getByTestId, queryByTestId } = render(
      <MoneyAccountSelector onAccountSelected={mockOnAccountSelected} />,
    );

    fireEvent.press(getByTestId(MONEY_ACCOUNT_SELECTOR_TEST_IDS.PILL));
    fireEvent.press(getByTestId('account-group-group-1'));

    expect(queryByTestId(MONEY_ACCOUNT_SELECTOR_TEST_IDS.MODAL)).toBeNull();
  });
});

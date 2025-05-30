import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import ShareAddress from '.';
import {
  createMockInternalAccount,
  internalAccount1,
} from '../../../../../util/test/accountsControllerTestUtils';
import { EthAccountType } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider, {
  renderScreen,
} from '../../../../../util/test/renderWithProvider';
import { ShareAddressIds } from '../../../../../../e2e/selectors/MultichainAccounts/ShareAddress.selectors';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import Routes from '../../../../../constants/navigation/Routes';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { mockNetworkState } from '../../../../../util/test/network';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockRoute = {
  params: {
    account: internalAccount1,
  },
};

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { width: 0, height: 0, x: 0, y: 0 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
    useSafeAreaFrame: jest.fn().mockImplementation(() => frame),
  };
});

const mockUseRoute = jest.fn().mockReturnValue(mockRoute);
jest.mock('@react-navigation/native', () => {
  const { internalAccount1 } = jest.requireActual(
    '../../../../../util/test/accountsControllerTestUtils',
  );
  return {
    ...jest.requireActual('@react-navigation/native'),
    useNavigation: () => ({
      goBack: () => mockGoBack(),
      navigate: () => mockNavigate(),
    }),
    useRoute: () => ({
      params: {
        account: internalAccount1,
      },
    }),
  };
});

jest.mock('../../../../../util/address', () => ({
  ...jest.requireActual('../../../../../util/address'),
  renderAccountName: jest.fn().mockReturnValue('Test Account'),
}));

jest.mock('../../../../../core/Multichain/networks', () => ({
  ...jest.requireActual('../../../../../core/Multichain/networks'),
  getMultichainBlockExplorer: jest.fn().mockReturnValue({
    url: 'https://etherscan.io',
    title: 'Etherscan',
    blockExplorerName: 'Etherscan',
  }),
}));

jest.mock('../../../../../core/ClipboardManager', () => {
  let clipboardContent = '';

  return {
    setString: jest.fn((str) => {
      clipboardContent = str;
    }),
    getString: jest.fn(() => clipboardContent),
  };
});

jest.mock('../../../../../core/Engine', () => {
  const { internalAccount1: mockAccount } = jest.requireActual(
    '../../../../../util/test/accountsControllerTestUtils',
  );

  return {
    context: {
      NetworkController: {
        getNetworkConfigurationsByCaipChainId: jest.fn(),
      },
      AccountsController: {
        internalAccounts: {
          accounts: {
            [mockAccount.id]: mockAccount,
          },
          selectedAccount: mockAccount.id,
        },
      },
    },
  };
});

const render = (account: InternalAccount = internalAccount1) => {
  const initialState = {
    engine: {
      backgroundState: {
        ...backgroundState,
        ...mockNetworkState,
        AccountsController: {
          internalAccounts: {
            accounts: {
              [account.id]: account,
            },
            selectedAccount: account.id,
          },
        },
      },
    },
  };
  // return renderScreen(
  //   () => <ShareAddress />,
  //   {
  //     name: Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.SHARE_ADDRESS,
  //   },
  //   { state: initialState },
  // );
  return renderWithProvider(
    <SafeAreaProvider>
      <ShareAddress />
    </SafeAreaProvider>,
    { state: initialState },
  );
};

describe('ShareAddress', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders correctly with account information', () => {
    const { getByTestId, toJSON } = render();
    expect(toJSON()).toMatchSnapshot();
    expect(strings('multichain_accounts.share_address.title')).toBeTruthy();
    expect(
      getByTestId(ShareAddressIds.SHARE_ADDRESS_VIEW_ON_EXPLORER_BUTTON).props
        .label,
    ).toBe('View on Etherscan');
  });

  it('displays QR code with account address', () => {
    const { getByText } = render();

    expect(getByText(mockRoute.params.account.address)).toBeTruthy();
  });

  it('navigates back when back button is pressed', () => {
    const { getByRole } = render();

    const backButton = getByRole('button');
    fireEvent.press(backButton);

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('opens block explorer when view on explorer button is pressed', () => {
    const { getByText } = render();

    const explorerButton = getByText(
      strings('multichain_accounts.share_address.view_on_explorer_button', {
        explorer: 'etherscasadfsd',
      }),
    );
    fireEvent.press(explorerButton);

    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: 'https://etherscan.io',
        title: 'Etherscan',
      },
    });
  });

  it('handles different account types', () => {
    const snapAccount = createMockInternalAccount(
      '0x9876543210987654321098765432109876543210',
      'Snap Account',
      KeyringTypes.snap,
      EthAccountType.Eoa,
    );

    const mockRouteWithSnapAccount = {
      params: { account: snapAccount },
    };

    mockUseRoute.mockReturnValue(mockRouteWithSnapAccount);

    const { getByDisplayValue } = render();

    expect(getByDisplayValue(snapAccount.address)).toBeTruthy();
  });

  it('renders QRAccountDisplay component', () => {
    const { getByText } = render();

    expect(getByText(mockRoute.params.account.address)).toBeTruthy();
  });

  it('renders with correct QR code size and logo', () => {
    const { getByDisplayValue } = render();

    const qrCode = getByDisplayValue(mockRoute.params.account.address);
    expect(qrCode).toBeTruthy();
  });

  it('handles long addresses correctly', () => {
    const longAddressAccount = createMockInternalAccount(
      '0x1234567890123456789012345678901234567890',
      'Long Address Account',
      KeyringTypes.hd,
      EthAccountType.Eoa,
    );

    const mockRouteWithLongAddress = {
      params: { account: longAddressAccount },
    };

    mockUseRoute.mockReturnValue(mockRouteWithLongAddress);

    const { getByDisplayValue } = render(longAddressAccount);

    expect(getByDisplayValue(longAddressAccount.address)).toBeTruthy();
  });

  it('calls block explorer with correct account address', () => {
    const differentAccount = createMockInternalAccount(
      '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      'Different Account',
      KeyringTypes.simple,
      EthAccountType.Eoa,
    );

    const mockRouteWithDifferentAccount = {
      params: { account: differentAccount },
    };

    mockUseRoute.mockReturnValue(mockRouteWithDifferentAccount);

    const { getByText } = render(differentAccount);

    const explorerButton = getByText(
      strings('multichain_accounts.share_address.view_on_explorer_button', {
        explorer: '',
      }),
    );
    fireEvent.press(explorerButton);

    expect(mockToBlockExplorer).toHaveBeenCalledWith(differentAccount.address);
  });
});

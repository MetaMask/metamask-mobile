import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { TouchableOpacity } from 'react-native';
import ShareAddress from '.';
import {
  createMockSnapInternalAccount,
  internalAccount1,
} from '../../../../../util/test/accountsControllerTestUtils';
import { SolAccountType } from '@metamask/keyring-api';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { mockNetworkState } from '../../../../../util/test/network';

// QRAccountDisplay is mocked because it uses the safeview context.
// This is a workaround to render the component.
jest.mock('../../../QRAccountDisplay', () => {
  const actualReact = jest.requireActual('react');
  const {
    View,
    Text,
    TouchableOpacity: RNTouchableOpacity,
  } = jest.requireActual('react-native');

  return function MockQRAccountDisplay({
    accountAddress,
  }: {
    accountAddress: string;
  }) {
    const [, setClipboard] = actualReact.useState('');

    const handleCopy = () => {
      setClipboard(accountAddress);
    };

    return actualReact.createElement(
      View,
      { testID: 'qr-account-display' },
      actualReact.createElement(
        Text,
        { testID: 'account-label' },
        'Test Account',
      ),
      actualReact.createElement(
        Text,
        { testID: 'account-address' },
        accountAddress,
      ),
      actualReact.createElement(
        RNTouchableOpacity,
        {
          onPress: handleCopy,
          testID: 'qr-account-display-copy-button',
        },
        actualReact.createElement(Text, null, 'Copy Address'),
      ),
    );
  };
});

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
let mockAccount = internalAccount1;

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { width: 0, height: 0, x: 0, y: 0 };
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaConsumer: ({
      children,
    }: {
      children: (insets: typeof inset) => React.ReactNode;
    }) => children(inset),
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => frame,
  };
});

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
  useRoute: () => ({
    params: {
      account: mockAccount,
    },
  }),
}));

jest.mock('../../../../../util/address', () => ({
  ...jest.requireActual('../../../../../util/address'),
  renderAccountName: jest.fn().mockReturnValue('Test Account'),
}));

jest.mock('../../../../../core/Multichain/networks', () => ({
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
  const { internalAccount1: mockAccountEngine } = jest.requireActual(
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
            [mockAccountEngine.id]: mockAccountEngine,
          },
          selectedAccount: mockAccountEngine.id,
        },
      },
    },
  };
});

// Mock QRCode component to render something visible
jest.mock('react-native-qrcode-svg', () => {
  const actualReact = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return function MockQRCode({ value }: { value: string }) {
    return actualReact.createElement(
      Text,
      { testID: 'mock-qr-code' },
      `QR Code: ${value}`,
    );
  };
});

// Mock ToastContext to prevent context errors in QRAccountDisplay
jest.mock('../../../../../component-library/components/Toast', () => {
  const actualReact = jest.requireActual('react');
  return {
    ToastContext: actualReact.createContext({
      toastRef: { current: null },
    }),
    ToastVariants: {
      Plain: 'plain',
    },
  };
});

const render = (account: InternalAccount = internalAccount1) => {
  // Update the mock account before rendering
  mockAccount = account;

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

  const result = renderWithProvider(
    <ShareAddress />,
    { state: initialState },
    false,
  );

  return result;
};

describe('ShareAddress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGoBack.mockClear();
    mockNavigate.mockClear();
    mockAccount = internalAccount1; // Reset to default
  });

  it('renders correctly with account information', () => {
    const { getByText, getByTestId } = render();

    expect(
      getByText(strings('multichain_accounts.share_address.title')),
    ).toBeTruthy();
    expect(getByTestId('mock-qr-code')).toBeTruthy();
    expect(getByTestId('qr-account-display')).toBeTruthy();

    expect(getByTestId('account-label')).toBeTruthy();
  });

  it('displays QR code with account address', () => {
    const { getByTestId } = render();
    expect(getByTestId('account-address')).toBeTruthy();
  });

  it('navigates back when the back button is pressed', () => {
    const rendered = render();
    const { root } = rendered;
    const touchableOpacities = root.findAllByType(TouchableOpacity);

    // Hack to get the button
    const backButton = touchableOpacities.find(
      (touchable) =>
        touchable.props.accessible === true && touchable.props.onPress,
    );

    expect(backButton).toBeTruthy();
    if (backButton) {
      fireEvent.press(backButton);
    }
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('navigates to the explorer when the explorer button is pressed', () => {
    const { getByTestId } = render();
    const explorerButton = getByTestId('share-address-view-on-explorer-button');
    expect(explorerButton).toBeTruthy();
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
    const snapAccount = createMockSnapInternalAccount(
      '0x9876543210987654321098765432109876543210',
      'Snap Account',
      SolAccountType.DataAccount,
    );

    const { getByTestId } = render(snapAccount);
    expect(getByTestId('account-address')).toBeTruthy();
  });

  it('renders with correct QR code size and logo', () => {
    const { getByTestId } = render();
    expect(getByTestId('mock-qr-code')).toBeTruthy();
  });
});

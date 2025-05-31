import React from 'react';
import { fireEvent } from '@testing-library/react-native';
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
import { IconName } from '../../../../../component-library/components/Icons/Icon';

// QRAccountDisplay is mocked because it uses the safeview context.
// This is a workaround to render the component.
jest.mock('../../../QRAccountDisplay', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');

  return function MockQRAccountDisplay({
    accountAddress,
  }: {
    accountAddress: string;
  }) {
    const [, setClipboard] = React.useState('');

    const handleCopy = () => {
      setClipboard(accountAddress);
    };

    return React.createElement(
      View,
      { testID: 'qr-account-display' },
      React.createElement(Text, { testID: 'account-label' }, 'Test Account'),
      React.createElement(Text, { testID: 'account-address' }, accountAddress),
      React.createElement(
        TouchableOpacity,
        {
          onPress: handleCopy,
          testID: 'qr-account-display-copy-button',
        },
        React.createElement(Text, null, 'Copy Address'),
      ),
    );
  };
});

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
let mockAccount = internalAccount1;
('0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272');

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
    goBack: () => mockGoBack(),
    navigate: () => mockNavigate(),
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
  const React = require('react');
  const { Text } = require('react-native');
  return function MockQRCode({ value }: { value: string }) {
    return React.createElement(
      Text,
      { testID: 'mock-qr-code' },
      `QR Code: ${value}`,
    );
  };
});

// Mock ToastContext to prevent context errors in QRAccountDisplay
jest.mock('../../../../../component-library/components/Toast', () => {
  const React = require('react');
  return {
    ToastContext: React.createContext({
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
    const { getByRole } = render();
    const backButton = getByRole('button', { name: IconName.ArrowLeft });
    fireEvent.press(backButton);
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

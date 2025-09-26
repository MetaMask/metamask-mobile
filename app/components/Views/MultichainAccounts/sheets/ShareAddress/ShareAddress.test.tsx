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
  return function MockQRCode({
    value,
    size,
    logoSize,
    logoBorderRadius,
  }: {
    value: string;
    size?: number;
    logoSize?: number;
    logoBorderRadius?: number;
  }) {
    return actualReact.createElement(
      Text,
      {
        testID: 'mock-qr-code',
        accessibilityLabel: `QR Code: ${value}, size: ${size}, logoSize: ${logoSize}, logoBorderRadius: ${logoBorderRadius}`,
      },
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

  it('displays title and QR account information', () => {
    // Arrange
    const { getByText, getByTestId } = render();

    // Assert
    expect(
      getByText(strings('multichain_accounts.share_address.title')),
    ).toBeOnTheScreen();
    expect(getByTestId('mock-qr-code')).toBeOnTheScreen();
    expect(getByTestId('qr-account-display')).toBeOnTheScreen();
    expect(getByTestId('account-label')).toBeOnTheScreen();
  });

  it('renders QR code with correct size and logo properties', () => {
    // Arrange
    const { getByTestId } = render();
    const qrCode = getByTestId('mock-qr-code');

    // Assert
    expect(qrCode).toBeOnTheScreen();
    expect(qrCode.props.accessibilityLabel).toContain('size: 200');
    expect(qrCode.props.accessibilityLabel).toContain('logoSize: 32');
    expect(qrCode.props.accessibilityLabel).toContain('logoBorderRadius: 8');
  });

  it('navigates back when back button is pressed', () => {
    // Arrange
    const rendered = render();
    const { root } = rendered;
    const touchableOpacities = root.findAllByType(TouchableOpacity);
    const backButton = touchableOpacities.find(
      (touchable) =>
        touchable.props.accessible === true && touchable.props.onPress,
    );

    // Act
    expect(backButton).toBeTruthy();
    if (backButton) {
      fireEvent.press(backButton);
    }

    // Assert
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('navigates to block explorer when explorer button is pressed', () => {
    // Arrange
    const { getByTestId } = render();
    const explorerButton = getByTestId('share-address-view-on-explorer-button');

    // Act
    expect(explorerButton).toBeOnTheScreen();
    fireEvent.press(explorerButton);

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: 'https://etherscan.io',
        title: 'Etherscan',
      },
    });
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('renders different account types correctly', () => {
    // Arrange
    const snapAccount = createMockSnapInternalAccount(
      '0x9876543210987654321098765432109876543210',
      'Snap Account',
      SolAccountType.DataAccount,
    );

    // Act
    const { getByTestId } = render(snapAccount);

    // Assert
    expect(getByTestId('account-address')).toBeOnTheScreen();
    expect(getByTestId('qr-account-display')).toBeOnTheScreen();
  });

  it('displays explorer button with correct text', () => {
    // Arrange
    const { getByText } = render();

    // Assert
    expect(getByText(/View on Etherscan/i)).toBeOnTheScreen();
  });

  it('shows account address in QR account display', () => {
    // Arrange
    const { getByTestId } = render();

    // Assert
    expect(getByTestId('account-address')).toBeOnTheScreen();
  });
});

import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import ShareAddressQR from '.';
import {
  createMockSnapInternalAccount,
  internalAccount1,
} from '../../../../../util/test/accountsControllerTestUtils';
import { SolAccountType } from '@metamask/keyring-api';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { mockNetworkState } from '../../../../../util/test/network';

// Mock QRAccountDisplay component
jest.mock('../../../QRAccountDisplay', () => {
  const actualReact = jest.requireActual('react');
  const {
    View,
    Text,
    TouchableOpacity: RNTouchableOpacity,
  } = jest.requireActual('react-native');

  return function MockQRAccountDisplay({
    accountAddress,
    label,
    description,
  }: {
    accountAddress: string;
    label?: string | React.ReactNode;
    description?: string | React.ReactNode;
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
        typeof label === 'string' ? label : 'Test Account',
      ),
      typeof description !== 'undefined' &&
        (typeof description === 'string'
          ? actualReact.createElement(
              Text,
              { testID: 'account-description' },
              description,
            )
          : actualReact.createElement(
              View,
              { testID: 'account-description' },
              description,
            )),
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

// Mock QRCode component
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

// Mock navigation
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
let mockAccount = internalAccount1;
let mockNetworkName = 'Ethereum Mainnet';

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
      address:
        mockAccount?.address || '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      networkName: mockNetworkName,
      accountName: mockAccount?.metadata?.name || 'Test Account',
      chainId: '0x1',
      groupId: 'test-group-id',
    },
  }),
}));

jest.mock('../../../../../util/address', () => ({
  ...jest.requireActual('../../../../../util/address'),
  renderAccountName: jest.fn().mockReturnValue('Test Account'),
}));

// Mock the selectAccountGroupById selector
jest.mock(
  '../../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    ...jest.requireActual(
      '../../../../../selectors/multichainAccounts/accountTreeController',
    ),
    selectAccountGroupById: jest.fn().mockReturnValue({
      id: 'test-group-id',
      metadata: {
        name: 'Test Account Group',
        pinned: false,
        hidden: false,
      },
    }),
  }),
);

// Mock useBlockExplorer hook
jest.mock('../../../../hooks/useBlockExplorer', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({
    toBlockExplorer: jest.fn(),
    getBlockExplorerName: jest.fn().mockReturnValue('Etherscan (Multichain)'),
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

// Mock ToastContext to prevent context errors
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

const render = (
  account: InternalAccount = internalAccount1,
  networkName: string = 'Ethereum Mainnet',
) => {
  // Update the mock values before rendering
  mockAccount = account;
  mockNetworkName = networkName;

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
    <ShareAddressQR />,
    { state: initialState },
    false,
  );

  return result;
};

describe('ShareAddressQR', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGoBack.mockClear();
    mockNavigate.mockClear();
    mockAccount = internalAccount1;
    mockNetworkName = 'Ethereum Mainnet';
  });

  it('displays title and QR code with account information', () => {
    // Arrange
    const { getByText, getByTestId } = render();

    // Assert
    expect(
      getByText('Test Account Group / Ethereum Mainnet'),
    ).toBeOnTheScreen();
    expect(getByTestId('mock-qr-code')).toBeOnTheScreen();
    expect(getByTestId('qr-account-display')).toBeOnTheScreen();
  });

  it('renders QR code with correct styling properties', () => {
    // Arrange
    const { getByTestId } = render();
    const qrCode = getByTestId('mock-qr-code');

    // Assert
    expect(qrCode).toBeOnTheScreen();
    expect(qrCode.props.accessibilityLabel).toContain('size: 200');
    expect(qrCode.props.accessibilityLabel).toContain('logoSize: 32');
    expect(qrCode.props.accessibilityLabel).toContain('logoBorderRadius: 8');
  });

  it('passes localized label to QRAccountDisplay', () => {
    // Arrange
    const networkName = 'Ethereum Mainnet';
    const { getByTestId } = render(internalAccount1, networkName);
    const accountDisplay = getByTestId('qr-account-display');
    const labelElement = getByTestId('account-label');

    // Assert
    expect(accountDisplay).toBeOnTheScreen();
    expect(labelElement).toBeOnTheScreen();
    // Label should contain the expected localized string
    expect(labelElement.props.children).toContain(networkName);
  });

  it('passes localized description to QRAccountDisplay', () => {
    // Arrange
    const networkName = 'Polygon Mainnet';
    const { getByTestId } = render(internalAccount1, networkName);
    const descriptionElement = getByTestId('account-description');

    // Assert
    expect(descriptionElement).toBeOnTheScreen();
    expect(descriptionElement.props.children).toBeTruthy();
  });

  it('renders description with correct copy for receiving assets', () => {
    // Arrange
    const networkName = 'Ethereum Mainnet';

    // Act
    const { getByText } = render(internalAccount1, networkName);

    // Assert
    // Verify the new copy is rendered
    expect(getByText(/Use this to receive assets on/i)).toBeOnTheScreen();

    // Verify network name is included
    expect(getByText(networkName)).toBeOnTheScreen();
  });

  it('renders description with correct copy for different networks', () => {
    // Arrange - Test with Polygon
    const polygonNetwork = 'Polygon Mainnet';

    // Act
    const { getByText } = render(internalAccount1, polygonNetwork);

    // Assert
    expect(getByText(/Use this to receive assets on/i)).toBeOnTheScreen();
    expect(getByText(polygonNetwork)).toBeOnTheScreen();
  });

  it('navigates back when back button is pressed', () => {
    // Arrange
    const { getByTestId } = render();
    const backButton = getByTestId('share-address-qr-go-back');

    // Act
    fireEvent.press(backButton);

    // Assert
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('navigates to block explorer when View on Etherscan button is pressed', () => {
    // Arrange
    const mockToBlockExplorer = jest.fn();
    const mockGetBlockExplorerName = jest
      .fn()
      .mockReturnValue('Etherscan (Multichain)');
    const useBlockExplorer = jest.requireMock(
      '../../../../hooks/useBlockExplorer',
    ).default;
    useBlockExplorer.mockReturnValue({
      toBlockExplorer: mockToBlockExplorer,
      getBlockExplorerName: mockGetBlockExplorerName,
    });

    const { getByTestId } = render();
    const explorerButton = getByTestId('share-address-qr-copy-button');

    // Act
    fireEvent.press(explorerButton);

    // Assert
    expect(mockToBlockExplorer).toHaveBeenCalledTimes(1);
  });

  it('displays View on Etherscan button with correct text', () => {
    // Arrange
    const { getByText } = render();

    // Assert
    expect(getByText(/View on Etherscan/i)).toBeOnTheScreen();
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

  it('handles different network names in label and description', () => {
    // Arrange
    const customNetworkName = 'Polygon Mainnet';

    // Act
    const { getByTestId } = render(internalAccount1, customNetworkName);
    const labelElement = getByTestId('account-label');
    const descriptionElement = getByTestId('account-description');

    // Assert
    expect(labelElement.props.children).toContain(customNetworkName);
    expect(descriptionElement).toBeOnTheScreen();
  });

  it('shows account address in QR account display', () => {
    // Arrange
    const { getByTestId } = render();

    // Assert
    expect(getByTestId('account-address')).toBeOnTheScreen();
  });
});

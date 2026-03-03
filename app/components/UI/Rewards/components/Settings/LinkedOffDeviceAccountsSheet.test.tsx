import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import LinkedOffDeviceAccountsSheet from './LinkedOffDeviceAccountsSheet';
import ClipboardManager from '../../../../../core/ClipboardManager';
import type { OffDeviceAccount } from '../../hooks/useLinkedOffDeviceAccounts';

// Mock Linking.openURL
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return {
    ...actual,
    Linking: {
      ...actual.Linking,
      openURL: jest.fn().mockResolvedValue(undefined),
    },
  };
});

// Mock FlatList from gesture handler with the real RN FlatList so items render
jest.mock('react-native-gesture-handler', () => {
  const actual = jest.requireActual('react-native');
  return {
    FlatList: actual.FlatList,
    ScrollView: actual.ScrollView,
  };
});

// Mock BottomSheet — renders children directly
jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        children,
      }: {
        children?: React.ReactNode;
        [key: string]: unknown;
      }) =>
        ReactActual.createElement(View, { testID: 'bottom-sheet' }, children),
    };
  },
);

// Mock BottomSheetHeader — renders children directly
jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ children }: { children?: React.ReactNode }) =>
        ReactActual.createElement(
          View,
          { testID: 'bottom-sheet-header' },
          children,
        ),
    };
  },
);

// Mock Avatar
jest.mock('../../../../../component-library/components/Avatars/Avatar', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      name,
      testID,
    }: {
      name?: string;
      testID?: string;
      [key: string]: unknown;
    }) =>
      ReactActual.createElement(View, {
        testID: testID ?? `avatar-${name}`,
      }),
    AvatarSize: { Xs: 'xs', Sm: 'sm', Md: 'md', Lg: 'lg', Xl: 'xl' },
    AvatarVariant: { Account: 'Account', Network: 'Network' },
  };
});

// Mock design system components
jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const {
    View,
    Text: RNText,
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
      onPress,
      testID,
      ...props
    }: {
      children?: React.ReactNode;
      onPress?: () => void;
      testID?: string;
      [key: string]: unknown;
    }) =>
      ReactActual.createElement(
        RNText,
        { onPress, testID, ...props },
        children,
      ),
    ButtonIcon: ({
      onPress,
      testID,
    }: {
      onPress?: () => void;
      testID?: string;
      [key: string]: unknown;
    }) =>
      ReactActual.createElement(TouchableOpacity, {
        onPress,
        testID: testID ?? 'copy-button',
      }),
    TextVariant: { BodyMd: 'BodyMd', BodySm: 'BodySm', HeadingMd: 'HeadingMd' },
    BoxFlexDirection: { Row: 'row', Column: 'column' },
    BoxAlignItems: { Center: 'center', Start: 'flex-start' },
    IconName: { Copy: 'copy', Info: 'info' },
    IconSize: { Md: 'md', Xl: 'xl' },
    FontWeight: { Medium: 'medium', Bold: 'bold' },
  };
});

// Mock i18n — returns the key so tests can assert on i18n keys
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

// Mock address utils
jest.mock('../../../../../util/address', () => ({
  formatAddress: jest.fn((address: string) => `short:${address.slice(2, 8)}`),
}));

// Mock network utils
jest.mock('../../../../../util/networks', () => ({
  getNetworkImageSource: jest.fn(() => undefined),
  getDefaultNetworkByChainId: jest.fn(() => ({ shortName: 'Ethereum' })),
}));

// Mock ClipboardManager
jest.mock('../../../../../core/ClipboardManager', () => ({
  __esModule: true,
  default: { setString: jest.fn().mockResolvedValue(undefined) },
}));

// Mock @metamask/controller-utils toHex
jest.mock('@metamask/controller-utils', () => ({
  toHex: jest.fn(() => '0x1'),
}));

// ─── Test fixtures ────────────────────────────────────────────────────────────

const mockAccount1: OffDeviceAccount = {
  caip10: 'eip155:1:0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  caipChainId: 'eip155:1',
  address: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
};

const mockAccount2: OffDeviceAccount = {
  caip10: 'eip155:1:0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
  caipChainId: 'eip155:1',
  address: '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LinkedOffDeviceAccountsSheet', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the bottom sheet', () => {
      const { getByTestId } = render(
        <LinkedOffDeviceAccountsSheet
          accounts={[mockAccount1]}
          onClose={mockOnClose}
        />,
      );
      expect(getByTestId('bottom-sheet')).toBeOnTheScreen();
    });

    it('renders the sheet header', () => {
      const { getByTestId } = render(
        <LinkedOffDeviceAccountsSheet
          accounts={[mockAccount1]}
          onClose={mockOnClose}
        />,
      );
      expect(getByTestId('bottom-sheet-header')).toBeOnTheScreen();
    });

    it('renders the sheet title', () => {
      const { getByText } = render(
        <LinkedOffDeviceAccountsSheet
          accounts={[mockAccount1]}
          onClose={mockOnClose}
        />,
      );
      expect(
        getByText('rewards.settings.off_device_accounts_sheet_title'),
      ).toBeOnTheScreen();
    });

    it('renders the sheet description', () => {
      const { getByText } = render(
        <LinkedOffDeviceAccountsSheet
          accounts={[mockAccount1]}
          onClose={mockOnClose}
        />,
      );
      // The description Text also contains a nested "let us know" Text child, so the
      // full text content includes both strings — use a regex for a partial match.
      expect(
        getByText(/rewards\.settings\.off_device_accounts_sheet_description/),
      ).toBeOnTheScreen();
    });

    it('renders the "let us know" link text', () => {
      const { getByText } = render(
        <LinkedOffDeviceAccountsSheet
          accounts={[mockAccount1]}
          onClose={mockOnClose}
        />,
      );
      expect(
        getByText('rewards.settings.off_device_accounts_sheet_let_us_know'),
      ).toBeOnTheScreen();
    });

    it('renders a chain name for each account', () => {
      const { getAllByText } = render(
        <LinkedOffDeviceAccountsSheet
          accounts={[mockAccount1, mockAccount2]}
          onClose={mockOnClose}
        />,
      );
      // Both accounts map to 'Ethereum' via the getDefaultNetworkByChainId mock
      expect(getAllByText('Ethereum')).toHaveLength(2);
    });

    it('renders a formatted address for each account', () => {
      const { getAllByText } = render(
        <LinkedOffDeviceAccountsSheet
          accounts={[mockAccount1, mockAccount2]}
          onClose={mockOnClose}
        />,
      );
      expect(getAllByText(/^short:/)).toHaveLength(2);
    });

    it('renders a copy button for each account', () => {
      const { getAllByTestId } = render(
        <LinkedOffDeviceAccountsSheet
          accounts={[mockAccount1, mockAccount2]}
          onClose={mockOnClose}
        />,
      );
      expect(getAllByTestId('copy-button')).toHaveLength(2);
    });

    it('renders a network avatar for each account', () => {
      const { getAllByTestId } = render(
        <LinkedOffDeviceAccountsSheet
          accounts={[mockAccount1, mockAccount2]}
          onClose={mockOnClose}
        />,
      );
      // Avatar testID = 'avatar-{caipChainId}'
      expect(getAllByTestId('avatar-eip155:1')).toHaveLength(2);
    });

    it('renders without errors when the accounts list is empty', () => {
      const renderResult = render(
        <LinkedOffDeviceAccountsSheet accounts={[]} onClose={mockOnClose} />,
      );
      expect(renderResult).toBeTruthy();
    });

    it('renders without errors when onClose is not provided', () => {
      const renderResult = render(
        <LinkedOffDeviceAccountsSheet accounts={[mockAccount1]} />,
      );
      expect(renderResult).toBeTruthy();
    });
  });

  describe('Account sorting', () => {
    it('sorts accounts alphabetically by address ascending', () => {
      // Input: [account2 (0xBBBB...), account1 (0xAAAA...)] — reverse order
      const { getAllByText } = render(
        <LinkedOffDeviceAccountsSheet
          accounts={[mockAccount2, mockAccount1]}
          onClose={mockOnClose}
        />,
      );
      // After sorting, account1 (0xAAAA → 'short:AAAAAA') appears before account2
      const addressTexts = getAllByText(/^short:/);
      expect(addressTexts[0]).toHaveTextContent('short:AAAAAA');
      expect(addressTexts[1]).toHaveTextContent('short:BBBBBB');
    });
  });

  describe('Interactions', () => {
    it('calls Linking.openURL with the MetaMask support URL when "let us know" is pressed', () => {
      const { getByText } = render(
        <LinkedOffDeviceAccountsSheet
          accounts={[mockAccount1]}
          onClose={mockOnClose}
        />,
      );
      fireEvent.press(
        getByText('rewards.settings.off_device_accounts_sheet_let_us_know'),
      );
      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://support.metamask.io',
      );
    });

    it('calls Linking.openURL exactly once per press', () => {
      const { getByText } = render(
        <LinkedOffDeviceAccountsSheet
          accounts={[mockAccount1]}
          onClose={mockOnClose}
        />,
      );
      fireEvent.press(
        getByText('rewards.settings.off_device_accounts_sheet_let_us_know'),
      );
      expect(Linking.openURL).toHaveBeenCalledTimes(1);
    });

    it('calls ClipboardManager.setString with the account address when copy is pressed', () => {
      const { getByTestId } = render(
        <LinkedOffDeviceAccountsSheet
          accounts={[mockAccount1]}
          onClose={mockOnClose}
        />,
      );
      fireEvent.press(getByTestId('copy-button'));
      expect(ClipboardManager.setString).toHaveBeenCalledWith(
        mockAccount1.address,
      );
    });

    it('calls ClipboardManager.setString with the correct address for each account', () => {
      const { getAllByTestId } = render(
        <LinkedOffDeviceAccountsSheet
          accounts={[mockAccount1, mockAccount2]}
          onClose={mockOnClose}
        />,
      );
      // After sorting: account1 (0xAAAA) first, account2 (0xBBBB) second
      const [firstCopyBtn, secondCopyBtn] = getAllByTestId('copy-button');

      fireEvent.press(firstCopyBtn);
      expect(ClipboardManager.setString).toHaveBeenLastCalledWith(
        mockAccount1.address,
      );

      fireEvent.press(secondCopyBtn);
      expect(ClipboardManager.setString).toHaveBeenLastCalledWith(
        mockAccount2.address,
      );
    });
  });

  describe('Chain name resolution (getChainShortName)', () => {
    it('displays the network shortName from getDefaultNetworkByChainId', () => {
      const { getByText } = render(
        <LinkedOffDeviceAccountsSheet
          accounts={[mockAccount1]}
          onClose={mockOnClose}
        />,
      );
      expect(getByText('Ethereum')).toBeOnTheScreen();
    });

    it('falls back to the raw caipChainId when the network has no shortName', () => {
      const { getDefaultNetworkByChainId } = jest.requireMock(
        '../../../../../util/networks',
      );
      getDefaultNetworkByChainId.mockReturnValueOnce({});

      const accountNoShortName: OffDeviceAccount = {
        caip10: 'eip155:1:0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
        caipChainId: 'eip155:1',
        address: '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
      };

      const { getByText } = render(
        <LinkedOffDeviceAccountsSheet
          accounts={[accountNoShortName]}
          onClose={mockOnClose}
        />,
      );
      expect(getByText('eip155:1')).toBeOnTheScreen();
    });

    it('falls back to the raw caipChainId when getDefaultNetworkByChainId returns undefined', () => {
      const { getDefaultNetworkByChainId } = jest.requireMock(
        '../../../../../util/networks',
      );
      getDefaultNetworkByChainId.mockReturnValueOnce(undefined);

      const accountUnknownChain: OffDeviceAccount = {
        caip10: 'eip155:999:0xDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
        caipChainId: 'eip155:999',
        address: '0xDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
      };

      const { getByText } = render(
        <LinkedOffDeviceAccountsSheet
          accounts={[accountUnknownChain]}
          onClose={mockOnClose}
        />,
      );
      expect(getByText('eip155:999')).toBeOnTheScreen();
    });

    it('falls back to the raw caipChainId when getDefaultNetworkByChainId throws', () => {
      const { getDefaultNetworkByChainId } = jest.requireMock(
        '../../../../../util/networks',
      );
      getDefaultNetworkByChainId.mockImplementationOnce(() => {
        throw new Error('Network not found');
      });

      const { getByText } = render(
        <LinkedOffDeviceAccountsSheet
          accounts={[mockAccount1]}
          onClose={mockOnClose}
        />,
      );
      expect(getByText('eip155:1')).toBeOnTheScreen();
    });
  });

  describe('Error handling', () => {
    it('renders successfully when getNetworkImageSource throws', () => {
      const { getNetworkImageSource } = jest.requireMock(
        '../../../../../util/networks',
      );
      getNetworkImageSource.mockImplementationOnce(() => {
        throw new Error('Image not found');
      });

      const renderResult = render(
        <LinkedOffDeviceAccountsSheet
          accounts={[mockAccount1]}
          onClose={mockOnClose}
        />,
      );
      expect(renderResult).toBeTruthy();
    });

    it('does not throw when ClipboardManager.setString rejects', () => {
      (ClipboardManager.setString as jest.Mock).mockRejectedValueOnce(
        new Error('Clipboard unavailable'),
      );

      const { getByTestId } = render(
        <LinkedOffDeviceAccountsSheet
          accounts={[mockAccount1]}
          onClose={mockOnClose}
        />,
      );

      expect(() => fireEvent.press(getByTestId('copy-button'))).not.toThrow();
    });
  });
});

import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import {
  MOCK_ACCOUNT_CONTROLLER_STATE,
  MOCK_KEYRING_CONTROLLER_STATE,
  mockTransaction,
} from '../../../../../../util/test/confirm-data-helpers';
import { RootState } from '../../../../../../reducers';
// eslint-disable-next-line import/no-namespace
import * as Networks7702 from '../../../hooks/7702/useEIP7702Networks';
import { EIP7702NetworkConfiguration } from '../../../hooks/7702/useEIP7702Networks';
import SwitchAccountTypeModal from './switch-account-type-modal';

import {} from '../../../../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts';

jest.mock('../../../hooks/tokens/useTokenWithBalance');
jest.mock('../../../hooks/gas/useGasFeeToken');

const MOCK_NETWORK = {
  chainId: '0xaa36a7',
  delegationAddress: '0x63c0c19a282a1b52b07dd5a65b58948a07dae32b',
  isSupported: true,
  upgradeContractAddress: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
  blockExplorerUrls: [],
  defaultRpcEndpointIndex: 0,
  name: 'Sepolia',
  nativeCurrency: 'SepoliaETH',
  rpcEndpoints: [
    {
      failoverUrls: [],
      networkClientId: 'sepolia',
      type: 'infura',
      url: 'https://sepolia.infura.io/v3/{infuraProjectId}',
    },
  ],
} as unknown as EIP7702NetworkConfiguration;

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: mockGoBack,
  }),
}));

const createMockRoute = (
  address = '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
) => ({
  params: { address: address as `0x${string}` },
  key: 'ConfirmationSwitchAccountType',
  name: 'ConfirmationSwitchAccountType' as const,
});

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { width: 0, height: 0, x: 0, y: 0 };

  return {
    ...jest.requireActual('react-native-safe-area-context'),
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
    useSafeAreaFrame: jest.fn().mockImplementation(() => frame),
  };
});

jest.mock(
  '../../../../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts',
  () => ({
    selectMultichainAccountsState1Enabled: () => false,
  }),
);

const MOCK_STATE = {
  engine: {
    backgroundState: {
      AccountsController: MOCK_ACCOUNT_CONTROLLER_STATE,
      KeyringController: MOCK_KEYRING_CONTROLLER_STATE,
      TransactionController: { transactions: [mockTransaction] },
    },
  },
} as unknown as RootState;

const MOCK_NETWORK_MAINNET = {
  chainId: '0x1',
  delegationAddress: '0x1234567890abcdef1234567890abcdef12345678',
  isSupported: true,
  upgradeContractAddress: '0x1234567890abcdef1234567890abcdef12345678',
  blockExplorerUrls: [],
  defaultRpcEndpointIndex: 0,
  name: 'Ethereum Mainnet',
  nativeCurrency: 'ETH',
  rpcEndpoints: [
    {
      failoverUrls: [],
      networkClientId: 'mainnet',
      type: 'infura',
      url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
    },
  ],
} as unknown as EIP7702NetworkConfiguration;

describe('Switch Account Type Modal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('displays account info and network details correctly', () => {
      jest.spyOn(Networks7702, 'useEIP7702Networks').mockReturnValue({
        pending: false,
        network7702List: [MOCK_NETWORK],
        networkSupporting7702Present: true,
      });

      const { getByText } = renderWithProvider(
        <SwitchAccountTypeModal route={createMockRoute()} />,
        { state: MOCK_STATE },
      );
      expect(getByText('Account 1')).toBeOnTheScreen();
      expect(getByText('Sepolia')).toBeOnTheScreen();
      expect(getByText('Smart account')).toBeOnTheScreen();
      expect(getByText('Switch back')).toBeOnTheScreen();
    });

    it('renders empty state when network7702List is empty', () => {
      jest.spyOn(Networks7702, 'useEIP7702Networks').mockReturnValue({
        pending: false,
        network7702List: [],
        networkSupporting7702Present: false,
      });

      const { getByText, queryByText } = renderWithProvider(
        <SwitchAccountTypeModal route={createMockRoute()} />,
        { state: MOCK_STATE },
      );

      // Account info should still be displayed
      expect(getByText('Account 1')).toBeOnTheScreen();
      // But no network rows should be present
      expect(queryByText('Sepolia')).toBeNull();
      expect(queryByText('Smart account')).toBeNull();
    });

    it('renders multiple network rows when multiple networks are present', () => {
      jest.spyOn(Networks7702, 'useEIP7702Networks').mockReturnValue({
        pending: false,
        network7702List: [MOCK_NETWORK, MOCK_NETWORK_MAINNET],
        networkSupporting7702Present: true,
      });

      const { getByText } = renderWithProvider(
        <SwitchAccountTypeModal route={createMockRoute()} />,
        { state: MOCK_STATE },
      );

      expect(getByText('Account 1')).toBeOnTheScreen();
      expect(getByText('Sepolia')).toBeOnTheScreen();
      expect(getByText('Ethereum Mainnet')).toBeOnTheScreen();
    });

    it('displays spinner when network list is loading', () => {
      jest.spyOn(Networks7702, 'useEIP7702Networks').mockReturnValue({
        pending: true,
        network7702List: [],
        networkSupporting7702Present: false,
      });

      const { getByTestId, queryByText } = renderWithProvider(
        <SwitchAccountTypeModal route={createMockRoute()} />,
        { state: MOCK_STATE },
      );

      expect(queryByText('Account 1')).toBeNull();
      expect(queryByText('Sepolia')).toBeNull();
      expect(queryByText('Smart account')).toBeNull();
      expect(queryByText('Switch')).toBeNull();
      expect(getByTestId('network-data-loader')).toBeOnTheScreen();
    });
  });

  describe('route params handling', () => {
    it('uses address from route params when provided', () => {
      jest.spyOn(Networks7702, 'useEIP7702Networks').mockReturnValue({
        pending: false,
        network7702List: [MOCK_NETWORK],
        networkSupporting7702Present: true,
      });

      const { getByText } = renderWithProvider(
        <SwitchAccountTypeModal route={createMockRoute()} />,
        { state: MOCK_STATE },
      );

      // Should render the account that matches the address
      expect(getByText('Account 1')).toBeOnTheScreen();
    });

    it('does not display account name when address does not match any account', () => {
      const unknownAddress = '0x0000000000000000000000000000000000000001';
      jest.spyOn(Networks7702, 'useEIP7702Networks').mockReturnValue({
        pending: false,
        network7702List: [MOCK_NETWORK],
        networkSupporting7702Present: true,
      });

      const { queryByText } = renderWithProvider(
        <SwitchAccountTypeModal route={createMockRoute(unknownAddress)} />,
        { state: MOCK_STATE },
      );

      // Account name should not be displayed since address doesn't match any account
      expect(queryByText('Account 1')).toBeNull();
    });
  });

  describe('navigation', () => {
    it('navigates back when back button is pressed', () => {
      jest.spyOn(Networks7702, 'useEIP7702Networks').mockReturnValue({
        pending: false,
        network7702List: [MOCK_NETWORK],
        networkSupporting7702Present: true,
      });

      const { getByTestId } = renderWithProvider(
        <SwitchAccountTypeModal route={createMockRoute()} />,
        { state: MOCK_STATE },
      );

      fireEvent.press(getByTestId('switch-account-goback'));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('calls goBack only once per button press', () => {
      jest.spyOn(Networks7702, 'useEIP7702Networks').mockReturnValue({
        pending: false,
        network7702List: [MOCK_NETWORK],
        networkSupporting7702Present: true,
      });

      const { getByTestId } = renderWithProvider(
        <SwitchAccountTypeModal route={createMockRoute()} />,
        { state: MOCK_STATE },
      );

      const backButton = getByTestId('switch-account-goback');
      fireEvent.press(backButton);
      fireEvent.press(backButton);

      expect(mockGoBack).toHaveBeenCalledTimes(2);
    });
  });

  describe('hook integration', () => {
    it('passes correct address to useEIP7702Networks hook', () => {
      const mockUseEIP7702Networks = jest
        .spyOn(Networks7702, 'useEIP7702Networks')
        .mockReturnValue({
          pending: false,
          network7702List: [MOCK_NETWORK],
          networkSupporting7702Present: true,
        });

      const testAddress = '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477';
      renderWithProvider(
        <SwitchAccountTypeModal route={createMockRoute(testAddress)} />,
        { state: MOCK_STATE },
      );

      expect(mockUseEIP7702Networks).toHaveBeenCalledWith(testAddress);
    });
  });
});

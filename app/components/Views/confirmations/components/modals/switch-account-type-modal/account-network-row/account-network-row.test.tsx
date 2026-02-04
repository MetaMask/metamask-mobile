import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';

import { SmartAccountIds } from '../../../../../MultichainAccounts/SmartAccount.testIds';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { RootState } from '../../../../../../../reducers';
import { mockTransaction } from '../../../../../../../util/test/confirm-data-helpers';
import { EIP7702NetworkConfiguration } from '../../../../hooks/7702/useEIP7702Networks';
import Routes from '../../../../../../../constants/navigation/Routes';
import AccountNetworkRow from './account-network-row';

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

const MOCK_ADDRESS = '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477';

const mockDowngradeAccount = jest.fn().mockResolvedValue(undefined);
const mockUpgradeAccount = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../../hooks/7702/useEIP7702Accounts', () => ({
  useEIP7702Accounts: () => ({
    downgradeAccount: mockDowngradeAccount,
    upgradeAccount: mockUpgradeAccount,
  }),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

const mockUseBatchAuthorizationRequests = jest.fn();
jest.mock('../../../../hooks/7702/useBatchAuthorizationRequests', () => ({
  useBatchAuthorizationRequests: () => mockUseBatchAuthorizationRequests(),
}));

const MOCK_STATE = {
  engine: {
    backgroundState: {
      TransactionController: { transactions: [mockTransaction] },
    },
  },
} as unknown as RootState;

describe('AccountNetworkRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBatchAuthorizationRequests.mockReturnValue({
      hasPendingRequests: false,
    });
  });

  describe('rendering', () => {
    it('renders network name correctly', () => {
      const { getByText } = renderWithProvider(
        <AccountNetworkRow address={MOCK_ADDRESS} network={MOCK_NETWORK} />,
        { state: MOCK_STATE },
      );

      expect(getByText(MOCK_NETWORK.name)).toBeTruthy();
    });

    it('renders switch component with correct testID', () => {
      const { getByTestId } = renderWithProvider(
        <AccountNetworkRow address={MOCK_ADDRESS} network={MOCK_NETWORK} />,
        { state: MOCK_STATE },
      );

      expect(getByTestId(SmartAccountIds.SMART_ACCOUNT_SWITCH)).toBeTruthy();
    });

    it('renders switch as enabled when network is supported (smart account)', () => {
      const { getByTestId } = renderWithProvider(
        <AccountNetworkRow address={MOCK_ADDRESS} network={MOCK_NETWORK} />,
        { state: MOCK_STATE },
      );

      const switchComponent = getByTestId(SmartAccountIds.SMART_ACCOUNT_SWITCH);

      expect(switchComponent.props.value).toBe(true);
    });

    it('renders switch as disabled when network is not supported (standard account)', () => {
      const { getByTestId } = renderWithProvider(
        <AccountNetworkRow
          address={MOCK_ADDRESS}
          network={{ ...MOCK_NETWORK, isSupported: false }}
        />,
        { state: MOCK_STATE },
      );

      const switchComponent = getByTestId(SmartAccountIds.SMART_ACCOUNT_SWITCH);

      expect(switchComponent.props.value).toBe(false);
    });
  });

  describe('switch interactions', () => {
    it('calls downgrade function when switch is toggled from smart to standard account', async () => {
      const { getByTestId } = renderWithProvider(
        <AccountNetworkRow address={MOCK_ADDRESS} network={MOCK_NETWORK} />,
        { state: MOCK_STATE },
      );

      const switchComponent = getByTestId(SmartAccountIds.SMART_ACCOUNT_SWITCH);
      fireEvent(switchComponent, 'onValueChange', false);

      await waitFor(() => {
        expect(mockDowngradeAccount).toHaveBeenCalledWith(MOCK_ADDRESS);
        expect(mockDowngradeAccount).toHaveBeenCalledTimes(1);
      });
    });

    it('calls upgrade function when switch is toggled from standard to smart account', async () => {
      const { getByTestId } = renderWithProvider(
        <AccountNetworkRow
          address={MOCK_ADDRESS}
          network={{ ...MOCK_NETWORK, isSupported: false }}
        />,
        { state: MOCK_STATE },
      );

      const switchComponent = getByTestId(SmartAccountIds.SMART_ACCOUNT_SWITCH);
      fireEvent(switchComponent, 'onValueChange', true);

      await waitFor(() => {
        expect(mockUpgradeAccount).toHaveBeenCalledWith(
          MOCK_ADDRESS,
          MOCK_NETWORK.upgradeContractAddress,
        );
        expect(mockUpgradeAccount).toHaveBeenCalledTimes(1);
      });
    });

    it('does not call upgrade when upgradeContractAddress is missing', async () => {
      const networkWithoutUpgradeContract = {
        ...MOCK_NETWORK,
        isSupported: false,
        upgradeContractAddress: undefined,
      };

      const { getByTestId } = renderWithProvider(
        <AccountNetworkRow
          address={MOCK_ADDRESS}
          network={networkWithoutUpgradeContract}
        />,
        { state: MOCK_STATE },
      );

      const switchComponent = getByTestId(SmartAccountIds.SMART_ACCOUNT_SWITCH);
      fireEvent(switchComponent, 'onValueChange', true);

      // Wait for async operations to settle
      await waitFor(() => {
        expect(mockUpgradeAccount).not.toHaveBeenCalled();
        expect(mockDowngradeAccount).not.toHaveBeenCalled();
      });
    });

    it('navigates to confirmation modal after switch action', async () => {
      const { getByTestId } = renderWithProvider(
        <AccountNetworkRow address={MOCK_ADDRESS} network={MOCK_NETWORK} />,
        { state: MOCK_STATE },
      );

      const switchComponent = getByTestId(SmartAccountIds.SMART_ACCOUNT_SWITCH);
      fireEvent(switchComponent, 'onValueChange', false);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.CONFIRMATION_REQUEST_MODAL,
        );
      });
    });

    it('returns early when switchRequestSubmitted is true', async () => {
      const { getByTestId } = renderWithProvider(
        <AccountNetworkRow address={MOCK_ADDRESS} network={MOCK_NETWORK} />,
        { state: MOCK_STATE },
      );

      const switchComponent = getByTestId(SmartAccountIds.SMART_ACCOUNT_SWITCH);

      // First click to trigger the switch and set switchRequestSubmitted to true
      fireEvent(switchComponent, 'onValueChange', false);

      // Second click while switchRequestSubmitted is true - returns early
      fireEvent(switchComponent, 'onValueChange', true);

      // Wait for async operations to complete
      await waitFor(() => {
        // Calls downgradeAccount only once
        expect(mockDowngradeAccount).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('switch disabled state', () => {
    it('disables switch when there are pending requests', () => {
      mockUseBatchAuthorizationRequests.mockReturnValueOnce({
        hasPendingRequests: true,
      });

      const { getByTestId } = renderWithProvider(
        <AccountNetworkRow address={MOCK_ADDRESS} network={MOCK_NETWORK} />,
        { state: MOCK_STATE },
      );

      const switchComponent = getByTestId(SmartAccountIds.SMART_ACCOUNT_SWITCH);

      expect(switchComponent.props.disabled).toBe(true);
    });

    it('disables switch for standard account when upgradeContractAddress is missing', () => {
      const networkWithoutUpgradeContract = {
        ...MOCK_NETWORK,
        isSupported: false,
        upgradeContractAddress: undefined,
      };

      const { getByTestId } = renderWithProvider(
        <AccountNetworkRow
          address={MOCK_ADDRESS}
          network={networkWithoutUpgradeContract}
        />,
        { state: MOCK_STATE },
      );

      const switchComponent = getByTestId(SmartAccountIds.SMART_ACCOUNT_SWITCH);

      expect(switchComponent.props.disabled).toBe(true);
    });

    it('enables switch for smart account without pending requests', () => {
      const { getByTestId } = renderWithProvider(
        <AccountNetworkRow address={MOCK_ADDRESS} network={MOCK_NETWORK} />,
        { state: MOCK_STATE },
      );

      const switchComponent = getByTestId(SmartAccountIds.SMART_ACCOUNT_SWITCH);

      expect(switchComponent.props.disabled).toBe(false);
    });
  });

  describe('initial state based on network support', () => {
    it('initializes with addressSupportSmartAccount true when network isSupported is true', () => {
      mockUseBatchAuthorizationRequests.mockReturnValue({
        hasPendingRequests: false,
      });

      const { getByTestId } = renderWithProvider(
        <AccountNetworkRow address={MOCK_ADDRESS} network={MOCK_NETWORK} />,
        { state: MOCK_STATE },
      );

      const switchComponent = getByTestId(SmartAccountIds.SMART_ACCOUNT_SWITCH);
      // Should be true since isSupported=true in MOCK_NETWORK
      expect(switchComponent.props.value).toBe(true);
    });

    it('initializes with addressSupportSmartAccount false when network isSupported is false', () => {
      mockUseBatchAuthorizationRequests.mockReturnValue({
        hasPendingRequests: false,
      });

      const unsupportedNetwork = { ...MOCK_NETWORK, isSupported: false };

      const { getByTestId } = renderWithProvider(
        <AccountNetworkRow
          address={MOCK_ADDRESS}
          network={unsupportedNetwork}
        />,
        { state: MOCK_STATE },
      );

      const switchComponent = getByTestId(SmartAccountIds.SMART_ACCOUNT_SWITCH);
      // Should be false since isSupported=false
      expect(switchComponent.props.value).toBe(false);
    });

    it('does not toggle state on initial render when hasPendingRequests is false', () => {
      // Start without pending requests (prevHasPendingRequests will be undefined initially)
      mockUseBatchAuthorizationRequests.mockReturnValue({
        hasPendingRequests: false,
      });

      const { getByTestId } = renderWithProvider(
        <AccountNetworkRow address={MOCK_ADDRESS} network={MOCK_NETWORK} />,
        { state: MOCK_STATE },
      );

      const switchComponent = getByTestId(SmartAccountIds.SMART_ACCOUNT_SWITCH);
      // Should remain true since prevHasPendingRequests was never set (undefined)
      // and the useEffect check guards against toggling on initial render
      expect(switchComponent.props.value).toBe(true);
    });

    it('does not toggle state on initial render when hasPendingRequests is true', () => {
      // Start with pending requests
      mockUseBatchAuthorizationRequests.mockReturnValue({
        hasPendingRequests: true,
      });

      const { getByTestId } = renderWithProvider(
        <AccountNetworkRow address={MOCK_ADDRESS} network={MOCK_NETWORK} />,
        { state: MOCK_STATE },
      );

      const switchComponent = getByTestId(SmartAccountIds.SMART_ACCOUNT_SWITCH);
      // Should remain true since prevHasPendingRequests was undefined on first render
      // The useEffect only toggles when prevHasPendingRequests.current is truthy
      expect(switchComponent.props.value).toBe(true);
      expect(switchComponent.props.disabled).toBe(true);
    });
  });
});

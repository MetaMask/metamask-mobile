import React from 'react';
import { fireEvent } from '@testing-library/react-native';

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

const mockMultichainAccountsState1Enabled = jest.fn().mockReturnValue(false);
jest.mock(
  '../../../../../../../selectors/featureFlagController/multichainAccounts',
  () => ({
    selectMultichainAccountsState1Enabled: () =>
      mockMultichainAccountsState1Enabled(),
  }),
);

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

describe('Account Network Row', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBatchAuthorizationRequests.mockReturnValue({
      hasPendingRequests: false,
    });
  });

  it('renders correctly for smart account', () => {
    const { getByText } = renderWithProvider(
      <AccountNetworkRow address={MOCK_ADDRESS} network={MOCK_NETWORK} />,
      { state: MOCK_STATE },
    );

    expect(getByText('Smart account')).toBeTruthy();
    expect(getByText('Switch back')).toBeTruthy();
  });

  it('renders correctly for standard account', () => {
    const { getByText } = renderWithProvider(
      <AccountNetworkRow
        address={MOCK_ADDRESS}
        network={{ ...MOCK_NETWORK, isSupported: false }}
      />,
      { state: MOCK_STATE },
    );

    expect(getByText('Standard account')).toBeTruthy();
    expect(getByText('Switch')).toBeTruthy();
  });

  describe('Multichain Accounts Design', () => {
    it('renders network name correctly', () => {
      mockMultichainAccountsState1Enabled.mockReturnValueOnce(true);
      const { getByText } = renderWithProvider(
        <AccountNetworkRow address={MOCK_ADDRESS} network={MOCK_NETWORK} />,
        { state: MOCK_STATE },
      );

      expect(getByText(MOCK_NETWORK.name)).toBeTruthy();
    });

    it('renders switch component with correct testID', () => {
      mockMultichainAccountsState1Enabled.mockReturnValueOnce(true);
      const { getByTestId } = renderWithProvider(
        <AccountNetworkRow address={MOCK_ADDRESS} network={MOCK_NETWORK} />,
        { state: MOCK_STATE },
      );

      expect(getByTestId(SmartAccountIds.SMART_ACCOUNT_SWITCH)).toBeTruthy();
    });

    it('renders switch in correct state for smart account (supported network)', () => {
      mockMultichainAccountsState1Enabled.mockReturnValueOnce(true);
      const { getByTestId } = renderWithProvider(
        <AccountNetworkRow address={MOCK_ADDRESS} network={MOCK_NETWORK} />,
        { state: MOCK_STATE },
      );

      const switchComponent = getByTestId(SmartAccountIds.SMART_ACCOUNT_SWITCH);
      expect(switchComponent.props.value).toBe(true);
    });

    it('renders switch in correct state for standard account (unsupported network)', () => {
      mockMultichainAccountsState1Enabled.mockReturnValueOnce(true);
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

    it('calls downgrade function when switch is toggled from smart to standard account', () => {
      mockMultichainAccountsState1Enabled.mockReturnValueOnce(true);
      const { getByTestId } = renderWithProvider(
        <AccountNetworkRow address={MOCK_ADDRESS} network={MOCK_NETWORK} />,
        { state: MOCK_STATE },
      );

      const switchComponent = getByTestId(SmartAccountIds.SMART_ACCOUNT_SWITCH);
      fireEvent(switchComponent, 'onValueChange', false);

      expect(mockDowngradeAccount).toHaveBeenCalledWith(MOCK_ADDRESS);
      expect(mockDowngradeAccount).toHaveBeenCalledTimes(1);
    });

    it('calls upgrade function when switch is toggled from standard to smart account', () => {
      mockMultichainAccountsState1Enabled.mockReturnValueOnce(true);
      const { getByTestId } = renderWithProvider(
        <AccountNetworkRow
          address={MOCK_ADDRESS}
          network={{ ...MOCK_NETWORK, isSupported: false }}
        />,
        { state: MOCK_STATE },
      );

      const switchComponent = getByTestId(SmartAccountIds.SMART_ACCOUNT_SWITCH);
      fireEvent(switchComponent, 'onValueChange', true);

      expect(mockUpgradeAccount).toHaveBeenCalledWith(
        MOCK_ADDRESS,
        MOCK_NETWORK.upgradeContractAddress,
      );
      expect(mockUpgradeAccount).toHaveBeenCalledTimes(1);
    });

    it('does not call upgrade when upgradeContractAddress is missing', () => {
      mockMultichainAccountsState1Enabled.mockReturnValueOnce(true);
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

      expect(mockUpgradeAccount).not.toHaveBeenCalled();
      expect(mockDowngradeAccount).not.toHaveBeenCalled();
    });

    it('disables switch when there are pending requests', () => {
      mockMultichainAccountsState1Enabled.mockReturnValueOnce(true);
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
      mockMultichainAccountsState1Enabled.mockReturnValueOnce(true);
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
  });

  describe('Switch Button', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
    it('when clicked call upgrade function if not already upgraded', () => {
      const { getByText } = renderWithProvider(
        <AccountNetworkRow
          address={MOCK_ADDRESS}
          network={{ ...MOCK_NETWORK, isSupported: false }}
        />,
        { state: MOCK_STATE },
      );

      fireEvent.press(getByText('Switch'));

      expect(mockUpgradeAccount).toHaveBeenCalledTimes(1);
    });

    it('when clicked call downgrade function if already upgraded', () => {
      const { getByText } = renderWithProvider(
        <AccountNetworkRow address={MOCK_ADDRESS} network={MOCK_NETWORK} />,
        { state: MOCK_STATE },
      );

      fireEvent.press(getByText('Switch back'));

      expect(mockDowngradeAccount).toHaveBeenCalledTimes(1);
    });

    it('does not close account modal when useMultichainAccountsDesign is true', () => {
      mockMultichainAccountsState1Enabled.mockReturnValueOnce(true);
      const { getByTestId } = renderWithProvider(
        <AccountNetworkRow address={MOCK_ADDRESS} network={MOCK_NETWORK} />,
        { state: MOCK_STATE },
      );

      fireEvent.press(getByTestId(SmartAccountIds.SMART_ACCOUNT_SWITCH));

      expect(mockNavigate).not.toHaveBeenCalledWith(Routes.WALLET.HOME, {
        screen: Routes.WALLET.TAB_STACK_FLOW,
        params: {
          screen: Routes.WALLET_VIEW,
        },
      });
    });

    it('returns early when switchRequestSubmitted is true', async () => {
      mockMultichainAccountsState1Enabled.mockReturnValueOnce(true);
      const { getByTestId } = renderWithProvider(
        <AccountNetworkRow address={MOCK_ADDRESS} network={MOCK_NETWORK} />,
        { state: MOCK_STATE },
      );

      const switchComponent = getByTestId(SmartAccountIds.SMART_ACCOUNT_SWITCH);

      // First click to trigger the switch and set switchRequestSubmitted to true
      fireEvent(switchComponent, 'onValueChange', false);

      // Second click while switchRequestSubmitted is true - should return early
      fireEvent(switchComponent, 'onValueChange', true);

      // Calls downgradeAccount once
      expect(mockDowngradeAccount).toHaveBeenCalledTimes(1);
    });
  });
});

import React from 'react';

import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { EIP7702NetworkConfiguration } from '../../../../hooks/7702/useEIP7702Networks';
import AccountNetworkRow from './account-network-row';
import { fireEvent } from '@testing-library/react-native';
import { RootState } from '../../../../../../../reducers';
import { mockTransaction } from '../../../../../../../util/test/confirm-data-helpers';

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

const MOCK_STATE = {
  engine: {
    backgroundState: {
      TransactionController: { transactions: [mockTransaction] },
    },
  },
} as unknown as RootState;

describe('Account Network Row', () => {
  it('renders correctly for smart account', () => {
    const { getByText } = renderWithProvider(
      <AccountNetworkRow address={MOCK_ADDRESS} network={MOCK_NETWORK} />,
      { state: MOCK_STATE },
    );

    expect(getByText('Smart Account')).toBeTruthy();
    expect(getByText('Switch')).toBeTruthy();
  });

  it('renders correctly for standard account', () => {
    const { getByText } = renderWithProvider(
      <AccountNetworkRow
        address={MOCK_ADDRESS}
        network={{ ...MOCK_NETWORK, isSupported: false }}
      />,
      { state: MOCK_STATE },
    );

    expect(getByText('Standard Account')).toBeTruthy();
    expect(getByText('Switch')).toBeTruthy();
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

      fireEvent.press(getByText('Switch'));

      expect(mockDowngradeAccount).toHaveBeenCalledTimes(1);
    });
  });
});

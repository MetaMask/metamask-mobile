import React from 'react';
import * as ReactRedux from 'react-redux';

import renderWithProvider from '../../../../../util/test/renderWithProvider';
import * as Networks7702 from '../../hooks/useEIP7702Networks';
import { EIP7702NetworkConfiguration } from '../../hooks/useEIP7702Networks';
import SwitchAccountTypeModal from './switch-account-type-modal';

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

const MOCK_ACCOUNT = {
  id: '94b520b3-a0c9-4cbd-a689-441a01630331',
  address: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
  options: {},
  methods: [
    'personal_sign',
    'eth_sign',
    'eth_signTransaction',
    'eth_signTypedData_v1',
    'eth_signTypedData_v3',
    'eth_signTypedData_v4',
  ],
  scopes: ['eip155:0'],
  type: 'eip155:eoa',
  metadata: {
    name: 'Account 1',
    importTime: 1746181774143,
    keyring: { type: 'HD Key Tree' },
    lastSelected: 1746191007939,
  },
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useRoute: jest.fn().mockReturnValue({
    params: { address: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477' },
  }),
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

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

describe('Switch Account Type Modal', () => {
  it('displays information correctly', () => {
    jest.spyOn(Networks7702, 'useEIP7702Networks').mockReturnValue({
      pending: false,
      network7702List: [MOCK_NETWORK],
      networkSupporting7702Present: true,
    });
    jest.spyOn(ReactRedux, 'useSelector').mockReturnValue([MOCK_ACCOUNT]);

    const { getByText } = renderWithProvider(<SwitchAccountTypeModal />, {});
    expect(getByText('Account 1')).toBeTruthy();
    expect(getByText('Sepolia')).toBeTruthy();
    expect(getByText('Smart Account')).toBeTruthy();
    expect(getByText('Switch')).toBeTruthy();
  });

  it('displays spinner when network list is loading', () => {
    jest.spyOn(Networks7702, 'useEIP7702Networks').mockReturnValue({
      pending: true,
      network7702List: [],
      networkSupporting7702Present: false,
    });
    jest.spyOn(ReactRedux, 'useSelector').mockReturnValue([MOCK_ACCOUNT]);

    const container = renderWithProvider(<SwitchAccountTypeModal />, {});
    const { queryByText } = container;
    expect(queryByText('Account 1')).toBeNull();
    expect(queryByText('Sepolia')).toBeNull();
    expect(queryByText('Smart Account')).toBeNull();
    expect(queryByText('Switch')).toBeNull();
    expect(container).toMatchSnapshot();
  });
});

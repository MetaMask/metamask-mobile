import React from 'react';
import SwitchCustomNetwork from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

const mockInitialState = {
  wizard: {
    step: 1,
  },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

jest.mock('../../../components/hooks/useAccounts', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { KeyringTypes } = require('@metamask/keyring-controller');

  return {
    useAccounts: () => ({
      accounts: [
        {
          name: 'Account 1',
          address: '0x0000000000000000000000000000000000000001',
          type: KeyringTypes.hd,
          yOffset: 0,
          isSelected: true,
          assets: {
            fiatBalance: '$0.00\n0 ETH',
          },
          balanceError: undefined,
        },
      ],
      evmAccounts: [
        {
          name: 'Account 1',
          address: '0x0000000000000000000000000000000000000001',
          type: KeyringTypes.hd,
          yOffset: 0,
          isSelected: true,
          assets: {
            fiatBalance: '$0.00\n0 ETH',
          },
          balanceError: undefined,
        },
      ],
      ensByAccountAddress: {},
    }),
  };
});

describe('SwitchCustomNetwork', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <SwitchCustomNetwork
        customNetworkInformation={{ chainName: '', chainId: '' }}
        currentPageInformation={{ url: 'https://app.uniswap.org/' }}
      />,
      { state: mockInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});

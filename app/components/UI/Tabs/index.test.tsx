import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import Tabs from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 1, right: 2, bottom: 3, left: 4 };
  return {
    SafeAreaInsetsContext: {
      Consumer: jest.fn().mockImplementation(({ children }) => children(inset)),
    },
  };
});

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

describe('Tabs', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <Tabs tabs={[{ id: 1, url: 'about:blank', image: '' }]} />,
      { state: mockInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});

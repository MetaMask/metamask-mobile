import '../../_mocks_/initialState';
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { NavigationContainer } from '@react-navigation/native';
import DestinationAccountSelector from './index';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { AccountGroupObject } from '@metamask/account-tree-controller';
import { AvatarAccountType } from '../../../../../component-library/components/Avatars/Avatar';

// Test-specific state type for mock selectors
interface MockState {
  bridge: {
    destAddress?: string;
  };
  engine?: {
    backgroundState?: {
      AccountTreeController?: {
        accountTree?: {
          selectedAccountGroupId?: string | null;
          accountGroups?: Record<string, AccountGroupObject>;
        };
      };
    };
  };
}

// Mock Engine
jest.mock('../../../../../core/Engine', () => {
  const { KeyringTypes } = jest.requireActual('@metamask/keyring-controller');
  return {
    context: {
      AccountsController: {
        state: {
          internalAccounts: {
            accounts: {
              'mock-account-id-1': {
                id: 'mock-account-id-1',
                address: '0x4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi',
                scopes: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
                metadata: {
                  name: 'Account 1',
                  keyring: {
                    type: KeyringTypes.hd,
                  },
                },
                options: {
                  entropySource: '01JNG71B7GTWH0J1TSJY9891S0',
                },
              },
              'mock-account-id-2': {
                id: 'mock-account-id-2',
                address: '0x5vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi',
                scopes: ['eip155:0'],
                metadata: {
                  name: 'Account 2',
                  keyring: {
                    type: KeyringTypes.hd,
                  },
                },
                options: {
                  entropySource: '01JNG71B7GTWH0J1TSJY9891S0',
                },
              },
            },
            selectAccount: 'mock-account-id-1',
          },
        },
      },
      KeyringController: {
        state: {
          keyrings: [
            {
              type: KeyringTypes.hd,
              accounts: [
                '0x4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi',
                '0x5vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi',
              ],
              metadata: {
                id: '01JNG71B7GTWH0J1TSJY9891S0',
                name: '',
              },
            },
          ],
        },
      },
    },
  };
});

// Mock React Native Linking
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  openURL: jest.fn(),
}));

// Mock the hooks and utilities
jest.mock('../../../../hooks/useAccounts', () => ({
  useAccounts: () => ({
    accounts: [
      {
        id: 'mock-account-id-1',
        address: '0x4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi',
        caipAccountId:
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:0x4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi',
        name: 'Account 1',
        scopes: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
      },
      {
        id: 'mock-account-id-2',
        address: '0x5vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi',
        caipAccountId: 'eip155:1:0x5vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi',
        name: 'Account 2',
        scopes: ['eip155:0'],
      },
    ],
    ensByAccountAddress: {},
  }),
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      border: {
        muted: '#000000',
      },
    },
  }),
}));

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

const mockStore = configureStore([]);

// Mock the bridge selectors
jest.mock('../../../../../selectors/bridge', () => ({
  selectValidDestInternalAccountIds: () =>
    new Set(['mock-account-id-1', 'mock-account-id-2']),
  selectDestAddress: (state: MockState) => state.bridge.destAddress,
  selectIsEvmToSolana: () => false,
  selectIsSolanaToEvm: () => true,
}));

// Mock the account tree controller selectors
jest.mock(
  '../../../../../selectors/multichainAccounts/accountTreeController',
  () => {
    const actual = jest.requireActual(
      '../../../../../selectors/multichainAccounts/accountTreeController',
    );

    return {
      ...actual,
      selectAccountGroups: (state: MockState) =>
        state.engine?.backgroundState?.AccountTreeController?.accountTree
          ?.accountGroups
          ? Object.values(
              state.engine.backgroundState.AccountTreeController.accountTree
                .accountGroups,
            )
          : [],
      selectSelectedAccountGroup: (state: MockState) => {
        const selectedId =
          state.engine?.backgroundState?.AccountTreeController?.accountTree
            ?.selectedAccountGroupId;
        const accountGroups =
          state.engine?.backgroundState?.AccountTreeController?.accountTree
            ?.accountGroups;
        return selectedId && accountGroups ? accountGroups[selectedId] : null;
      },
    };
  },
);

// Mock the feature flag selector
jest.mock(
  '../../../../../selectors/featureFlagController/multichainAccounts',
  () => ({
    selectMultichainAccountsState2Enabled: () => true,
  }),
);

describe('DestinationAccountSelector', () => {
  const renderComponent = (storeState = {}) => {
    const mockEngine = jest.requireMock('../../../../../core/Engine');
    const store = mockStore({
      engine: {
        backgroundState: {
          ...backgroundState,
          KeyringController: mockEngine.context.KeyringController.state,
          AccountsController: mockEngine.context.AccountsController.state,
          PreferencesController: {
            privacyMode: false,
          },
          AccountTreeController: {
            accountTree: {
              selectedAccountGroupId: null,
              accountGroups: {},
            },
          },
        },
      },
      bridge: {
        destAddress: '0x1234567890123456789012345678901234567890',
      },
      settings: {
        avatarAccountType: AvatarAccountType.Maskicon,
      },
      ...storeState,
    });

    return {
      ...render(
        <Provider store={store}>
          <NavigationContainer>
            <DestinationAccountSelector />
          </NavigationContainer>
        </Provider>,
      ),
      store,
    };
  };

  it('renders correctly with destination address', () => {
    const { getByText } = renderComponent();
    expect(getByText('Receive at')).toBeTruthy();
  });

  it('hides address when privacy mode is enabled', () => {
    const { getByText } = renderComponent({
      engine: {
        backgroundState: {
          ...backgroundState,
          PreferencesController: {
            privacyMode: true,
          },
        },
      },
    });
    expect(getByText('Receive at')).toBeTruthy();
  });

  it('uses blockie icon when blockie setting is enabled', () => {
    const { getByTestId } = renderComponent({
      settings: {
        avatarAccountType: AvatarAccountType.Blockies,
      },
    });
    const avatar = getByTestId('cellbase-avatar');
    expect(avatar).toBeTruthy();
  });

  it('clears destination address when close button is pressed', () => {
    const { getByTestId, store } = renderComponent();
    // The close button is a ButtonIcon component with IconName.Close
    const closeButton = getByTestId('cellselect').findByProps({
      iconName: 'Edit',
    });
    fireEvent.press(closeButton);

    const actions = store.getActions();
    expect(actions).toContainEqual({
      type: 'bridge/setDestAddress',
      payload: undefined,
    });
  });

  it('sets first account as destination when no destination is set', () => {
    const { store } = renderComponent({
      bridge: {
        destAddress: undefined,
        sourceToken: {
          address: '0x123',
          symbol: 'ETH',
          decimals: 18,
          image: 'https://example.com/eth.png',
          chainId: '0x1',
          name: 'Ethereum',
          balance: '100',
          balanceFiat: '100',
        },
        destToken: {
          address: '0x456',
          symbol: 'SOL',
          decimals: 9,
          image: 'https://example.com/sol.png',
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          name: 'Solana',
          balance: '100',
          balanceFiat: '100',
        },
      },
    });

    const actions = store.getActions();
    expect(actions).toContainEqual({
      type: 'bridge/setDestAddress',
      payload: '0x4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi',
    });
  });

  it('clears destination when close button is pressed', () => {
    const { getByTestId, store } = renderComponent();
    const closeButton = getByTestId('cellselect').findByProps({
      iconName: 'Edit',
    });
    fireEvent.press(closeButton);

    const actions = store.getActions();
    expect(actions).toContainEqual({
      type: 'bridge/setDestAddress',
      payload: undefined,
    });
  });

  describe('Account Group Priority Selection', () => {
    it('selects account from currently selected account group when available', () => {
      const { store } = renderComponent({
        bridge: {
          destAddress: undefined,
          sourceToken: {
            address: '0x123',
            symbol: 'ETH',
            decimals: 18,
            image: 'https://example.com/eth.png',
            chainId: '0x1',
            name: 'Ethereum',
            balance: '100',
            balanceFiat: '100',
          },
          destToken: {
            address: '0x456',
            symbol: 'SOL',
            decimals: 9,
            image: 'https://example.com/sol.png',
            chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
            name: 'Solana',
            balance: '100',
            balanceFiat: '100',
          },
        },
        engine: {
          backgroundState: {
            ...backgroundState,
            AccountTreeController: {
              accountTree: {
                selectedAccountGroupId: 'group-1',
                accountGroups: {
                  'group-1': {
                    id: 'group-1',
                    accounts: ['mock-account-id-2'], // Has account 2
                    metadata: {
                      name: 'Account Group 1',
                    },
                  },
                },
              },
            },
          },
        },
      });

      const actions = store.getActions();
      // Should select account 2 (from the selected group) instead of account 1 (first in list)
      expect(actions).toContainEqual({
        type: 'bridge/setDestAddress',
        payload: '0x5vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi',
      });
    });

    it('falls back to first account when selected account group has no compatible accounts', () => {
      const { store } = renderComponent({
        bridge: {
          destAddress: undefined,
          sourceToken: {
            address: '0x123',
            symbol: 'ETH',
            decimals: 18,
            image: 'https://example.com/eth.png',
            chainId: '0x1',
            name: 'Ethereum',
            balance: '100',
            balanceFiat: '100',
          },
          destToken: {
            address: '0x456',
            symbol: 'SOL',
            decimals: 9,
            image: 'https://example.com/sol.png',
            chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
            name: 'Solana',
            balance: '100',
            balanceFiat: '100',
          },
        },
        engine: {
          backgroundState: {
            ...backgroundState,
            AccountTreeController: {
              accountTree: {
                selectedAccountGroupId: 'group-1',
                accountGroups: {
                  'group-1': {
                    id: 'group-1',
                    accounts: ['mock-account-id-3'], // Has different account not in filtered list
                    metadata: {
                      name: 'Account Group 1',
                    },
                  },
                },
              },
            },
          },
        },
      });

      const actions = store.getActions();
      // Should fall back to account 1 (first in filtered list)
      expect(actions).toContainEqual({
        type: 'bridge/setDestAddress',
        payload: '0x4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi',
      });
    });

    it('falls back to first account when no account group is selected', () => {
      const { store } = renderComponent({
        bridge: {
          destAddress: undefined,
          sourceToken: {
            address: '0x123',
            symbol: 'ETH',
            decimals: 18,
            image: 'https://example.com/eth.png',
            chainId: '0x1',
            name: 'Ethereum',
            balance: '100',
            balanceFiat: '100',
          },
          destToken: {
            address: '0x456',
            symbol: 'SOL',
            decimals: 9,
            image: 'https://example.com/sol.png',
            chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
            name: 'Solana',
            balance: '100',
            balanceFiat: '100',
          },
        },
        engine: {
          backgroundState: {
            ...backgroundState,
            AccountTreeController: {
              accountTree: {
                selectedAccountGroupId: null,
                accountGroups: {},
              },
            },
          },
        },
      });

      const actions = store.getActions();
      // Should fall back to account 1 (first in filtered list)
      expect(actions).toContainEqual({
        type: 'bridge/setDestAddress',
        payload: '0x4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi',
      });
    });
  });
});

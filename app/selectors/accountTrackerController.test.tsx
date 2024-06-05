import React from 'react';
import { Text } from 'react-native';
import { useSelector } from 'react-redux';
import { Store } from 'redux';
import { act } from '@testing-library/react-native';
import { GetByQuery } from '@testing-library/react-native/build/queries/makeQueries';
import { CommonQueryOptions } from '@testing-library/react-native/build/queries/options';
import {
  TextMatch,
  TextMatchOptions,
} from '@testing-library/react-native/build/matches';
import { AccountTrackerState } from '@metamask/assets-controllers';
import { NetworkController } from '@metamask/network-controller';
import { AccountsControllerState } from '@metamask/accounts-controller';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  MOCK_ADDRESS_1,
  MOCK_ADDRESS_2,
  expectedUuid,
} from '../util/test/accountsControllerTestUtils';
import { RootState } from '../reducers';
import {
  selectAccountBalanceByChainId,
  selectAccountsByChainId,
} from './accountTrackerController';
import renderWithProvider from '../util/test/renderWithProvider';
import Engine, { EngineState } from '../core/Engine';
import {
  selectSelectedInternalAccount,
  selectSelectedInternalAccountChecksummedAddress,
} from './accountsController';
import { selectChainId } from './networkController';

const MOCK_CHAIN_ID = '0x1';
const MOCK_CHAIN_ID_2 = '0x2';
const MOCK_BALANCE = '0x11';
const MOCK_BALANCE_2 = '0x22';
const MOCK_BALANCE_3 = '0x33';

// Mock Engine for render tests
jest.mock('../core/Engine', () => ({
  state: {
    NetworkController: {
      providerConfig: {
        chainId: '0x1',
      } as Partial<NetworkController['state']['providerConfig']>,
    } as Partial<NetworkController['state']>,
    AccountsController: {
      internalAccounts: {
        accounts: {
          '30786334-3935-4563-b064-363339643939': {
            address: '0xc4955c0d639d99699bfd7ec54d9fafee40e4d272',
            id: '30786334-3935-4563-b064-363339643939',
            metadata: {
              name: 'Account 1',
              keyring: {
                type: 'HD Key Tree',
              },
            },
            options: {},
            methods: [
              'personal_sign',
              'eth_sign',
              'eth_signTransaction',
              'eth_signTypedData_v1',
              'eth_signTypedData_v3',
              'eth_signTypedData_v4',
            ],
            type: 'eip155:eoa',
          },
          '30786334-3936-4663-b064-363539643939': {
            address: '0xc4966c0d659d99699bfd7eb54d8fafee40e4a756',
            id: '30786334-3936-4663-b064-363539643939',
            metadata: {
              name: 'Account 2',
              keyring: {
                type: 'HD Key Tree',
              },
            },
            options: {},
            methods: [
              'personal_sign',
              'eth_sign',
              'eth_signTransaction',
              'eth_signTypedData_v1',
              'eth_signTypedData_v3',
              'eth_signTypedData_v4',
            ],
            type: 'eip155:eoa',
          },
        },
        selectedAccount: '30786334-3936-4663-b064-363539643939',
      },
    } as Partial<AccountsControllerState>,
    AccountTrackerController: {
      accountsByChainId: {
        '0x1': {
          '0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756': { balance: '0x11' },
          '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272': {
            balance: '0x33',
          },
        },
        '0x2': {
          '0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756': { balance: '0x22' },
        },
      },
    } as Partial<AccountTrackerState>,
  } as EngineState,
}));

describe('selectAccountBalanceByChainId', () => {
  let initialState: RootState;

  beforeEach(() => {
    initialState = {
      engine: {
        backgroundState: {
          NetworkController: {
            providerConfig: {
              chainId: MOCK_CHAIN_ID,
            } as Partial<NetworkController['state']['providerConfig']>,
          } as Partial<NetworkController['state']>,
          AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
          AccountTrackerController: {
            accountsByChainId: {
              [MOCK_CHAIN_ID]: {
                [MOCK_ADDRESS_1]: { balance: MOCK_BALANCE_3 },
                [MOCK_ADDRESS_2]: { balance: MOCK_BALANCE },
              },
              [MOCK_CHAIN_ID_2]: {
                [MOCK_ADDRESS_2]: { balance: MOCK_BALANCE_2 },
              },
            },
          } as Partial<AccountTrackerState>,
        } as EngineState,
      },
    } as RootState;
  });

  it('returns account balance for chain id', () => {
    const result = selectAccountBalanceByChainId(initialState);
    expect(result?.balance).toBe(MOCK_BALANCE);
  });

  it('returns undefined when chain ID is undefined', () => {
    initialState.engine.backgroundState.NetworkController.providerConfig.chainId =
      undefined as unknown as `0x${string}`;
    const result = selectAccountBalanceByChainId(initialState);
    expect(result).toBeUndefined();
  });

  it("returns undefined when balance doesn't exist for chain ID", () => {
    initialState.engine.backgroundState.AccountTrackerController.accountsByChainId =
      {
        '0x99': {
          [MOCK_ADDRESS_2]: { balance: MOCK_BALANCE },
        },
      };
    const result = selectAccountBalanceByChainId(initialState);
    expect(result).toBeUndefined();
  });

  describe('re-renders', () => {
    const mockRenderCall = jest.fn();
    let getByText: GetByQuery<TextMatch, CommonQueryOptions & TextMatchOptions>;
    let store: Store;

    beforeEach(() => {
      mockRenderCall.mockReset();
      // Clear memoized selectors for each test
      selectAccountBalanceByChainId.memoizedResultFunc.clearCache();
      selectAccountsByChainId.memoizedResultFunc.clearCache();
      selectSelectedInternalAccountChecksummedAddress.memoizedResultFunc.clearCache();
      selectChainId.memoizedResultFunc.clearCache();
      selectSelectedInternalAccount.memoizedResultFunc.clearCache();
      const MockComponent = () => {
        const accountBalance = useSelector(selectAccountBalanceByChainId);
        mockRenderCall();
        return <Text>{`Balance ${accountBalance?.balance}`}</Text>;
      };
      const { store: testStore, getByText: testGetByText } = renderWithProvider(
        <MockComponent />,
        {
          state: initialState,
        },
      );
      getByText = testGetByText;
      store = testStore;
    });

    it('re-renders balance when chain ID is updated', async () => {
      expect(mockRenderCall).toHaveBeenCalledTimes(1);
      expect(getByText(`Balance ${MOCK_BALANCE}`)).toBeDefined();
      mockRenderCall.mockReset();

      const originalChainId =
        Engine.state.NetworkController.providerConfig.chainId;
      Engine.state.NetworkController.providerConfig.chainId = MOCK_CHAIN_ID_2;

      act(() => {
        store.dispatch({
          type: 'UPDATE_BG_STATE',
          payload: {
            key: 'NetworkController',
          },
        });
      });

      expect(mockRenderCall).toHaveBeenCalledTimes(1);
      expect(getByText(`Balance ${MOCK_BALANCE_2}`)).toBeDefined();

      // Reset chain ID
      Engine.state.NetworkController.providerConfig.chainId = originalChainId;
    });

    it('re-renders balance when balance is updated', () => {
      expect(mockRenderCall).toHaveBeenCalledTimes(1);
      expect(getByText(`Balance ${MOCK_BALANCE}`)).toBeDefined();
      mockRenderCall.mockReset();

      const originalBalance =
        Engine.state.AccountTrackerController.accountsByChainId[MOCK_CHAIN_ID][
          MOCK_ADDRESS_2
        ].balance;
      Engine.state.AccountTrackerController.accountsByChainId[MOCK_CHAIN_ID][
        MOCK_ADDRESS_2
      ].balance = MOCK_BALANCE_2;

      act(() => {
        store.dispatch({
          type: 'UPDATE_BG_STATE',
          payload: {
            key: 'AccountTrackerController',
          },
        });
      });

      expect(mockRenderCall).toHaveBeenCalledTimes(1);
      expect(getByText(`Balance ${MOCK_BALANCE_2}`)).toBeDefined();

      // Reset balance
      Engine.state.AccountTrackerController.accountsByChainId[MOCK_CHAIN_ID][
        MOCK_ADDRESS_2
      ].balance = originalBalance;
    });

    it('re-renders balance when account is updated', () => {
      expect(mockRenderCall).toHaveBeenCalledTimes(1);
      expect(getByText(`Balance ${MOCK_BALANCE}`)).toBeDefined();
      mockRenderCall.mockReset();

      const originalSelectedAccount =
        Engine.state.AccountsController.internalAccounts.selectedAccount;
      Engine.state.AccountsController.internalAccounts.selectedAccount =
        expectedUuid;

      act(() => {
        store.dispatch({
          type: 'UPDATE_BG_STATE',
          payload: {
            key: 'AccountsController',
          },
        });
      });

      expect(mockRenderCall).toHaveBeenCalledTimes(1);
      expect(getByText(`Balance ${MOCK_BALANCE_3}`)).toBeDefined();

      // Reset account
      Engine.state.AccountsController.internalAccounts.selectedAccount =
        originalSelectedAccount;
    });

    it('does not re-render when chain ID is the same', async () => {
      expect(mockRenderCall).toHaveBeenCalledTimes(1);
      expect(getByText(`Balance ${MOCK_BALANCE}`)).toBeDefined();
      mockRenderCall.mockReset();

      const originalChainId =
        Engine.state.NetworkController.providerConfig.chainId;
      Engine.state.NetworkController.providerConfig.chainId = originalChainId;

      act(() => {
        store.dispatch({
          type: 'UPDATE_BG_STATE',
          payload: {
            key: 'NetworkController',
          },
        });
      });

      expect(mockRenderCall).not.toHaveBeenCalled();
      expect(getByText(`Balance ${MOCK_BALANCE}`)).toBeDefined();
    });

    it('does not re-render when balance is the same', () => {
      expect(mockRenderCall).toHaveBeenCalledTimes(1);
      expect(getByText(`Balance ${MOCK_BALANCE}`)).toBeDefined();
      mockRenderCall.mockReset();

      const originalBalance =
        Engine.state.AccountTrackerController.accountsByChainId[MOCK_CHAIN_ID][
          MOCK_ADDRESS_2
        ].balance;
      Engine.state.AccountTrackerController.accountsByChainId[MOCK_CHAIN_ID][
        MOCK_ADDRESS_2
      ].balance = originalBalance;

      act(() => {
        store.dispatch({
          type: 'UPDATE_BG_STATE',
          payload: {
            key: 'AccountTrackerController',
          },
        });
      });

      expect(mockRenderCall).not.toHaveBeenCalled();
      expect(getByText(`Balance ${MOCK_BALANCE}`)).toBeDefined();
    });

    it('does not re-render when the same account is selected', () => {
      expect(mockRenderCall).toHaveBeenCalledTimes(1);
      expect(getByText(`Balance ${MOCK_BALANCE}`)).toBeDefined();
      mockRenderCall.mockReset();

      const originalSelectedAccount =
        Engine.state.AccountsController.internalAccounts.selectedAccount;
      Engine.state.AccountsController.internalAccounts.selectedAccount =
        originalSelectedAccount;

      act(() => {
        store.dispatch({
          type: 'UPDATE_BG_STATE',
          payload: {
            key: 'AccountsController',
          },
        });
      });

      expect(mockRenderCall).not.toHaveBeenCalled();
      expect(getByText(`Balance ${MOCK_BALANCE}`)).toBeDefined();
    });
  });
});

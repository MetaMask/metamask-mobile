jest.mock('../../../../core/Engine', () => ({
  context: {
    AssetsController: {
      getAssets: jest.fn(),
    },
  },
}));

import { toHex } from '@metamask/controller-utils';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { CHAIN_ID_TO_AAVE_POOL_CONTRACT } from '@metamask/stake-sdk';
import { Hex } from '@metamask/utils';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import useEarnNetworkPolling from './useEarnNetworkPolling';
import { RootState } from '../../../../reducers';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';
import Engine from '../../../../core/Engine';

const LENDING_CHAIN_IDS = Object.keys(CHAIN_ID_TO_AAVE_POOL_CONTRACT).map(
  (chainId) => toEvmCaipChainId(toHex(chainId as Hex)),
);

describe('useEarnNetworkPolling', () => {
  const mockGetAssets = jest.mocked(Engine.context.AssetsController.getAssets);

  const mockSelectedAccount =
    MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts.accounts[
      MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts.selectedAccount
    ];

  const mockState = {
    engine: {
      backgroundState: {
        AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
        AccountTreeController: {
          accountTree: {
            wallets: {
              'keyring:test-wallet': {
                id: 'test-wallet',
                name: 'Test Wallet',
                groups: {
                  'keyring:test-wallet/ethereum': {
                    accounts: [mockSelectedAccount.id],
                  },
                },
              },
            },
          },
          selectedAccountGroup: 'keyring:test-wallet/ethereum',
        },
        PreferencesController: {
          useTokenDetection: true,
        },
      },
    },
  } as unknown as RootState;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAssets.mockResolvedValue({});
  });

  it('force-refreshes assets for the selected account across lending chains', () => {
    renderHookWithProvider(() => useEarnNetworkPolling(), {
      state: mockState,
    });

    expect(mockGetAssets).toHaveBeenCalledWith(
      [mockSelectedAccount],
      expect.objectContaining({
        forceUpdate: true,
        chainIds: expect.arrayContaining(LENDING_CHAIN_IDS),
      }),
    );
  });

  it('does not call getAssets when there is no selected account', () => {
    const stateWithoutAccount = {
      ...mockState,
      engine: {
        ...mockState.engine,
        backgroundState: {
          ...mockState.engine.backgroundState,
          AccountsController: {
            ...MOCK_ACCOUNTS_CONTROLLER_STATE,
            internalAccounts: {
              ...MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts,
              selectedAccount: '',
            },
          },
          AccountTreeController: {
            accountTree: {
              wallets: {},
            },
            selectedAccountGroup: '',
          },
        },
      },
    } as unknown as RootState;

    renderHookWithProvider(() => useEarnNetworkPolling(), {
      state: stateWithoutAccount,
    });

    expect(mockGetAssets).not.toHaveBeenCalled();
  });

  it('handles getAssets errors gracefully', async () => {
    mockGetAssets.mockRejectedValue(new Error('Failed to fetch assets'));

    expect(() => {
      renderHookWithProvider(() => useEarnNetworkPolling(), {
        state: mockState,
      });
    }).not.toThrow();

    // Wait for async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it('should return null', () => {
    const { result } = renderHookWithProvider(() => useEarnNetworkPolling(), {
      state: mockState,
    });

    expect(result.current).toBeNull();
  });
});

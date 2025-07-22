import { toChecksumHexAddress } from '@metamask/controller-utils';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE_WITH_SOLANA,
  internalAccount1,
  internalAccount2,
} from '../../../../../util/test/accountsControllerTestUtils';
import initialRootState from '../../../../../util/test/initial-root-state';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import useChainIdsWithBalance from './useChainIdsWithBalance';

const mockEvmChainId = '0x1';

const initialState = {
  ...initialRootState,
  engine: {
    backgroundState: {
      ...initialRootState.engine.backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE_WITH_SOLANA,
      AccountTrackerController: {
        accountsByChainId: {
          [mockEvmChainId]: {
            [toChecksumHexAddress(internalAccount1.address)]: {
              balance: '0x123',
            },
            [toChecksumHexAddress(internalAccount2.address)]: {
              balance: '0x321',
            },
          },
        },
      },
    },
  },
};

describe('useChainIdsWithBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns EVM chain IDs with balance', () => {
    const { result } = renderHookWithProvider(() => useChainIdsWithBalance(), {
      state: initialState,
    });

    expect(result.current).toEqual(['eip155:1']);
  });

  it('returns an empty array when no EVM chain IDs have balance', () => {
    const stateWithoutBalance = {
      ...initialState,
      engine: {
        backgroundState: {
          ...initialState.engine.backgroundState,
          AccountTrackerController: {
            accountsByChainId: {
              [mockEvmChainId]: {
                [toChecksumHexAddress(internalAccount1.address)]: {
                  balance: '0x0',
                },
                [toChecksumHexAddress(internalAccount2.address)]: {
                  balance: '0x0',
                },
              },
            },
          },
        },
      },
    };

    const { result } = renderHookWithProvider(() => useChainIdsWithBalance(), {
      state: stateWithoutBalance,
    });

    expect(result.current).toEqual([]);
  });
});

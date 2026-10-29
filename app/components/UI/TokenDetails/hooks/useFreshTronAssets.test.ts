import { renderHook, act } from '@testing-library/react-native';
import type { Transaction } from '@metamask/keyring-api';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import Logger from '../../../../util/Logger';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';
import { selectIsAssetsUnifyStateEnabled } from '../../../../selectors/featureFlagController/assetsUnifyState';
import Engine from '../../../../core/Engine';
import { useFreshTronAssets } from './useFreshTronAssets';

const mockGetAssets = jest.fn().mockResolvedValue({});
const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector: (state: Record<string, never>) => unknown) =>
    selector({}),
  ),
}));

jest.mock('../../../../selectors/accountsController', () => ({
  selectSelectedInternalAccount: jest.fn(),
}));

jest.mock(
  '../../../../selectors/featureFlagController/assetsUnifyState',
  () => ({
    selectIsAssetsUnifyStateEnabled: jest.fn(),
  }),
);

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    subscribe: (...args: unknown[]) => mockSubscribe(...args),
    unsubscribe: (...args: unknown[]) => mockUnsubscribe(...args),
  },
  context: {
    AssetsController: {
      getAssets: (...args: unknown[]) => mockGetAssets(...args),
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

const TRON_CHAIN_ID = 'tron:728126428';
const EVM_CHAIN_ID = 'eip155:1';

const tronAccount = {
  id: 'tron-account',
  address: 'TQrY8tryJQ8DUuYncrtJQKAv1tbYB5aqri',
  type: 'tron:eoa',
} as InternalAccount;

const transactionConfirmedHandler = () => {
  const subscribeCall = mockSubscribe.mock.calls.find(
    ([event]) =>
      event === 'MultichainTransactionsController:transactionConfirmed',
  );
  return subscribeCall?.[1] as (transaction: Transaction) => void;
};

const createTransaction = (overrides: Partial<Transaction> = {}): Transaction =>
  ({
    id: 'tx-1',
    chain: TRON_CHAIN_ID,
    account: tronAccount.id,
    status: 'confirmed',
    from: [{ address: tronAccount.address }],
    to: [],
    fees: [],
    events: [],
    type: 'send',
    timestamp: null,
    ...overrides,
  }) as unknown as Transaction;

describe('useFreshTronAssets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (selectSelectedInternalAccount as unknown as jest.Mock).mockReturnValue(
      tronAccount,
    );
    (selectIsAssetsUnifyStateEnabled as unknown as jest.Mock).mockReturnValue(
      true,
    );
  });

  it('force-refreshes tron assets for the selected account bypassing client and server caches', async () => {
    const { result } = renderHook(() => useFreshTronAssets(TRON_CHAIN_ID));

    await act(async () => {
      await result.current();
    });

    expect(mockGetAssets).toHaveBeenCalledTimes(1);
    expect(mockGetAssets).toHaveBeenCalledWith([tronAccount], {
      forceUpdate: true,
      bypassServerCache: true,
      chainIds: [TRON_CHAIN_ID],
    });
  });

  it('returns a stable callback while chain, account and flag stay the same', () => {
    const { result, rerender } = renderHook(() =>
      useFreshTronAssets(TRON_CHAIN_ID),
    );
    const initialCallback = result.current;

    rerender(() => useFreshTronAssets(TRON_CHAIN_ID));

    expect(result.current).toBe(initialCallback);
  });

  it('does nothing for non-tron chains', async () => {
    const { result } = renderHook(() => useFreshTronAssets(EVM_CHAIN_ID));

    await act(async () => {
      await result.current();
    });

    expect(mockGetAssets).not.toHaveBeenCalled();
    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it('does nothing when assets unify state is disabled', () => {
    (selectIsAssetsUnifyStateEnabled as unknown as jest.Mock).mockReturnValue(
      false,
    );
    renderHook(() => useFreshTronAssets(TRON_CHAIN_ID));

    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it('does nothing when there is no selected account', () => {
    (selectSelectedInternalAccount as unknown as jest.Mock).mockReturnValue(
      undefined,
    );
    renderHook(() => useFreshTronAssets(TRON_CHAIN_ID));

    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it('force-refreshes assets when a relevant tron transaction confirms', async () => {
    renderHook(() => useFreshTronAssets(TRON_CHAIN_ID));

    const handler = transactionConfirmedHandler();
    await act(async () => {
      await handler(createTransaction());
    });

    expect(mockGetAssets).toHaveBeenCalledTimes(1);
    expect(mockGetAssets).toHaveBeenCalledWith([tronAccount], {
      forceUpdate: true,
      bypassServerCache: true,
      chainIds: [TRON_CHAIN_ID],
    });
  });

  it('ignores transactions on other chains', async () => {
    renderHook(() => useFreshTronAssets(TRON_CHAIN_ID));

    const handler = transactionConfirmedHandler();
    await act(async () => {
      await handler(createTransaction({ chain: 'solana:mainnet' }));
    });

    expect(mockGetAssets).not.toHaveBeenCalled();
  });

  it('ignores transactions from other accounts', async () => {
    renderHook(() => useFreshTronAssets(TRON_CHAIN_ID));

    const handler = transactionConfirmedHandler();
    await act(async () => {
      await handler(
        createTransaction({
          account: 'other-account-id',
          from: [{ address: 'TOtherAddress' }] as Transaction['from'],
        }),
      );
    });

    expect(mockGetAssets).not.toHaveBeenCalled();
  });

  it('unsubscribes from transaction confirmations when unmounting', () => {
    const { unmount } = renderHook(() => useFreshTronAssets(TRON_CHAIN_ID));

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledWith(
      'MultichainTransactionsController:transactionConfirmed',
      expect.any(Function),
    );
  });

  it('logs when AssetsController.getAssets rejects', async () => {
    mockGetAssets.mockRejectedValueOnce(new Error('network'));
    const { result } = renderHook(() => useFreshTronAssets(TRON_CHAIN_ID));

    await act(async () => {
      await result.current();
    });

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'useFreshTronAssets: AssetsController.getAssets failed',
    );
  });
});

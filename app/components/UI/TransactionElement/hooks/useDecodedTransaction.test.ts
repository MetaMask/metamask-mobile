import { act, renderHook, waitFor } from '@testing-library/react-native';
import decodeTransaction from '../utils';
import useDecodedTransaction from './useDecodedTransaction';
import type { DecodedTransaction } from '../types';

jest.mock('../utils');

const mockDecodeTransaction = jest.mocked(decodeTransaction);

const createDecodedTransaction = (actionKey: string): DecodedTransaction => [
  {
    actionKey,
    value: '1 ETH',
    fiatValue: '$3,000',
  },
  {
    summaryAmount: '1 ETH',
  },
];

const createDeferredDecode = () => {
  let resolve!: (value: DecodedTransaction) => void;
  const promise = new Promise<DecodedTransaction>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
};

describe('useDecodedTransaction', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns decoded transaction data', async () => {
    const decodedTransaction = createDecodedTransaction('Send');
    const swapsTransactions = {};
    mockDecodeTransaction.mockResolvedValue(decodedTransaction);

    const { result } = renderHook(() =>
      useDecodedTransaction({
        props: { tx: { id: 'transaction-id' } },
        txChainId: '0x1',
        swapsTransactions,
        selectedAddress: '0x123',
      }),
    );

    await waitFor(() => {
      expect(result.current).toEqual({
        transactionElement: decodedTransaction[0],
        transactionDetails: decodedTransaction[1],
      });
    });
  });

  it('decodes with the latest props when a dependency changes', async () => {
    const swapsTransactions = {};
    mockDecodeTransaction.mockResolvedValue(createDecodedTransaction('Send'));
    const { rerender } = renderHook(
      ({ txChainId, props }) =>
        useDecodedTransaction({
          props,
          txChainId,
          swapsTransactions,
          selectedAddress: '0x123',
        }),
      {
        initialProps: {
          txChainId: '0x1',
          props: { ticker: 'ETH' },
        },
      },
    );
    await waitFor(() => {
      expect(mockDecodeTransaction).toHaveBeenCalledTimes(1);
    });

    rerender({
      txChainId: '0x89',
      props: { ticker: 'POL' },
    });

    await waitFor(() => {
      expect(mockDecodeTransaction).toHaveBeenLastCalledWith({ ticker: 'POL' });
    });
  });

  it('ignores an older decode result after a newer request resolves', async () => {
    const firstDecode = createDeferredDecode();
    const secondDecode = createDeferredDecode();
    const swapsTransactions = {};
    mockDecodeTransaction
      .mockReturnValueOnce(firstDecode.promise)
      .mockReturnValueOnce(secondDecode.promise);
    const { result, rerender } = renderHook(
      ({ txChainId }) =>
        useDecodedTransaction({
          props: { txChainId },
          txChainId,
          swapsTransactions,
          selectedAddress: '0x123',
        }),
      { initialProps: { txChainId: '0x1' } },
    );
    await waitFor(() => {
      expect(mockDecodeTransaction).toHaveBeenCalledTimes(1);
    });

    rerender({ txChainId: '0x89' });
    const latestTransaction = createDecodedTransaction('Latest');
    await act(async () => {
      secondDecode.resolve(latestTransaction);
      await secondDecode.promise;
    });

    await act(async () => {
      firstDecode.resolve(createDecodedTransaction('Stale'));
      await firstDecode.promise;
    });

    expect(result.current.transactionElement).toEqual(latestTransaction[0]);
  });

  it('ignores a decode result after unmounting', async () => {
    const deferredDecode = createDeferredDecode();
    const swapsTransactions = {};
    mockDecodeTransaction.mockReturnValue(deferredDecode.promise);
    const { unmount } = renderHook(() =>
      useDecodedTransaction({
        props: {},
        txChainId: '0x1',
        swapsTransactions,
        selectedAddress: '0x123',
      }),
    );
    unmount();

    await act(async () => {
      deferredDecode.resolve(createDecodedTransaction('Unmounted'));
      await deferredDecode.promise;
    });

    expect(mockDecodeTransaction).toHaveBeenCalledTimes(1);
  });
});

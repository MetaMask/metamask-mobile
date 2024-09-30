import configureStore from 'redux-mock-store';
import { useSwapConfirmedEvent } from './RootRPCMethodsUI';
import { act } from '@testing-library/react-hooks';
import { renderHookWithProvider } from '../../../util/test/renderWithProvider';

const TRANSACTION_META_ID_MOCK = '04541dc0-2e69-11ef-b995-33aef2c88d1e';

const mockStore = configureStore([]);

function renderUseSwapConfirmedEventHook({
  swapsTransactions,
  trackSwaps,
}: {
  swapsTransactions: any;
  trackSwaps?: jest.Func;
}) {
  const finalTrackSwaps = trackSwaps || jest.fn();

  return renderHookWithProvider(
    () =>
      useSwapConfirmedEvent({
        trackSwaps: finalTrackSwaps,
      }),
    {
      state: {
        engine: {
          backgroundState: {
            TransactionController: {},
          },
        },
      },
    },
  );
}

const mockTrackSwaps = jest.fn();

describe('useSwapConfirmedEvent', () => {
  it('queues transactionMeta ids correctly', () => {
    const { result } = renderUseSwapConfirmedEventHook({
      swapsTransactions: {},
    });

    act(() => {
      result.current.addTransactionMetaIdForListening(TRANSACTION_META_ID_MOCK);
    });

    expect(result.current.transactionMetaIdsForListening).toEqual([
      TRANSACTION_META_ID_MOCK,
    ]);
  });
});

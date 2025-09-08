import { renderHook } from '@testing-library/react-hooks';
import { usePredictOrder } from './usePredictOrder';

// Mock redux state container that tests can mutate between runs
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockState: any = {
  engine: {
    backgroundState: {
      PredictController: {
        activeOrders: {},
      },
    },
  },
};

// Mock react-redux useSelector to evaluate selectors against our mock state
jest.mock('react-redux', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useSelector: jest.fn((selector: any) => selector(mockState)),
}));

describe('usePredictOrder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = {
      engine: {
        backgroundState: {
          PredictController: {
            activeOrders: {},
          },
        },
      },
    };
  });

  it('returns idle state when no transactionId is provided', () => {
    const { result } = renderHook(() => usePredictOrder());

    expect(result.current.status).toBe('idle');
    expect(result.current.currentTxHash).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('returns idle state when PredictController state is missing', () => {
    mockState.engine.backgroundState.PredictController = undefined;

    const { result } = renderHook(() => usePredictOrder('tx-1'));

    expect(result.current.status).toBe('idle');
    expect(result.current.currentTxHash).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('returns order status, hash and error from active order', () => {
    mockState.engine.backgroundState.PredictController.activeOrders['tx-1'] = {
      status: 'pending',
      onchainTradeParams: {
        txMeta: { hash: '0xabc', error: null },
      },
    };

    const { result } = renderHook(() => usePredictOrder('tx-1'));

    expect(result.current.status).toBe('pending');
    expect(result.current.currentTxHash).toBe('0xabc');
    expect(result.current.error).toBeNull();
  });

  it('returns idle state when active order does not exist for id', () => {
    const { result } = renderHook(() => usePredictOrder('missing-id'));

    expect(result.current.status).toBe('idle');
    expect(result.current.currentTxHash).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('returns error from txMeta when present', () => {
    mockState.engine.backgroundState.PredictController.activeOrders['tx-err'] =
      {
        status: 'failed',
        onchainTradeParams: {
          txMeta: { hash: '0xdef', error: 'Something went wrong' },
        },
      };

    const { result } = renderHook(() => usePredictOrder('tx-err'));

    expect(result.current.status).toBe('failed');
    expect(result.current.currentTxHash).toBe('0xdef');
    expect(result.current.error).toBe('Something went wrong');
  });
});

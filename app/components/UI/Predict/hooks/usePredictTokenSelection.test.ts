import { act, renderHook, waitFor } from '@testing-library/react-native';
import { usePredictTokenSelection } from './usePredictTokenSelection';

let mockIsPredictBalanceSelected = true;
let mockSelectedTokenAddress: string | undefined;

jest.mock('./usePredictPaymentToken', () => ({
  usePredictPaymentToken: () => ({
    isPredictBalanceSelected: mockIsPredictBalanceSelected,
    selectedPaymentToken: mockSelectedTokenAddress
      ? { address: mockSelectedTokenAddress }
      : null,
  }),
}));

describe('usePredictTokenSelection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPredictBalanceSelected = true;
    mockSelectedTokenAddress = undefined;
  });

  it('does not call onTokenSelected on initial render', () => {
    const onTokenSelected = jest.fn();

    renderHook(() =>
      usePredictTokenSelection({
        onTokenSelected,
      }),
    );

    expect(onTokenSelected).not.toHaveBeenCalled();
  });

  it('calls onTokenSelected with token args when token selection changes', async () => {
    const onTokenSelected = jest.fn().mockResolvedValue(undefined);
    const { rerender, result } = renderHook(() =>
      usePredictTokenSelection({
        onTokenSelected,
      }),
    );

    mockIsPredictBalanceSelected = false;
    mockSelectedTokenAddress = '0x1234';

    await act(async () => {
      rerender();
    });

    expect(onTokenSelected).toHaveBeenCalledWith('0x1234', '0x1234');
    expect(result.current.shouldPreserveActiveOrderOnUnmountRef.current).toBe(
      true,
    );
  });

  it('passes predict-balance key when predict balance is selected', async () => {
    const onTokenSelected = jest.fn();

    mockIsPredictBalanceSelected = false;
    mockSelectedTokenAddress = '0x1234';

    const { rerender } = renderHook(() =>
      usePredictTokenSelection({
        onTokenSelected,
      }),
    );

    mockIsPredictBalanceSelected = true;
    mockSelectedTokenAddress = undefined;

    await act(async () => {
      rerender();
    });

    expect(onTokenSelected).toHaveBeenCalledWith(null, 'predict-balance');
  });

  it('calls onTokenSelected when selected token changes', async () => {
    const onTokenSelected = jest.fn();
    const { rerender } = renderHook(() =>
      usePredictTokenSelection({
        onTokenSelected,
      }),
    );

    mockIsPredictBalanceSelected = false;
    mockSelectedTokenAddress = '0x1234';

    await act(async () => {
      rerender();
    });

    expect(onTokenSelected).toHaveBeenCalledWith('0x1234', '0x1234');
  });

  it('sets loading while onTokenSelected promise is in progress', async () => {
    let resolveOnTokenSelected: (() => void) | undefined;
    const onTokenSelected = jest.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveOnTokenSelected = resolve;
        }),
    );

    const { rerender, result } = renderHook(() =>
      usePredictTokenSelection({
        onTokenSelected,
      }),
    );

    mockIsPredictBalanceSelected = false;
    mockSelectedTokenAddress = '0x1234';

    await act(async () => {
      rerender();
    });

    await waitFor(() => {
      expect(result.current.isDepositAndOrderLoading).toBe(true);
    });

    await act(async () => {
      resolveOnTokenSelected?.();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.isDepositAndOrderLoading).toBe(false);
    });
  });
});

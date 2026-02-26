import { act, renderHook, waitFor } from '@testing-library/react-native';
import { PredictBuyPreviewParams } from '../types/navigation';
import { usePredictTokenSelection } from './usePredictTokenSelection';

const mockDepositAndOrder = jest.fn();
let mockIsPredictBalanceSelected = true;
let mockSelectedTokenAddress: string | undefined;

jest.mock('./usePredictDepositAndOrder', () => ({
  usePredictDepositAndOrder: () => ({
    depositAndOrder: mockDepositAndOrder,
  }),
}));

jest.mock('./usePredictPaymentToken', () => ({
  usePredictPaymentToken: () => ({
    isPredictBalanceSelected: mockIsPredictBalanceSelected,
    selectedPaymentToken: mockSelectedTokenAddress
      ? { address: mockSelectedTokenAddress }
      : null,
  }),
}));

const market = {
  id: 'market-1',
} as PredictBuyPreviewParams['market'];

const outcome = {
  id: 'outcome-1',
} as PredictBuyPreviewParams['outcome'];

const outcomeToken = {
  id: 'token-1',
} as PredictBuyPreviewParams['outcomeToken'];

describe('usePredictTokenSelection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDepositAndOrder.mockResolvedValue(undefined);
    mockIsPredictBalanceSelected = true;
    mockSelectedTokenAddress = undefined;
  });

  it('does not call depositAndOrder on initial render', () => {
    renderHook(() =>
      usePredictTokenSelection({
        amountUsd: 0,
        isInputFocused: true,
        market,
        outcome,
        outcomeToken,
      }),
    );

    expect(mockDepositAndOrder).not.toHaveBeenCalled();
  });

  it('calls depositAndOrder when non-predict token selection changes', async () => {
    const { rerender, result } = renderHook(() =>
      usePredictTokenSelection({
        amountUsd: 25,
        isInputFocused: false,
        market,
        outcome,
        outcomeToken,
      }),
    );

    mockIsPredictBalanceSelected = false;
    mockSelectedTokenAddress = '0x1234';

    await act(async () => {
      rerender();
    });

    expect(mockDepositAndOrder).toHaveBeenCalledWith({
      market,
      outcome,
      outcomeToken,
      isInputFocused: false,
      amountUsd: 25,
      analyticsProperties: undefined,
    });
    expect(result.current.shouldPreserveActiveOrderOnUnmountRef.current).toBe(
      true,
    );
  });

  it('does not include amountUsd when current amount is 0', async () => {
    const { rerender } = renderHook(() =>
      usePredictTokenSelection({
        amountUsd: 0,
        isInputFocused: true,
        market,
        outcome,
        outcomeToken,
      }),
    );

    mockIsPredictBalanceSelected = false;
    mockSelectedTokenAddress = '0x1234';

    await act(async () => {
      rerender();
    });

    expect(mockDepositAndOrder).toHaveBeenCalledWith({
      market,
      outcome,
      outcomeToken,
      isInputFocused: true,
      analyticsProperties: undefined,
    });
  });

  it('calls onTokenSelected when selected token changes', async () => {
    const onTokenSelected = jest.fn();
    const { rerender } = renderHook(() =>
      usePredictTokenSelection({
        amountUsd: 0,
        isInputFocused: true,
        market,
        outcome,
        outcomeToken,
        onTokenSelected,
      }),
    );

    mockIsPredictBalanceSelected = false;
    mockSelectedTokenAddress = '0x1234';

    await act(async () => {
      rerender();
    });

    expect(onTokenSelected).toHaveBeenCalledTimes(1);
  });

  it('sets loading while depositAndOrder is in progress', async () => {
    let resolveDepositAndOrder: (() => void) | undefined;
    mockDepositAndOrder.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveDepositAndOrder = resolve;
        }),
    );

    const { rerender, result } = renderHook(() =>
      usePredictTokenSelection({
        amountUsd: 25,
        isInputFocused: false,
        market,
        outcome,
        outcomeToken,
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
      resolveDepositAndOrder?.();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.isDepositAndOrderLoading).toBe(false);
    });
  });
});

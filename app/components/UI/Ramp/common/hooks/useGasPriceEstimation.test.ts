import { merge } from 'lodash';
import type { GasFeeState } from '@metamask/gas-fee-controller';
import useGasPriceEstimation from './useGasPriceEstimation';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import initialBackgroundState from '../../../../../util/test/initial-background-state.json';
import Engine from '../../../../../core/Engine';

type DeepPartial<BaseType> = {
  [key in keyof BaseType]?: DeepPartial<BaseType[key]>;
};

jest.mock('../../../../../core/Engine', () => ({
  context: {
    GasFeeController: {
      getGasFeeEstimatesAndStartPolling: jest
        .fn()
        .mockResolvedValue('poll-token'),
      stopPolling: jest.fn(),
      disconnectPoller: jest.fn(),
    },
  },
}));

const mockInitialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
};

function setGasFeeControllerState(
  GasFeeState: DeepPartial<GasFeeState>,

  initialState = mockInitialState,
) {
  return merge({}, initialState, {
    engine: {
      backgroundState: {
        GasFeeController: GasFeeState,
      },
    },
  });
}

describe('useGasPriceEstimation', () => {
  it('should return null if gasLimit is 0', async () => {
    const { result } = renderHookWithProvider(
      () =>
        useGasPriceEstimation({
          gasLimit: 0,
        }),
      {
        state: mockInitialState,
      },
    );
    expect(result.current).toBeNull();
  });

  it('should return null if gasEstimateType is "none"', async () => {
    const { result } = renderHookWithProvider(
      () =>
        useGasPriceEstimation({
          gasLimit: 21000,
        }),
      {
        state: mockInitialState,
      },
    );
    expect(result.current).toBeNull();
  });

  it('should call stopPolling if there is no poll token', async () => {
    Engine.context.GasFeeController.getGasFeeEstimatesAndStartPolling.mockResolvedValueOnce(
      undefined,
    );
    const { result, unmount } = renderHookWithProvider(
      () =>
        useGasPriceEstimation({
          gasLimit: 21000,
        }),
      {
        state: mockInitialState,
      },
    );
    expect(result.current).toBeNull();
    unmount();
    expect(Engine.context.GasFeeController.stopPolling).toHaveBeenCalledTimes(
      1,
    );
  });
  it('should call disconnectPoller', async () => {
    const { result, unmount } = renderHookWithProvider(
      () =>
        useGasPriceEstimation({
          gasLimit: 21000,
        }),
      {
        state: mockInitialState,
      },
    );
    expect(result.current).toBeNull();
    unmount();
    expect(
      Engine.context.GasFeeController.disconnectPoller,
    ).toHaveBeenCalledTimes(1);
  });

  it('should default to 21000 as gasLimit', async () => {
    const { result } = renderHookWithProvider(
      () => useGasPriceEstimation({ estimateRange: 'low' }),
      {
        state: setGasFeeControllerState({
          gasEstimateType: 'eth_gasPrice',
          gasFeeEstimates: {
            gasPrice: '2',
          },
        }),
      },
    );
    expect(result.current?.estimatedGasFee.toString(10)).toEqual(
      `${21000 * 2 * 1e9}`,
    );
  });

  describe('gasEstimateType is "fee-market"', () => {
    it('should return gasPrice if gasEstimateType is "fee-market" without estimateRange', async () => {
      const { result } = renderHookWithProvider(
        () => useGasPriceEstimation({ gasLimit: 21000 }),
        {
          state: setGasFeeControllerState({
            gasEstimateType: 'fee-market',
            gasFeeEstimates: {
              low: {
                suggestedMaxFeePerGas: '1',
              },
              medium: {
                suggestedMaxFeePerGas: '2',
              },
              high: {
                suggestedMaxFeePerGas: '3',
              },
            },
          }),
        },
      );
      expect(result.current?.estimatedGasFee.toString(10)).toEqual(
        `${21000 * 2 * 1e9}`,
      );
    });

    it('should return gasPrice if gasEstimateType is "fee-market" with estimateRange low', async () => {
      const { result } = renderHookWithProvider(
        () => useGasPriceEstimation({ gasLimit: 20000, estimateRange: 'low' }),
        {
          state: setGasFeeControllerState({
            gasEstimateType: 'fee-market',
            gasFeeEstimates: {
              low: {
                suggestedMaxFeePerGas: '1',
              },
            },
          }),
        },
      );
      expect(result.current?.estimatedGasFee.toString(10)).toEqual(
        `${20000 * 1 * 1e9}`,
      );
    });
    it('should return gasPrice if gasEstimateType is "fee-market" with estimateRange medium', async () => {
      const { result } = renderHookWithProvider(
        () =>
          useGasPriceEstimation({ gasLimit: 20000, estimateRange: 'medium' }),
        {
          state: setGasFeeControllerState({
            gasEstimateType: 'fee-market',
            gasFeeEstimates: {
              medium: {
                suggestedMaxFeePerGas: '2',
              },
            },
          }),
        },
      );
      expect(result.current?.estimatedGasFee.toString(10)).toEqual(
        `${20000 * 2 * 1e9}`,
      );
    });

    it('should return gasPrice if gasEstimateType is "fee-market" with estimateRange high', async () => {
      const { result } = renderHookWithProvider(
        () => useGasPriceEstimation({ gasLimit: 20000, estimateRange: 'high' }),
        {
          state: setGasFeeControllerState({
            gasEstimateType: 'fee-market',
            gasFeeEstimates: {
              high: {
                suggestedMaxFeePerGas: '3',
              },
            },
          }),
        },
      );
      expect(result.current?.estimatedGasFee.toString(10)).toEqual(
        `${20000 * 3 * 1e9}`,
      );
    });
  });

  describe('gasEstimateType is "legacy"', () => {
    it('should return gasPrice if gasEstimateType is "legacy" without estimateRange', async () => {
      const { result } = renderHookWithProvider(
        () => useGasPriceEstimation({ gasLimit: 1000 }),
        {
          state: setGasFeeControllerState({
            gasEstimateType: 'legacy',
            gasFeeEstimates: {
              low: '1',
              medium: '2',
              high: '3',
            },
          }),
        },
      );
      expect(result.current?.estimatedGasFee.toString(10)).toEqual(
        `${1000 * 2 * 1e9}`,
      );
    });

    it('should return gasPrice if gasEstimateType is "legacy" with estimateRange low', async () => {
      const { result } = renderHookWithProvider(
        () => useGasPriceEstimation({ gasLimit: 1000, estimateRange: 'low' }),
        {
          state: setGasFeeControllerState({
            gasEstimateType: 'legacy',
            gasFeeEstimates: {
              low: '1',
            },
          }),
        },
      );
      expect(result.current?.estimatedGasFee.toString(10)).toEqual(
        `${1000 * 1 * 1e9}`,
      );
    });

    it('should return gasPrice if gasEstimateType is "legacy" with estimateRange medium', async () => {
      const { result } = renderHookWithProvider(
        () =>
          useGasPriceEstimation({ gasLimit: 1000, estimateRange: 'medium' }),
        {
          state: setGasFeeControllerState({
            gasEstimateType: 'legacy',
            gasFeeEstimates: {
              medium: '2',
            },
          }),
        },
      );
      expect(result.current?.estimatedGasFee.toString(10)).toEqual(
        `${1000 * 2 * 1e9}`,
      );
    });

    it('should return gasPrice if gasEstimateType is "legacy" with estimateRange high', async () => {
      const { result } = renderHookWithProvider(
        () => useGasPriceEstimation({ gasLimit: 1000, estimateRange: 'high' }),
        {
          state: setGasFeeControllerState({
            gasEstimateType: 'legacy',
            gasFeeEstimates: {
              high: '3',
            },
          }),
        },
      );
      expect(result.current?.estimatedGasFee.toString(10)).toEqual(
        `${1000 * 3 * 1e9}`,
      );
    });
  });

  describe('gasEstimateType is "eth_gasPrice"', () => {
    it('should return gasPrice if gasEstimateType is "eth_gasPrice" without estimateRange', async () => {
      const { result } = renderHookWithProvider(
        () => useGasPriceEstimation({ gasLimit: 1000 }),
        {
          state: setGasFeeControllerState({
            gasEstimateType: 'eth_gasPrice',
            gasFeeEstimates: {
              gasPrice: '2',
            },
          }),
        },
      );
      expect(result.current?.estimatedGasFee.toString(10)).toEqual(
        `${1000 * 2 * 1e9}`,
      );
    });
  });
});

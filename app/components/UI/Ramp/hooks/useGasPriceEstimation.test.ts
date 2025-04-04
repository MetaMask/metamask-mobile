import { merge } from 'lodash';
import type { GasFeeState } from '@metamask/gas-fee-controller';
import useGasPriceEstimation from './useGasPriceEstimation';
import {
  DeepPartial,
  renderHookWithProvider,
} from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import Engine from '../../../../core/Engine';

jest.mock('../../../../core/Engine', () => ({
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
    backgroundState,
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

const gWeiToWeiConversionRate = 1e9;

describe('useGasPriceEstimation', () => {
  it('should return null if gasLimit is 0', async () => {
    // gasLimit is 0 when the Build Quote view is used by the Buy flow instead of the sell flow.
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
    Engine.context.GasFeeController.getGasFeeEstimatesAndStartPolling(
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
    const gasPrice = 2;
    const defaultGasLimit = 21000;
    const { result } = renderHookWithProvider(
      () => useGasPriceEstimation({ estimateRange: 'low' }),
      {
        state: setGasFeeControllerState({
          gasEstimateType: 'eth_gasPrice',
          gasFeeEstimates: {
            gasPrice: `${gasPrice}`,
          },
        }),
      },
    );
    expect(result.current?.estimatedGasFee.toString(10)).toEqual(
      `${defaultGasLimit * gasPrice * gWeiToWeiConversionRate}`,
    );
  });

  describe('gasEstimateType is "fee-market"', () => {
    it('should return gasPrice if gasEstimateType is "fee-market" using medium estimate range if not provided', async () => {
      const gasLimit = 21000;
      const lowSuggestedMaxFeePerGas = 1;
      const mediumSuggestedMaxFeePerGas = 2;
      const highSuggestedMaxFeePerGas = 3;
      const { result } = renderHookWithProvider(
        () => useGasPriceEstimation({ gasLimit }),
        {
          state: setGasFeeControllerState({
            gasEstimateType: 'fee-market',
            gasFeeEstimates: {
              low: {
                suggestedMaxFeePerGas: `${lowSuggestedMaxFeePerGas}`,
              },
              medium: {
                suggestedMaxFeePerGas: `${mediumSuggestedMaxFeePerGas}`,
              },
              high: {
                suggestedMaxFeePerGas: `${highSuggestedMaxFeePerGas}`,
              },
            },
          }),
        },
      );
      expect(result.current?.estimatedGasFee.toString(10)).toEqual(
        `${gasLimit * mediumSuggestedMaxFeePerGas * gWeiToWeiConversionRate}`,
      );
    });

    it('should return gasPrice if gasEstimateType is "fee-market" with estimateRange low', async () => {
      const gasLimit = 20000;
      const lowSuggestedMaxFeePerGas = 1;
      const { result } = renderHookWithProvider(
        () => useGasPriceEstimation({ gasLimit, estimateRange: 'low' }),
        {
          state: setGasFeeControllerState({
            gasEstimateType: 'fee-market',
            gasFeeEstimates: {
              low: {
                suggestedMaxFeePerGas: `${lowSuggestedMaxFeePerGas}`,
              },
            },
          }),
        },
      );
      expect(result.current?.estimatedGasFee.toString(10)).toEqual(
        `${gasLimit * lowSuggestedMaxFeePerGas * gWeiToWeiConversionRate}`,
      );
    });
    it('should return gasPrice if gasEstimateType is "fee-market" with estimateRange medium', async () => {
      const gasLimit = 20000;
      const mediumSuggestedMaxFeePerGas = 2;
      const { result } = renderHookWithProvider(
        () => useGasPriceEstimation({ gasLimit, estimateRange: 'medium' }),
        {
          state: setGasFeeControllerState({
            gasEstimateType: 'fee-market',
            gasFeeEstimates: {
              medium: {
                suggestedMaxFeePerGas: `${mediumSuggestedMaxFeePerGas}`,
              },
            },
          }),
        },
      );
      expect(result.current?.estimatedGasFee.toString(10)).toEqual(
        `${gasLimit * mediumSuggestedMaxFeePerGas * gWeiToWeiConversionRate}`,
      );
    });

    it('should return gasPrice if gasEstimateType is "fee-market" with estimateRange high', async () => {
      const gasLimit = 20000;
      const highSuggestedMaxFeePerGas = 3;
      const { result } = renderHookWithProvider(
        () => useGasPriceEstimation({ gasLimit, estimateRange: 'high' }),
        {
          state: setGasFeeControllerState({
            gasEstimateType: 'fee-market',
            gasFeeEstimates: {
              high: {
                suggestedMaxFeePerGas: `${highSuggestedMaxFeePerGas}`,
              },
            },
          }),
        },
      );
      expect(result.current?.estimatedGasFee.toString(10)).toEqual(
        `${gasLimit * highSuggestedMaxFeePerGas * gWeiToWeiConversionRate}`,
      );
    });
  });

  describe('gasEstimateType is "legacy"', () => {
    it('should return gasPrice if gasEstimateType is "legacy" using medium estimate range if not provided', async () => {
      const gasLimit = 1000;
      const lowGasPrice = 1;
      const mediumGasPrice = 2;
      const highGasPrice = 3;
      const { result } = renderHookWithProvider(
        () => useGasPriceEstimation({ gasLimit }),
        {
          state: setGasFeeControllerState({
            gasEstimateType: 'legacy',
            gasFeeEstimates: {
              low: `${lowGasPrice}`,
              medium: `${mediumGasPrice}`,
              high: `${highGasPrice}`,
            },
          }),
        },
      );
      expect(result.current?.estimatedGasFee.toString(10)).toEqual(
        `${gasLimit * mediumGasPrice * gWeiToWeiConversionRate}`,
      );
    });

    it('should return gasPrice if gasEstimateType is "legacy" with estimateRange low', async () => {
      const gasLimit = 1000;
      const lowGasPrice = 1;
      const { result } = renderHookWithProvider(
        () => useGasPriceEstimation({ gasLimit: 1000, estimateRange: 'low' }),
        {
          state: setGasFeeControllerState({
            gasEstimateType: 'legacy',
            gasFeeEstimates: {
              low: `${lowGasPrice}`,
            },
          }),
        },
      );
      expect(result.current?.estimatedGasFee.toString(10)).toEqual(
        `${gasLimit * lowGasPrice * gWeiToWeiConversionRate}`,
      );
    });

    it('should return gasPrice if gasEstimateType is "legacy" with estimateRange medium', async () => {
      const gasLimit = 1000;
      const mediumGasPrice = 2;
      const { result } = renderHookWithProvider(
        () => useGasPriceEstimation({ gasLimit, estimateRange: 'medium' }),
        {
          state: setGasFeeControllerState({
            gasEstimateType: 'legacy',
            gasFeeEstimates: {
              medium: `${mediumGasPrice}`,
            },
          }),
        },
      );
      expect(result.current?.estimatedGasFee.toString(10)).toEqual(
        `${gasLimit * mediumGasPrice * gWeiToWeiConversionRate}`,
      );
    });

    it('should return gasPrice if gasEstimateType is "legacy" with estimateRange high', async () => {
      const gasLimit = 1000;
      const highGasPrice = 3;
      const { result } = renderHookWithProvider(
        () => useGasPriceEstimation({ gasLimit, estimateRange: 'high' }),
        {
          state: setGasFeeControllerState({
            gasEstimateType: 'legacy',
            gasFeeEstimates: {
              high: `${highGasPrice}`,
            },
          }),
        },
      );
      expect(result.current?.estimatedGasFee.toString(10)).toEqual(
        `${gasLimit * highGasPrice * gWeiToWeiConversionRate}`,
      );
    });
  });

  describe('gasEstimateType is "eth_gasPrice"', () => {
    it('should return gasPrice if gasEstimateType is "eth_gasPrice" without estimateRange', async () => {
      const gasLimit = 1000;
      const gasPrice = 2;
      const { result } = renderHookWithProvider(
        () => useGasPriceEstimation({ gasLimit }),
        {
          state: setGasFeeControllerState({
            gasEstimateType: 'eth_gasPrice',
            gasFeeEstimates: {
              gasPrice: `${gasPrice}`,
            },
          }),
        },
      );
      expect(result.current?.estimatedGasFee.toString(10)).toEqual(
        `${gasLimit * gasPrice * gWeiToWeiConversionRate}`,
      );
    });
  });
});

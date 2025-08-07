import { renderHookWithProvider } from '../../../../../../util/test/renderWithProvider';
import {
  evmSendStateMock,
  TOKEN_ADDRESS_MOCK_1,
} from '../../../__mocks__/send.mock';
import {
  GasFeeEstimatesType,
  getEstimatedTotalGas,
  GetMaxValueArgs,
  getMaxValueFn,
  useEvmMaxAmount,
} from './useEvmMaxAmount';

jest.mock('../../gas/useGasFeeEstimates', () => ({
  useGasFeeEstimates: () => ({
    gasFeeEstimates: { medium: { suggestedMaxFeePerGas: 1.5 } },
  }),
}));

const mockState = {
  state: evmSendStateMock,
};

const getMaxFnArguments = (params: Record<string, unknown>) => ({
  accounts: { [TOKEN_ADDRESS_MOCK_1]: { balance: '0x3635C9ADC5DEA00000' } },
  asset: {},
  contractBalances: { '0x111': '0x3B9ACA00' },
  from: TOKEN_ADDRESS_MOCK_1,
  gasFeeEstimates: {
    medium: { suggestedMaxFeePerGas: 1.5 },
  },
  ...params,
});

describe('getEstimatedTotalGas', () => {
  it('return max gas that may be needed for native transfer', () => {
    expect(
      getEstimatedTotalGas({
        medium: { suggestedMaxFeePerGas: 1.5 },
      }).toNumber(),
    ).toStrictEqual(31500000000000);
  });

  it('return 0 if not gas estimates are passed', () => {
    expect(
      getEstimatedTotalGas(
        undefined as unknown as GasFeeEstimatesType,
      ).toNumber(),
    ).toStrictEqual(0);
  });
});

describe('getMaxValueFn', () => {
  it('return default if no asset is passed', () => {
    expect(
      getMaxValueFn(
        getMaxFnArguments({ asset: undefined }) as unknown as GetMaxValueArgs,
      ),
    ).toStrictEqual({ balance: '0', maxAmount: '0' });
  });

  it('return correct value for native token', () => {
    expect(
      getMaxValueFn(
        getMaxFnArguments({
          asset: {
            isNative: true,
            chainId: '0x1',
          },
        }) as unknown as GetMaxValueArgs,
      ),
    ).toStrictEqual({ balance: '1000', maxAmount: '999.9999685' });
  });

  it('return correct value for ERC20 token', () => {
    expect(
      getMaxValueFn(
        getMaxFnArguments({
          asset: {
            address: '0x111',
            decimals: 2,
          },
        }) as unknown as GetMaxValueArgs,
      ),
    ).toStrictEqual({ balance: '10000000', maxAmount: '10000000' });
  });
});

describe('useEvmMaxAmount', () => {
  it('return function getEvmMaxAmount', () => {
    const { result } = renderHookWithProvider(
      () => useEvmMaxAmount(),
      mockState,
    );
    expect(result.current.getEvmMaxAmount).toBeDefined();
  });
});

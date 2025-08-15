import { backgroundState } from '../../../../../util/test/initial-root-state';
import {
  ProviderValues,
  renderHookWithProvider,
} from '../../../../../util/test/renderWithProvider';
import useMaxAmount, {
  GasFeeEstimatesType,
  getEstimatedTotalGas,
  GetMaxValueArgs,
  getMaxValueFn,
} from './useMaxAmount';

jest.mock('../gas/useGasFeeEstimates', () => ({
  useGasFeeEstimates: () => ({
    gasFeeEstimates: { medium: { suggestedMaxFeePerGas: 1.5 } },
  }),
}));

const mockState = {
  state: {
    engine: {
      backgroundState: {
        ...backgroundState,
        AccountsController: {
          internalAccounts: {
            selectedAccount: 'evm-account-id',
            accounts: {
              'evm-account-id': {
                id: 'evm-account-id',
                type: 'eip155:eoa',
                address: '0x12345',
                metadata: {},
              },
            },
          },
        },
        TokenBalancesController: {
          tokenBalances: {
            '0x12345': {
              '0x1': {
                '0x123': '0x5',
              },
            },
          },
        },
        AccountTrackerController: {
          accountsByChainId: {
            '0x1': {
              '0x12345': {
                balance: '0xDE0B6B3A7640000',
              },
            },
          },
        },
      },
    },
  },
};

const getMaxFnArguments = (params: Record<string, unknown>) => ({
  accounts: { '0x123': { balance: '0x3635C9ADC5DEA00000' } },
  asset: {},
  contractBalances: { '0x111': '0x3B9ACA00' },
  from: '0x123',
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
  it('return 0 if no asset is passed', () => {
    expect(
      getMaxValueFn(
        getMaxFnArguments({ asset: undefined }) as unknown as GetMaxValueArgs,
      ),
    ).toStrictEqual('0');
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
    ).toStrictEqual('999.9999685');
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
    ).toStrictEqual('10000000');
  });
});

describe('useMaxAmount', () => {
  it('return function updateToMaxAmount', () => {
    const { result } = renderHookWithProvider(
      () => useMaxAmount(),
      mockState as ProviderValues,
    );
    expect(result.current.updateToMaxAmount).toBeDefined();
  });
});

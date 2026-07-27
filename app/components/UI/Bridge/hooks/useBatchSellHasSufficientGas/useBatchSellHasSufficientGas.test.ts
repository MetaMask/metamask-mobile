import { BigNumber } from 'ethers';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useLatestBalance } from '../useLatestBalance';
import { useBatchSellHasSufficientGas } from './index';

jest.mock('../useLatestBalance');

type BatchSellNetworkFee = Parameters<
  typeof useBatchSellHasSufficientGas
>[0]['networkFee'];

const feeAsset: NonNullable<BatchSellNetworkFee['asset']> = {
  address: '0x0000000000000000000000000000000000000000',
  assetId: 'eip155:1/slip44:60',
  chainId: 1,
  decimals: 18,
  name: 'Ethereum',
  symbol: 'ETH',
};

const createNetworkFee = (
  overrides: Partial<BatchSellNetworkFee> = {},
): BatchSellNetworkFee => ({
  amount: '0.001',
  usd: null,
  valueInCurrency: '3.25',
  asset: feeAsset,
  formatted: '0.001 ETH',
  formattedFiat: '$3.25',
  ...overrides,
});

describe('useBatchSellHasSufficientGas', () => {
  const mockUseLatestBalance = useLatestBalance as jest.MockedFunction<
    typeof useLatestBalance
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when the fee token balance covers the batch sell network fee', () => {
    mockUseLatestBalance.mockReturnValue({
      displayBalance: '0.01',
      atomicBalance: BigNumber.from('10000000000000000'),
    });

    const { result } = renderHookWithProvider(
      () =>
        useBatchSellHasSufficientGas({
          isGasless: false,
          networkFee: createNetworkFee({ amount: '0.001' }),
        }),
      { state: {} },
    );

    expect(result.current).toBe(true);
    expect(mockUseLatestBalance).toHaveBeenCalledWith({
      address: feeAsset.address,
      chainId: '0x1',
      decimals: feeAsset.decimals,
    });
  });

  it('returns false when the fee token balance is below the batch sell network fee', () => {
    mockUseLatestBalance.mockReturnValue({
      displayBalance: '0.001',
      atomicBalance: BigNumber.from('1000000000000000'),
    });

    const { result } = renderHookWithProvider(
      () =>
        useBatchSellHasSufficientGas({
          isGasless: false,
          networkFee: createNetworkFee({ amount: '0.01' }),
        }),
      { state: {} },
    );

    expect(result.current).toBe(false);
  });

  it('handles scientific notation in the batch sell network fee', () => {
    mockUseLatestBalance.mockReturnValue({
      displayBalance: '0.001',
      atomicBalance: BigNumber.from('1000000000000000'),
    });

    const { result } = renderHookWithProvider(
      () =>
        useBatchSellHasSufficientGas({
          isGasless: false,
          networkFee: createNetworkFee({ amount: '9.200359292e-8' }),
        }),
      { state: {} },
    );

    expect(result.current).toBe(true);
  });

  it('returns null when the batch sell network fee is missing', () => {
    mockUseLatestBalance.mockReturnValue({
      displayBalance: '0.01',
      atomicBalance: BigNumber.from('10000000000000000'),
    });

    const { result } = renderHookWithProvider(
      () =>
        useBatchSellHasSufficientGas({
          isGasless: false,
          networkFee: createNetworkFee({ amount: undefined }),
        }),
      { state: {} },
    );

    expect(result.current).toBe(null);
  });

  it('returns null when the fee token balance is missing', () => {
    mockUseLatestBalance.mockReturnValue(undefined);

    const { result } = renderHookWithProvider(
      () =>
        useBatchSellHasSufficientGas({
          isGasless: false,
          networkFee: createNetworkFee(),
        }),
      { state: {} },
    );

    expect(result.current).toBe(null);
  });

  it('returns true when the batch sell quotes are gasless', () => {
    mockUseLatestBalance.mockReturnValue(undefined);

    const { result } = renderHookWithProvider(
      () =>
        useBatchSellHasSufficientGas({
          isGasless: true,
          networkFee: createNetworkFee({ amount: undefined, asset: undefined }),
        }),
      { state: {} },
    );

    expect(result.current).toBe(true);
  });
});

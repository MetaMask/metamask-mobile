import {
  GasFeeEstimateType,
  GasFeeEstimateLevel,
  TransactionParams,
} from '@metamask/transaction-controller';
import {
  getMediumGasPriceHex,
  addTenPercentAndRound,
  getMediumEstimateGwei,
  getMediumPriorityFeeGwei,
  gasEstimateGreaterThanGasUsedPlusTenPercent,
} from './gas';
import { selectGasFeeEstimates } from '../../selectors/confirmTransaction';

jest.mock('../conversions', () => ({
  decGWEIToHexWEI: jest.fn((value: string) => {
    if (value === '0') return '0';
    const dec = Number(value);
    return dec.toString(16);
  }),
}));

jest.mock('../number', () => ({
  addHexPrefix: jest.fn((str: string) =>
    str && !String(str).startsWith('0x') ? `0x${str}` : str,
  ),
}));

const mockDecGWEIToHexWEI = jest.requireMock('../conversions').decGWEIToHexWEI;
const mockAddHexPrefix = jest.requireMock('../number').addHexPrefix;

describe('getMediumGasPriceHex', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockAddHexPrefix as jest.Mock).mockImplementation((str: string) =>
      str && !String(str).startsWith('0x') ? `0x${str}` : str,
    );
    (mockDecGWEIToHexWEI as jest.Mock).mockImplementation((value: string) => {
      if (value === '0') return '0';
      const dec = Number(value);
      return dec.toString(16);
    });
  });

  it('returns 0x-prefixed zero when gasFeeEstimates is null', () => {
    const result = getMediumGasPriceHex(null);

    expect(mockDecGWEIToHexWEI).toHaveBeenCalledWith('0');
    expect(mockAddHexPrefix).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('returns 0x-prefixed zero when gasFeeEstimates is undefined', () => {
    const result = getMediumGasPriceHex(undefined);

    expect(mockDecGWEIToHexWEI).toHaveBeenCalledWith('0');
    expect(result).toBeDefined();
  });

  it('uses FeeMarket type and medium suggestedMaxFeePerGas', () => {
    const estimates = {
      type: GasFeeEstimateType.FeeMarket,
      [GasFeeEstimateLevel.Medium]: { suggestedMaxFeePerGas: '25' },
    };

    const result = getMediumGasPriceHex(estimates);

    expect(mockDecGWEIToHexWEI).toHaveBeenCalledWith('25');
    expect(mockAddHexPrefix).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('uses Legacy type and medium value', () => {
    const estimates = {
      type: GasFeeEstimateType.Legacy,
      [GasFeeEstimateLevel.Medium]: '20',
    };

    const result = getMediumGasPriceHex(estimates);

    expect(mockDecGWEIToHexWEI).toHaveBeenCalledWith('20');
    expect(result).toBeDefined();
  });

  it('uses GasPrice type gasPrice', () => {
    const estimates = {
      type: GasFeeEstimateType.GasPrice,
      gasPrice: '15',
    };

    const result = getMediumGasPriceHex(estimates);

    expect(mockDecGWEIToHexWEI).toHaveBeenCalledWith('15');
    expect(result).toBeDefined();
  });

  it('uses default 0 for unknown type', () => {
    const estimates = {
      type: 'Unknown',
    } as Parameters<typeof getMediumGasPriceHex>[0];

    const result = getMediumGasPriceHex(estimates);

    expect(mockDecGWEIToHexWEI).toHaveBeenCalledWith('0');
    expect(result).toBeDefined();
  });

  it('uses legacy shape medium.suggestedMaxFeePerGas when type is missing', () => {
    const estimates = {
      medium: { suggestedMaxFeePerGas: '30' },
    };

    const result = getMediumGasPriceHex(estimates);

    expect(mockDecGWEIToHexWEI).toHaveBeenCalledWith('30');
    expect(result).toBeDefined();
  });

  it('uses legacy shape medium as string when type is missing', () => {
    const estimates = {
      medium: '22',
    };

    const result = getMediumGasPriceHex(estimates);

    expect(mockDecGWEIToHexWEI).toHaveBeenCalledWith('22');
    expect(result).toBeDefined();
  });

  it('uses gasPrice fallback when type is missing and medium not object', () => {
    const estimates = {
      gasPrice: '10',
    };

    const result = getMediumGasPriceHex(estimates);

    expect(mockDecGWEIToHexWEI).toHaveBeenCalledWith('10');
    expect(result).toBeDefined();
  });

  it('returns 0x-prefixed zero when no usable estimate', () => {
    const result = getMediumGasPriceHex({});

    expect(mockDecGWEIToHexWEI).toHaveBeenCalledWith('0');
    expect(result).toBeDefined();
  });
});

describe('addTenPercentAndRound', () => {
  it('returns undefined when input is undefined', () => {
    expect(addTenPercentAndRound(undefined)).toBeUndefined();
  });

  it('returns undefined when input is empty string', () => {
    expect(addTenPercentAndRound('')).toBeUndefined();
  });

  it('bumps a hex wei value by 10% and rounds down', () => {
    // 100 decimal = 0x64; 100 * 1.1 = 110 = 0x6e
    const result = addTenPercentAndRound('0x64');
    expect(result).toBe('0x6e');
  });

  it('rounds fractional result down to integer', () => {
    // 15 decimal = 0xf; 15 * 1.1 = 16.5 -> floor = 16 = 0x10
    const result = addTenPercentAndRound('0xf');
    expect(result).toBe('0x10');
  });

  it('handles large values', () => {
    // 0x59682f10 = 1500000016 decimal; * 1.1 = 1650000017.6 -> floor = 1650000017 = 0x62590091
    const result = addTenPercentAndRound('0x59682f10');
    expect(result).toBe('0x62590091');
  });
});

describe('getMediumEstimateGwei', () => {
  it('returns undefined for null estimates', () => {
    expect(getMediumEstimateGwei(null)).toBeUndefined();
  });

  it('returns undefined for undefined estimates', () => {
    expect(getMediumEstimateGwei(undefined)).toBeUndefined();
  });

  it('extracts suggestedMaxFeePerGas from FeeMarket type', () => {
    const estimates = {
      type: GasFeeEstimateType.FeeMarket,
      [GasFeeEstimateLevel.Medium]: { suggestedMaxFeePerGas: '25' },
    };
    expect(getMediumEstimateGwei(estimates)).toBe('25');
  });

  it('extracts medium value from Legacy type', () => {
    const estimates = {
      type: GasFeeEstimateType.Legacy,
      [GasFeeEstimateLevel.Medium]: '20',
    };
    expect(getMediumEstimateGwei(estimates)).toBe('20');
  });

  it('extracts gasPrice from GasPrice type', () => {
    const estimates = {
      type: GasFeeEstimateType.GasPrice,
      gasPrice: '15',
    };
    expect(getMediumEstimateGwei(estimates)).toBe('15');
  });

  it('extracts from untyped object shape with suggestedMaxFeePerGas', () => {
    const estimates = {
      medium: { suggestedMaxFeePerGas: '30' },
    };
    expect(getMediumEstimateGwei(estimates)).toBe('30');
  });

  it('extracts from untyped string shape', () => {
    const estimates = { medium: '22' };
    expect(getMediumEstimateGwei(estimates)).toBe('22');
  });

  it('falls back to gasPrice when medium is not available', () => {
    const estimates = { gasPrice: '10' };
    expect(getMediumEstimateGwei(estimates)).toBe('10');
  });

  it('returns undefined when no usable estimate', () => {
    expect(getMediumEstimateGwei({})).toBeUndefined();
  });
});

describe('getMediumPriorityFeeGwei', () => {
  it('returns undefined for null estimates', () => {
    expect(getMediumPriorityFeeGwei(null)).toBeUndefined();
  });

  it('returns undefined for undefined estimates', () => {
    expect(getMediumPriorityFeeGwei(undefined)).toBeUndefined();
  });

  it('extracts suggestedMaxPriorityFeePerGas from FeeMarket typed medium', () => {
    const estimates = {
      type: GasFeeEstimateType.FeeMarket,
      [GasFeeEstimateLevel.Medium]: {
        suggestedMaxFeePerGas: '25',
        suggestedMaxPriorityFeePerGas: '2',
      },
    };
    expect(getMediumPriorityFeeGwei(estimates)).toBe('2');
  });

  it('returns undefined from FeeMarket typed medium when priority is absent', () => {
    const estimates = {
      type: GasFeeEstimateType.FeeMarket,
      [GasFeeEstimateLevel.Medium]: { suggestedMaxFeePerGas: '25' },
    };
    expect(getMediumPriorityFeeGwei(estimates)).toBeUndefined();
  });

  it('returns undefined for Legacy type', () => {
    const estimates = {
      type: GasFeeEstimateType.Legacy,
      [GasFeeEstimateLevel.Medium]: '20',
    };
    expect(getMediumPriorityFeeGwei(estimates)).toBeUndefined();
  });

  it('returns undefined for GasPrice type', () => {
    const estimates = {
      type: GasFeeEstimateType.GasPrice,
      gasPrice: '15',
    };
    expect(getMediumPriorityFeeGwei(estimates)).toBeUndefined();
  });

  it('extracts from untyped fee-market object with both max and priority', () => {
    const estimates = {
      medium: {
        suggestedMaxFeePerGas: '30',
        suggestedMaxPriorityFeePerGas: '1.5',
      },
    };
    expect(getMediumPriorityFeeGwei(estimates)).toBe('1.5');
  });

  it('returns undefined for untyped legacy string medium', () => {
    const estimates = { medium: '22' };
    expect(getMediumPriorityFeeGwei(estimates)).toBeUndefined();
  });

  it('returns undefined when untyped medium object has only max fee', () => {
    const estimates = {
      medium: { suggestedMaxFeePerGas: '30' },
    };
    expect(getMediumPriorityFeeGwei(estimates)).toBeUndefined();
  });
});

describe('gasEstimateGreaterThanGasUsedPlusTenPercent', () => {
  it('returns true when EIP-1559 medium estimate exceeds bumped maxFeePerGas', () => {
    // maxFeePerGas = 0x59682f10 = 1500000016 wei ≈ 1.500000016 GWEI
    // bumped = 1.500000016 * 1.1 ≈ 1.650000018 GWEI
    // medium suggestedMaxFeePerGas = 70 GWEI -> 70 > ~1.65 -> true
    const txParams = {
      maxFeePerGas: '0x59682f10',
      maxPriorityFeePerGas: '0x59682f00',
    } as unknown as TransactionParams;
    const estimates = {
      medium: { suggestedMaxFeePerGas: '70' },
    } as ReturnType<typeof selectGasFeeEstimates>;
    expect(
      gasEstimateGreaterThanGasUsedPlusTenPercent(txParams, estimates),
    ).toBe(true);
  });

  it('returns false when EIP-1559 medium estimate is below bumped maxFeePerGas', () => {
    const txParams = {
      maxFeePerGas: '0x59682f10',
      maxPriorityFeePerGas: '0x59682f00',
    } as unknown as TransactionParams;
    const estimates = {
      medium: { suggestedMaxFeePerGas: '1' },
    } as unknown as ReturnType<typeof selectGasFeeEstimates>;
    expect(
      gasEstimateGreaterThanGasUsedPlusTenPercent(txParams, estimates),
    ).toBe(false);
  });

  it('returns false when txParams has no maxFeePerGas and no gasPrice', () => {
    const txParams = { gas: '0x5208' } as unknown as TransactionParams;
    const estimates = {
      medium: { suggestedMaxFeePerGas: '70' },
    } as unknown as ReturnType<typeof selectGasFeeEstimates>;
    expect(
      gasEstimateGreaterThanGasUsedPlusTenPercent(txParams, estimates),
    ).toBe(false);
  });

  it('returns true with legacy gasPrice when medium is higher', () => {
    const txParams = { gasPrice: '0x59682f10' } as unknown as TransactionParams;
    const estimates = { medium: '70' } as unknown as ReturnType<
      typeof selectGasFeeEstimates
    >;
    expect(
      gasEstimateGreaterThanGasUsedPlusTenPercent(txParams, estimates),
    ).toBe(true);
  });

  it('returns false with legacy gasPrice when medium is lower', () => {
    const txParams = { gasPrice: '0x59682f10' } as unknown as TransactionParams;
    const estimates = { medium: '1' } as unknown as ReturnType<
      typeof selectGasFeeEstimates
    >;
    expect(
      gasEstimateGreaterThanGasUsedPlusTenPercent(txParams, estimates),
    ).toBe(false);
  });

  it('returns false when gasFeeEstimates is null', () => {
    const txParams = {
      maxFeePerGas: '0x59682f10',
    } as unknown as TransactionParams;
    expect(gasEstimateGreaterThanGasUsedPlusTenPercent(txParams, null)).toBe(
      false,
    );
  });

  it('handles fee-market estimates with legacy txParams', () => {
    const txParams = { gasPrice: '0x59682f10' } as unknown as TransactionParams;
    const estimates = {
      medium: { suggestedMaxFeePerGas: '70' },
    } as unknown as ReturnType<typeof selectGasFeeEstimates>;
    expect(
      gasEstimateGreaterThanGasUsedPlusTenPercent(txParams, estimates),
    ).toBe(true);
  });
});

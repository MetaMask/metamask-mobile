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
  getGasValuesForReplacement,
  normalizeReplacementGasFeeParams,
  type GasFeeEstimatesInput,
} from './gas';

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

const ESTIMATES_FEE_MARKET = {
  type: GasFeeEstimateType.FeeMarket,
  [GasFeeEstimateLevel.Medium]: { suggestedMaxFeePerGas: '25' },
};

const ESTIMATES_FEE_MARKET_WITH_PRIORITY = {
  type: GasFeeEstimateType.FeeMarket,
  [GasFeeEstimateLevel.Medium]: {
    suggestedMaxFeePerGas: '25',
    suggestedMaxPriorityFeePerGas: '2',
  },
};

const ESTIMATES_LEGACY = {
  type: GasFeeEstimateType.Legacy,
  [GasFeeEstimateLevel.Medium]: '20',
};

const ESTIMATES_GAS_PRICE = {
  type: GasFeeEstimateType.GasPrice,
  gasPrice: '15',
};

const ESTIMATES_UNTYPED_FEE_MARKET = {
  medium: { suggestedMaxFeePerGas: '30' },
};

const ESTIMATES_UNTYPED_FEE_MARKET_WITH_PRIORITY = {
  medium: {
    suggestedMaxFeePerGas: '30',
    suggestedMaxPriorityFeePerGas: '1.5',
  },
};

const ESTIMATES_UNTYPED_STRING = { medium: '22' };
const ESTIMATES_GAS_PRICE_FALLBACK = { gasPrice: '10' };

const EIP1559_TX_PARAMS = {
  maxFeePerGas: '0x59682f10',
  maxPriorityFeePerGas: '0x59682f00',
} as unknown as TransactionParams;

const LEGACY_TX_PARAMS = {
  gasPrice: '0x59682f10',
} as unknown as TransactionParams;

const HIGH_FEE_MARKET_ESTIMATE = {
  medium: { suggestedMaxFeePerGas: '70' },
} as GasFeeEstimatesInput;

const LOW_FEE_MARKET_ESTIMATE = {
  medium: { suggestedMaxFeePerGas: '1' },
} as GasFeeEstimatesInput;

const toHex = (n: number) => `0x${n.toString(16)}`;

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

  it.each([
    [toHex(100), toHex(110), '100 -> 110'],
    [toHex(15), toHex(16), '15 -> 16 (fractional floor)'],
    [toHex(1_500_000_016), toHex(1_650_000_017), 'large value'],
  ])('bumps %s to %s (%s)', (input, expected) => {
    expect(addTenPercentAndRound(input)).toBe(expected);
  });
});

describe('getMediumEstimateGwei', () => {
  it.each([
    ['null', null, undefined],
    ['undefined', undefined, undefined],
    ['FeeMarket typed', ESTIMATES_FEE_MARKET, '25'],
    ['Legacy typed', ESTIMATES_LEGACY, '20'],
    ['GasPrice typed', ESTIMATES_GAS_PRICE, '15'],
    ['untyped fee-market object', ESTIMATES_UNTYPED_FEE_MARKET, '30'],
    ['untyped string', ESTIMATES_UNTYPED_STRING, '22'],
    ['gasPrice fallback', ESTIMATES_GAS_PRICE_FALLBACK, '10'],
    ['empty object', {}, undefined],
  ] as const)(
    'returns expected value for %s estimates',
    (_, estimates, expected) => {
      expect(getMediumEstimateGwei(estimates)).toBe(expected);
    },
  );
});

describe('getMediumPriorityFeeGwei', () => {
  it.each([
    ['null', null, undefined],
    ['undefined', undefined, undefined],
    ['FeeMarket with priority', ESTIMATES_FEE_MARKET_WITH_PRIORITY, '2'],
    ['FeeMarket without priority', ESTIMATES_FEE_MARKET, undefined],
    ['Legacy typed', ESTIMATES_LEGACY, undefined],
    ['GasPrice typed', ESTIMATES_GAS_PRICE, undefined],
    [
      'untyped with priority',
      ESTIMATES_UNTYPED_FEE_MARKET_WITH_PRIORITY,
      '1.5',
    ],
    ['untyped string', ESTIMATES_UNTYPED_STRING, undefined],
    ['untyped max-fee only', ESTIMATES_UNTYPED_FEE_MARKET, undefined],
  ] as const)(
    'returns expected value for %s estimates',
    (_, estimates, expected) => {
      expect(getMediumPriorityFeeGwei(estimates)).toBe(expected);
    },
  );
});

describe('normalizeReplacementGasFeeParams', () => {
  it('returns a legacy gas price object without unexpected properties', () => {
    const result = normalizeReplacementGasFeeParams({
      legacyGasFee: {
        gasPrice: '0x123',
      },
    });

    expect(result).toEqual({
      gasPrice: '0x123',
    });
  });

  it('returns an eip1559 gas object when both fee fields are present', () => {
    const result = normalizeReplacementGasFeeParams({
      eip1559GasFee: {
        maxFeePerGas: '0x456',
        maxPriorityFeePerGas: '0x789',
      },
    });

    expect(result).toEqual({
      maxFeePerGas: '0x456',
      maxPriorityFeePerGas: '0x789',
    });
  });

  it('returns undefined for incomplete eip1559 gas fees', () => {
    const result = normalizeReplacementGasFeeParams({
      eip1559GasFee: {
        maxFeePerGas: '0x456',
      },
    });

    expect(result).toBeUndefined();
  });
});

describe('gasEstimateGreaterThanGasUsedPlusTenPercent', () => {
  it.each([
    [
      'EIP-1559 high estimate',
      EIP1559_TX_PARAMS,
      HIGH_FEE_MARKET_ESTIMATE,
      true,
    ],
    [
      'EIP-1559 low estimate',
      EIP1559_TX_PARAMS,
      LOW_FEE_MARKET_ESTIMATE,
      false,
    ],
    [
      'no gas fields',
      { gas: '0x5208' } as unknown as TransactionParams,
      HIGH_FEE_MARKET_ESTIMATE,
      false,
    ],
    [
      'legacy high',
      LEGACY_TX_PARAMS,
      { medium: '70' } as GasFeeEstimatesInput,
      true,
    ],
    [
      'legacy low',
      LEGACY_TX_PARAMS,
      { medium: '1' } as GasFeeEstimatesInput,
      false,
    ],
    ['null estimates', EIP1559_TX_PARAMS, null, false],
    [
      'fee-market est + legacy tx',
      LEGACY_TX_PARAMS,
      HIGH_FEE_MARKET_ESTIMATE,
      true,
    ],
  ] as const)('%s', (_, txParams, estimates, expected) => {
    expect(
      gasEstimateGreaterThanGasUsedPlusTenPercent(txParams, estimates),
    ).toBe(expected);
  });
});

describe('getGasValuesForReplacement', () => {
  const RATE = 1.1;

  it.each([
    [
      'previousGas is undefined',
      { maxFeePerGas: toHex(16), maxPriorityFeePerGas: toHex(2) },
      undefined,
    ],
    [
      'previousGas is null',
      { maxFeePerGas: toHex(16), maxPriorityFeePerGas: toHex(2) },
      null,
    ],
  ] as const)(
    'returns gasValues unchanged when %s',
    (_, gasValues, previousGas) => {
      expect(getGasValuesForReplacement(gasValues, previousGas, RATE)).toBe(
        gasValues,
      );
    },
  );

  it('returns undefined when gasValues is undefined', () => {
    const previousGas = {
      maxFeePerGas: toHex(16),
      maxPriorityFeePerGas: toHex(2),
    };
    expect(
      getGasValuesForReplacement(undefined, previousGas, RATE),
    ).toBeUndefined();
  });

  describe('EIP-1559 flow', () => {
    it('keeps user values when both exceed previousGas × rate', () => {
      const previousGas = {
        maxFeePerGas: toHex(100),
        maxPriorityFeePerGas: toHex(50),
      };
      const gasValues = {
        maxFeePerGas: toHex(1000),
        maxPriorityFeePerGas: toHex(500),
      };
      const result = getGasValuesForReplacement(gasValues, previousGas, RATE);
      expect(result).toEqual({
        maxFeePerGas: toHex(1000),
        maxPriorityFeePerGas: toHex(500),
      });
    });

    it('clamps maxPriorityFeePerGas up when below previousGas × rate', () => {
      const previousGas = {
        maxFeePerGas: toHex(100),
        maxPriorityFeePerGas: toHex(100),
      };
      const gasValues = {
        maxFeePerGas: toHex(1000),
        maxPriorityFeePerGas: toHex(5),
      };
      const result = getGasValuesForReplacement(gasValues, previousGas, RATE);
      expect(result).toEqual({
        maxFeePerGas: toHex(1000),
        maxPriorityFeePerGas: toHex(110), // ceil(100 × 1.1)
      });
    });

    it('clamps maxFeePerGas up when below previousGas × rate', () => {
      const previousGas = {
        maxFeePerGas: toHex(1000),
        maxPriorityFeePerGas: toHex(50),
      };
      const gasValues = {
        maxFeePerGas: toHex(100),
        maxPriorityFeePerGas: toHex(500),
      };
      const result = getGasValuesForReplacement(gasValues, previousGas, RATE);
      expect(result).toEqual({
        maxFeePerGas: toHex(1100), // ceil(1000 × 1.1)
        maxPriorityFeePerGas: toHex(500),
      });
    });

    it('clamps both fields when both are below replacement minimum', () => {
      const previousGas = {
        maxFeePerGas: toHex(1000),
        maxPriorityFeePerGas: toHex(100),
      };
      const gasValues = {
        maxFeePerGas: toHex(1),
        maxPriorityFeePerGas: toHex(1),
      };
      const result = getGasValuesForReplacement(gasValues, previousGas, RATE);
      expect(result).toEqual({
        maxFeePerGas: toHex(1100),
        maxPriorityFeePerGas: toHex(110),
      });
    });

    it('passes through when previousGas has no maxFeePerGas', () => {
      const previousGas = { gasLimit: toHex(21000) };
      const gasValues = {
        maxFeePerGas: toHex(1),
        maxPriorityFeePerGas: toHex(1),
      };
      expect(getGasValuesForReplacement(gasValues, previousGas, RATE)).toEqual(
        gasValues,
      );
    });
  });

  describe('Legacy (gasPrice) flow', () => {
    it('keeps user gasPrice when it exceeds previousGas × rate', () => {
      const previousGas = { gasPrice: toHex(100) };
      const gasValues = { gasPrice: toHex(1000) };
      const result = getGasValuesForReplacement(gasValues, previousGas, RATE);
      expect(result).toEqual({ gasPrice: toHex(1000) });
    });

    it('clamps gasPrice up when below previousGas × rate', () => {
      const previousGas = { gasPrice: toHex(100) };
      const gasValues = { gasPrice: toHex(5) };
      const result = getGasValuesForReplacement(gasValues, previousGas, RATE);
      expect(result).toEqual({ gasPrice: toHex(110) }); // ceil(100 × 1.1)
    });

    it('passes through when previousGas has no gasPrice', () => {
      const previousGas = { gasLimit: toHex(21000) };
      const gasValues = { gasPrice: toHex(5) };
      expect(getGasValuesForReplacement(gasValues, previousGas, RATE)).toEqual(
        gasValues,
      );
    });
  });
});

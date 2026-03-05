import {
  GasFeeEstimateType,
  GasFeeEstimateLevel,
} from '@metamask/transaction-controller';
import { getMediumGasPriceHex } from './gas';

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

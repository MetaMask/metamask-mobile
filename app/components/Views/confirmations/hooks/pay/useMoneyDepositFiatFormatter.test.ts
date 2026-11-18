import { BigNumber } from 'bignumber.js';
import { renderHook } from '@testing-library/react-native';
import useFiatFormatter from '../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import {
  normalizeUsdFiatString,
  useMoneyDepositFiatFormatter,
} from './useMoneyDepositFiatFormatter';

jest.mock('../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter');

describe('normalizeUsdFiatString', () => {
  it('replaces US$, $US, and USD with $ and strips whitespace after $', () => {
    expect(normalizeUsdFiatString('US$\u00a0104,00')).toBe('$104,00');
    expect(normalizeUsdFiatString('US$\u202f0,52')).toBe('$0,52');
    expect(normalizeUsdFiatString('US$ 100')).toBe('$100');
    expect(normalizeUsdFiatString('USD 104,00')).toBe('$104,00');
    expect(normalizeUsdFiatString('100,50 $US')).toBe('100,50 $');
    expect(normalizeUsdFiatString('$\u00a0-104,00')).toBe('$-104,00');
  });
});

describe('useMoneyDepositFiatFormatter', () => {
  const useFiatFormatterMock = jest.mocked(useFiatFormatter);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates to useFiatFormatter with usd currency and normalizes the output', () => {
    const innerFormatter = jest.fn(() => 'US$\u00a01.000,00');
    useFiatFormatterMock.mockReturnValue(innerFormatter);

    const { result } = renderHook(() =>
      useMoneyDepositFiatFormatter({ fractionDigits: 2 }),
    );

    expect(useFiatFormatterMock).toHaveBeenCalledWith({
      currency: 'usd',
      fractionDigits: 2,
    });
    expect(result.current(new BigNumber(1000))).toBe('$1.000,00');
  });
});

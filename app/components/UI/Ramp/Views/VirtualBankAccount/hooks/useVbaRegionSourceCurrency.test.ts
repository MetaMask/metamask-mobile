import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { selectGeolocationLocation } from '../../../../../../selectors/geolocationController';
import {
  selectMoneyMovementNeobank,
  type MoneyMovementNeobankRollout,
} from '../../../../../../selectors/featureFlagController/moneyAccount';
import { useVbaRegionSourceCurrency } from './useVbaRegionSourceCurrency';

jest.mock('react-redux');
jest.mock('../../../../../../selectors/geolocationController');
jest.mock('../../../../../../selectors/featureFlagController/moneyAccount');

const mockUseSelector = jest.mocked(useSelector);
const mockSelectGeolocationLocation = jest.mocked(selectGeolocationLocation);
const mockSelectMoneyMovementNeobank = jest.mocked(selectMoneyMovementNeobank);

const makeRollout = (
  overrides: Partial<MoneyMovementNeobankRollout> = {},
): MoneyMovementNeobankRollout => ({
  isEnabled: true,
  regions: ['BR', 'US'],
  regionCurrencies: { BR: 'BRL' },
  defaultCurrency: 'USD',
  chooseCurrency: false,
  regionOverride: undefined,
  ...overrides,
});

describe('useVbaRegionSourceCurrency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector) =>
      selector(undefined as never),
    );
    mockSelectGeolocationLocation.mockReturnValue('BR');
    mockSelectMoneyMovementNeobank.mockReturnValue(makeRollout());
  });

  it('returns undefined when chooseCurrency is on', () => {
    mockSelectMoneyMovementNeobank.mockReturnValue(
      makeRollout({ chooseCurrency: true }),
    );

    const { result } = renderHook(() => useVbaRegionSourceCurrency());

    expect(result.current).toBeUndefined();
  });

  it('returns the currency mapped from the IP location', () => {
    const { result } = renderHook(() => useVbaRegionSourceCurrency());

    expect(result.current).toBe('BRL');
  });

  it('uses the region override ahead of the IP location', () => {
    mockSelectMoneyMovementNeobank.mockReturnValue(
      makeRollout({ regionOverride: 'US' }),
    );

    const { result } = renderHook(() => useVbaRegionSourceCurrency());

    expect(result.current).toBe('USD');
  });

  it('returns undefined when the location is not an enabled region', () => {
    mockSelectGeolocationLocation.mockReturnValue('FR');

    const { result } = renderHook(() => useVbaRegionSourceCurrency());

    expect(result.current).toBeUndefined();
  });
});

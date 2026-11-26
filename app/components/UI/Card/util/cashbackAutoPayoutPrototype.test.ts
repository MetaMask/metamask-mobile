import { act, renderHook } from '@testing-library/react-native';
import {
  IS_CASHBACK_AUTO_PAYOUT_PROTOTYPE_ENABLED,
  setCashbackAutoPayoutPrototype,
  setCashbackRingPrototype,
  useCashbackAutoPayoutPrototype,
  useCashbackRingPrototype,
} from './cashbackAutoPayoutPrototype';

describe('cashbackAutoPayoutPrototype', () => {
  afterEach(() => {
    act(() => {
      setCashbackAutoPayoutPrototype(false);
      setCashbackRingPrototype(false);
    });
  });

  it('is enabled in development builds only', () => {
    expect(IS_CASHBACK_AUTO_PAYOUT_PROTOTYPE_ENABLED).toBe(__DEV__);
  });

  it.each([
    [
      'auto payout',
      useCashbackAutoPayoutPrototype,
      setCashbackAutoPayoutPrototype,
    ],
    ['ring layout', useCashbackRingPrototype, setCashbackRingPrototype],
  ])('%s starts off and follows its toggle', (_name, useValue, setValue) => {
    const { result } = renderHook(() => useValue());
    expect(result.current).toBe(false);

    act(() => setValue(true));
    expect(result.current).toBe(IS_CASHBACK_AUTO_PAYOUT_PROTOTYPE_ENABLED);

    act(() => setValue(false));
    expect(result.current).toBe(false);
  });

  it('keeps the two toggles independent', () => {
    const autoPayout = renderHook(() => useCashbackAutoPayoutPrototype());
    const ring = renderHook(() => useCashbackRingPrototype());

    act(() => setCashbackRingPrototype(true));

    expect(autoPayout.result.current).toBe(false);
    expect(ring.result.current).toBe(IS_CASHBACK_AUTO_PAYOUT_PROTOTYPE_ENABLED);
  });
});

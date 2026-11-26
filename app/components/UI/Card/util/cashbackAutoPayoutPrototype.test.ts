import { act, renderHook } from '@testing-library/react-native';
import {
  IS_CASHBACK_AUTO_PAYOUT_PROTOTYPE_ENABLED,
  setCashbackAutoPayoutPrototype,
  useCashbackAutoPayoutPrototype,
} from './cashbackAutoPayoutPrototype';

describe('cashbackAutoPayoutPrototype', () => {
  afterEach(() => {
    act(() => setCashbackAutoPayoutPrototype(false));
  });

  it('is enabled in development builds only', () => {
    expect(IS_CASHBACK_AUTO_PAYOUT_PROTOTYPE_ENABLED).toBe(__DEV__);
  });

  it('starts off and follows the toggle', () => {
    const { result } = renderHook(() => useCashbackAutoPayoutPrototype());
    expect(result.current).toBe(false);

    act(() => setCashbackAutoPayoutPrototype(true));
    expect(result.current).toBe(IS_CASHBACK_AUTO_PAYOUT_PROTOTYPE_ENABLED);

    act(() => setCashbackAutoPayoutPrototype(false));
    expect(result.current).toBe(false);
  });
});

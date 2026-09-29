import { renderHook } from '@testing-library/react-native';
import { useHeadlessRampProps } from './useHeadlessRampProps';
import { getSession } from './sessionRegistry';

jest.mock('./sessionRegistry', () => ({
  getSession: jest.fn(() => undefined),
}));

const getSessionMock = jest.mocked(getSession);

describe('useHeadlessRampProps', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSessionMock.mockReturnValue(undefined);
  });

  it('returns the UB2 / DEPOSIT defaults with no surface when there is no session id', () => {
    const { result } = renderHook(() => useHeadlessRampProps(undefined));

    expect(result.current.headlessRampProps).toEqual({
      ramp_type: 'UNIFIED_BUY_2',
    });
    expect(result.current.headlessDepositRampProps).toEqual({
      ramp_type: 'DEPOSIT',
    });
    // No session lookup happens for non-headless traffic.
    expect(getSessionMock).toHaveBeenCalledWith(undefined);
  });

  it('flips both variants to HEADLESS with the seeded rampSurface when a headless session is present', () => {
    getSessionMock.mockReturnValue({
      id: 'hs-1',
      status: 'continued',
      params: { rampSurface: 'money_account' },
    } as never);

    const { result } = renderHook(() => useHeadlessRampProps('hs-1'));

    expect(result.current.headlessRampProps).toEqual({
      ramp_type: 'HEADLESS',
      ramp_surface: 'money_account',
    });
    expect(result.current.headlessDepositRampProps).toEqual({
      ramp_type: 'HEADLESS',
      ramp_surface: 'money_account',
    });
    expect(getSessionMock).toHaveBeenCalledWith('hs-1');
  });

  it('keeps prop object identity stable across re-renders with the same session id', () => {
    getSessionMock.mockReturnValue({
      id: 'hs-3',
      status: 'continued',
      params: { rampSurface: 'perps' },
    } as never);

    const { result, rerender } = renderHook(
      (sessionId: string) => useHeadlessRampProps(sessionId),
      { initialProps: 'hs-3' },
    );

    const first = result.current;
    rerender('hs-3');

    expect(result.current.headlessRampProps).toBe(first.headlessRampProps);
    expect(result.current.headlessDepositRampProps).toBe(
      first.headlessDepositRampProps,
    );
  });
});

import { renderHook } from '@testing-library/react-native';
import { useIsPlusSubscriber, usePlusAccess } from './usePlusAccess';
import {
  MoneyAccountPlusAccess,
  useMoneyAccountPlusAccess,
} from './useMoneyAccountPlusAccess';

jest.mock('./useMoneyAccountPlusAccess', () => ({
  ...jest.requireActual('./useMoneyAccountPlusAccess'),
  useMoneyAccountPlusAccess: jest.fn(),
}));

const mockUseMoneyAccountPlusAccess = jest.mocked(useMoneyAccountPlusAccess);

describe('useIsPlusSubscriber', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    {
      access: MoneyAccountPlusAccess.Subscriber,
      expected: true,
    },
    {
      access: MoneyAccountPlusAccess.Eligible,
      expected: false,
    },
    {
      access: MoneyAccountPlusAccess.Disabled,
      expected: false,
    },
    {
      access: MoneyAccountPlusAccess.Unknown,
      expected: false,
    },
  ])(
    'returns $expected when Plus access is $access',
    ({ access, expected }) => {
      mockUseMoneyAccountPlusAccess.mockReturnValue(access);

      const { result } = renderHook(() => useIsPlusSubscriber());

      expect(result.current).toBe(expected);
    },
  );
});

describe('usePlusAccess', () => {
  it('marks unresolved access as unknown rather than subscribed', () => {
    mockUseMoneyAccountPlusAccess.mockReturnValue(
      MoneyAccountPlusAccess.Unknown,
    );

    const { result } = renderHook(() => usePlusAccess());

    expect(result.current).toEqual({
      isPlusSubscriber: false,
      isPlusAccessUnknown: true,
    });
  });
});

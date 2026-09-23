import { renderHook } from '@testing-library/react-native';
import { useIsProSubscriber, useProAccess } from './useIsProSubscriber';
import {
  MoneyAccountPlusAccess,
  useMoneyAccountPlusAccess,
} from './useMoneyAccountPlusAccess';

jest.mock('./useMoneyAccountPlusAccess', () => ({
  ...jest.requireActual('./useMoneyAccountPlusAccess'),
  useMoneyAccountPlusAccess: jest.fn(),
}));

const mockUseMoneyAccountPlusAccess = jest.mocked(useMoneyAccountPlusAccess);

describe('useIsProSubscriber', () => {
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

      const { result } = renderHook(() => useIsProSubscriber());

      expect(result.current).toBe(expected);
    },
  );
});

describe('useProAccess', () => {
  it('marks unresolved access as unknown rather than subscribed', () => {
    mockUseMoneyAccountPlusAccess.mockReturnValue(
      MoneyAccountPlusAccess.Unknown,
    );

    const { result } = renderHook(() => useProAccess());

    expect(result.current).toEqual({
      isProSubscriber: false,
      isProAccessUnknown: true,
    });
  });
});

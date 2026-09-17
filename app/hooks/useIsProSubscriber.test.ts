import { renderHook } from '@testing-library/react-native';
import { useIsProSubscriber } from './useIsProSubscriber';
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
  ])(
    'returns $expected when Plus access is $access',
    ({ access, expected }) => {
      mockUseMoneyAccountPlusAccess.mockReturnValue(access);

      const { result } = renderHook(() => useIsProSubscriber());

      expect(result.current).toBe(expected);
    },
  );
});

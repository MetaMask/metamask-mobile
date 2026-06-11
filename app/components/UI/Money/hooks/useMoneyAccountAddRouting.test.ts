import { renderHook, act } from '@testing-library/react-hooks';
import { useMoneyAccountDeposit } from './useMoneyAccount';
import { useMoneyAccountAddRouting } from './useMoneyAccountAddRouting';

jest.mock('./useMoneyAccount', () => ({
  useMoneyAccountDeposit: jest.fn(),
}));

const mockedUseMoneyAccountDeposit = useMoneyAccountDeposit as jest.Mock;

const mockInitiateDeposit = jest.fn(() => Promise.resolve());

describe('useMoneyAccountAddRouting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseMoneyAccountDeposit.mockReturnValue({
      initiateDeposit: mockInitiateDeposit,
    });
  });

  describe('routeAddMoney', () => {
    it('calls initiateDeposit with no options', async () => {
      const { result } = renderHook(() => useMoneyAccountAddRouting());

      await act(async () => {
        await result.current.routeAddMoney();
      });

      expect(mockInitiateDeposit).toHaveBeenCalledTimes(1);
      expect(mockInitiateDeposit).toHaveBeenCalledWith();
    });

    it('swallows initiateDeposit failures', async () => {
      mockInitiateDeposit.mockRejectedValueOnce(new Error('boom'));

      const { result } = renderHook(() => useMoneyAccountAddRouting());

      await expect(result.current.routeAddMoney()).resolves.toBeUndefined();
    });
  });
});

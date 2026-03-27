import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { usePredictActiveOrder } from './usePredictActiveOrder';
import { ActiveOrderState } from '../types';

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      clearActiveOrder: jest.fn(),
      clearOrderError: jest.fn(),
      initializeOrder: jest.fn(),
    },
  },
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectSelectedAccountGroupId: jest.fn(() => 'selected-account-group-id'),
  }),
);

jest.mock('../utils/accounts', () => ({
  getEvmAccountFromSelectedAccountGroup: jest.fn(() => ({
    address: '0x123',
  })),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

describe('usePredictActiveOrder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector) => {
      if (typeof selector === 'function') {
        return selector({
          engine: {
            backgroundState: {
              PredictController: {
                activeOrders: {
                  '0x123': {
                    state: ActiveOrderState.PREVIEW,
                  },
                },
              },
            },
          },
        });
      }

      return undefined;
    });
  });

  describe('clearOrderError', () => {
    it('delegates to PredictController.clearOrderError', () => {
      const { result } = renderHook(() => usePredictActiveOrder());

      act(() => {
        result.current.clearOrderError();
      });

      expect(
        Engine.context.PredictController.clearOrderError,
      ).toHaveBeenCalled();
    });
  });

  describe('return values', () => {
    it('returns activeOrder from useSelector', () => {
      const mockActiveOrder = {
        state: ActiveOrderState.PREVIEW,
      };
      mockUseSelector.mockImplementation((selector) => {
        if (typeof selector === 'function') {
          return selector({
            engine: {
              backgroundState: {
                PredictController: {
                  activeOrders: {
                    '0x123': mockActiveOrder,
                  },
                },
              },
            },
          });
        }

        return undefined;
      });

      const { result } = renderHook(() => usePredictActiveOrder());

      expect(result.current.activeOrder).toEqual(mockActiveOrder);
    });

    it('returns isDepositing when active order is depositing', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (typeof selector === 'function') {
          return selector({
            engine: {
              backgroundState: {
                PredictController: {
                  activeOrders: {
                    '0x123': {
                      state: ActiveOrderState.DEPOSITING,
                    },
                  },
                },
              },
            },
          });
        }

        return undefined;
      });

      const { result } = renderHook(() => usePredictActiveOrder());

      expect(result.current.isDepositing).toBe(true);
      expect(result.current.isPlacingOrder).toBe(true);
    });

    it('returns isPlacingOrder when active order is placing order', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (typeof selector === 'function') {
          return selector({
            engine: {
              backgroundState: {
                PredictController: {
                  activeOrders: {
                    '0x123': {
                      state: ActiveOrderState.PLACING_ORDER,
                    },
                  },
                },
              },
            },
          });
        }

        return undefined;
      });

      const { result } = renderHook(() => usePredictActiveOrder());

      expect(result.current.isDepositing).toBe(false);
      expect(result.current.isPlacingOrder).toBe(true);
    });

    it('returns false flags when there is no active order for the address', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (typeof selector === 'function') {
          return selector({
            engine: {
              backgroundState: {
                PredictController: {
                  activeOrders: {},
                },
              },
            },
          });
        }

        return undefined;
      });

      const { result } = renderHook(() => usePredictActiveOrder());

      expect(result.current.activeOrder).toBeNull();
      expect(result.current.isDepositing).toBe(false);
      expect(result.current.isPlacingOrder).toBe(false);
    });
  });
});

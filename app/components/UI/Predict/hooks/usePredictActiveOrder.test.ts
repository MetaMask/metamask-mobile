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

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const MOCK_ADDRESS = '0xabc123';

const mockAccountsController = {
  internalAccounts: {
    selectedAccount: 'acct-1',
    accounts: {
      'acct-1': {
        address: MOCK_ADDRESS,
        type: 'eip155:eoa',
        id: 'acct-1',
        metadata: {
          name: 'Account 1',
          keyring: { type: 'HD Key Tree' },
          importTime: 0,
          lastSelected: 0,
        },
        options: {},
        methods: [],
        scopes: [],
      },
    },
  },
};

const createMockState = (activeBuyOrder: Record<string, unknown> | null) => ({
  engine: {
    backgroundState: {
      PredictController: {
        activeBuyOrders: activeBuyOrder
          ? { [MOCK_ADDRESS]: activeBuyOrder }
          : {},
      },
      AccountsController: mockAccountsController,
    },
  },
});

describe('usePredictActiveOrder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector) => {
      if (typeof selector === 'function') {
        return selector(createMockState({ state: ActiveOrderState.PREVIEW }));
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
          return selector(createMockState(mockActiveOrder));
        }
        return undefined;
      });

      const { result } = renderHook(() => usePredictActiveOrder());

      expect(result.current.activeOrder).toEqual(mockActiveOrder);
    });

    it('returns isDepositing when active order is depositing', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (typeof selector === 'function') {
          return selector(
            createMockState({ state: ActiveOrderState.DEPOSITING }),
          );
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
          return selector(
            createMockState({ state: ActiveOrderState.PLACING_ORDER }),
          );
        }
        return undefined;
      });

      const { result } = renderHook(() => usePredictActiveOrder());

      expect(result.current.isDepositing).toBe(false);
      expect(result.current.isPlacingOrder).toBe(true);
    });

    it('returns false flags when there is no active buy order', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (typeof selector === 'function') {
          return selector(createMockState(null));
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

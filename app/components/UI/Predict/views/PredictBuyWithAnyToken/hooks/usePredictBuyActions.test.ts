import { renderHook, act, waitFor } from '@testing-library/react-native';
import { usePredictBuyActions } from './usePredictBuyPreviewActions';
import {
  ActiveOrderState,
  OrderPreview,
  PlaceOrderParams,
} from '../../../types';
import { PlaceOrderOutcome } from '../../../hooks/usePredictPlaceOrder';

const mockDispatch = jest.fn();
const mockOnApprovalReject = jest.fn();
const mockOnApprovalConfirm = jest.fn();
let mockActiveOrder: {
  batchId?: string | null;
  state?: string;
} | null = null;
let mockIsPredictBalanceSelected = true;
let mockPayWithAnyTokenEnabled = true;

const mockAddListener = jest.fn(
  (_event: string, callback: (e: { data: { closing: boolean } }) => void) => {
    callback({ data: { closing: false } });
    return jest.fn();
  },
);

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    dispatch: mockDispatch,
    addListener: mockAddListener,
  }),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => mockPayWithAnyTokenEnabled),
}));

jest.mock(
  '../../../../../Views/confirmations/hooks/useApprovalRequest',
  () => ({
    __esModule: true,
    default: () => ({
      onConfirm: mockOnApprovalConfirm,
      onReject: mockOnApprovalReject,
    }),
  }),
);

jest.mock('../../../hooks/usePredictActiveOrder', () => ({
  usePredictActiveOrder: () => ({
    activeOrder: mockActiveOrder,
  }),
}));

jest.mock('../../../hooks/usePredictPaymentToken', () => ({
  usePredictPaymentToken: () => ({
    isPredictBalanceSelected: mockIsPredictBalanceSelected,
  }),
}));

const mockOnOrderError = jest.fn();
const mockOnConfirmOrder = jest.fn();
const mockOnOrderSuccess = jest.fn();
const mockOnPlaceOrderEnd = jest.fn();
const mockOnDepositOrder = jest.fn();
const mockInitiPayWithAnyToken = jest.fn();

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    PredictController: {
      onOrderError: (...args: unknown[]) => mockOnOrderError(...args),
      onConfirmOrder: (...args: unknown[]) => mockOnConfirmOrder(...args),
      onOrderSuccess: (...args: unknown[]) => mockOnOrderSuccess(...args),
      onPlaceOrderEnd: (...args: unknown[]) => mockOnPlaceOrderEnd(...args),
      onDepositOrder: (...args: unknown[]) => mockOnDepositOrder(...args),
      initiPayWithAnyToken: (...args: unknown[]) =>
        mockInitiPayWithAnyToken(...args),
    },
  },
}));

const mockPlaceOrder = jest.fn<
  Promise<PlaceOrderOutcome>,
  [PlaceOrderParams]
>();
const mockSetIsConfirming = jest.fn();

const createDefaultParams = (): Parameters<typeof usePredictBuyActions>[0] => ({
  preview: {
    minAmountReceived: 180,
    fees: { totalFee: 5 },
  } as OrderPreview,
  analyticsProperties: { marketId: 'market-1' },
  placeOrder: mockPlaceOrder,
  setIsConfirming: mockSetIsConfirming,
});

describe('usePredictBuyActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockActiveOrder = null;
    mockIsPredictBalanceSelected = true;
    mockPayWithAnyTokenEnabled = true;
    mockInitiPayWithAnyToken.mockResolvedValue(undefined);
  });

  describe('mount effect', () => {
    it('calls initiPayWithAnyToken on mount', () => {
      renderHook(() => usePredictBuyActions(createDefaultParams()));

      expect(mockInitiPayWithAnyToken).toHaveBeenCalledTimes(1);
    });

    it('does not call initiPayWithAnyToken when payWithAnyTokenEnabled is false', () => {
      mockPayWithAnyTokenEnabled = false;

      renderHook(() => usePredictBuyActions(createDefaultParams()));

      expect(mockInitiPayWithAnyToken).not.toHaveBeenCalled();
    });
  });

  describe('handleConfirm', () => {
    it('sets isConfirming to true', async () => {
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(mockSetIsConfirming).toHaveBeenCalledWith(true);
    });

    it('calls onConfirmOrder when predict balance is selected', async () => {
      mockIsPredictBalanceSelected = true;
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(mockOnConfirmOrder).toHaveBeenCalled();
    });

    it('calls onDepositOrder and approval confirm when external token is selected', async () => {
      mockIsPredictBalanceSelected = false;
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(mockOnDepositOrder).toHaveBeenCalled();
      expect(mockOnApprovalConfirm).toHaveBeenCalledWith({
        deleteAfterResult: true,
        waitForResult: true,
        handleErrors: false,
      });
    });

    it('calls onOrderError when external token selected but preview is null', async () => {
      mockIsPredictBalanceSelected = false;
      const params = createDefaultParams();
      params.preview = null;
      const { result } = renderHook(() => usePredictBuyActions(params));

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(mockOnOrderError).toHaveBeenCalledTimes(1);
    });

    it('does not call placeOrder directly from handleConfirm', async () => {
      mockIsPredictBalanceSelected = true;
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(mockPlaceOrder).not.toHaveBeenCalled();
    });
  });

  describe('confirming state effect', () => {
    it.each([
      ActiveOrderState.DEPOSIT,
      ActiveOrderState.DEPOSITING,
      ActiveOrderState.PLACING_ORDER,
    ])('sets isConfirming to true in %s state', (state) => {
      mockActiveOrder = { state };

      renderHook(() => usePredictBuyActions(createDefaultParams()));

      expect(mockSetIsConfirming).toHaveBeenCalledWith(true);
    });

    it('sets isConfirming to true in PLACE_ORDER state', async () => {
      mockActiveOrder = { state: ActiveOrderState.PLACE_ORDER };
      mockPlaceOrder.mockResolvedValue({ status: 'deposit_required' });

      renderHook(() => usePredictBuyActions(createDefaultParams()));

      await waitFor(() => {
        expect(mockSetIsConfirming).toHaveBeenCalledWith(true);
      });
    });

    it.each([ActiveOrderState.PREVIEW, ActiveOrderState.PAY_WITH_ANY_TOKEN])(
      'sets isConfirming to false in %s state',
      (state) => {
        mockActiveOrder = { state };

        renderHook(() => usePredictBuyActions(createDefaultParams()));

        expect(mockSetIsConfirming).toHaveBeenCalledWith(false);
      },
    );
  });

  describe('success effect', () => {
    it('calls onPlaceOrderEnd and pops navigation in SUCCESS state', () => {
      mockActiveOrder = { state: ActiveOrderState.SUCCESS };

      renderHook(() => usePredictBuyActions(createDefaultParams()));

      expect(mockOnPlaceOrderEnd).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'POP' }),
      );
    });
  });

  describe('place order effect', () => {
    it('calls placeOrder with live preview when in PLACE_ORDER state', async () => {
      mockActiveOrder = { state: ActiveOrderState.PLACE_ORDER };
      mockPlaceOrder.mockResolvedValue({
        status: 'success',
        result: {} as never,
      });

      renderHook(() => usePredictBuyActions(createDefaultParams()));

      await waitFor(() => {
        expect(mockPlaceOrder).toHaveBeenCalledWith({
          analyticsProperties: { marketId: 'market-1' },
          preview: createDefaultParams().preview,
        });
      });
    });

    it('calls onOrderError when no preview is available', async () => {
      mockActiveOrder = { state: ActiveOrderState.PLACE_ORDER };
      const params = createDefaultParams();
      params.preview = null;

      renderHook(() => usePredictBuyActions(params));

      await waitFor(() => {
        expect(mockOnOrderError).toHaveBeenCalledTimes(1);
      });

      expect(mockPlaceOrder).not.toHaveBeenCalled();
    });

    it('calls onOrderError when placeOrder returns non-success', async () => {
      mockActiveOrder = { state: ActiveOrderState.PLACE_ORDER };
      mockPlaceOrder.mockResolvedValue({
        status: 'order_not_filled',
      });

      renderHook(() => usePredictBuyActions(createDefaultParams()));

      await waitFor(() => {
        expect(mockOnOrderError).toHaveBeenCalledTimes(1);
      });
    });
  });
});

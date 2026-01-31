const mockTheme = {
  colors: {
    accent04: { dark: '#dark', normal: '#normal' },
    accent03: { dark: '#accent03dark' },
    success: { default: '#success' },
    error: { default: '#error' },
    background: { default: '#bgdefault' },
  },
};

jest.mock('../../../../../util/theme', () => ({
  useAppThemeFromContext: jest.fn(() => mockTheme),
  mockTheme,
}));

jest.mock('./usePredictContext');
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));
jest.mock('../../../../../core/Engine', () => ({
  context: {
    PredictController: {
      state: {
        withdrawTransaction: { amount: 100 },
      },
      clearPendingDeposit: jest.fn(),
      confirmClaim: jest.fn(),
      clearWithdrawTransaction: jest.fn(),
    },
  },
}));
jest.mock('../../utils/accounts', () => ({
  getEvmAccountFromSelectedAccountGroup: jest.fn(),
}));
jest.mock('../../utils/format', () => ({
  formatPrice: jest.fn(),
  calculateNetAmount: jest.fn(),
}));
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

// Use a mutable ref object that persists across renders
const toastRefHolder: { showToast: jest.Mock | null } = { showToast: null };

jest.mock('../../../../../component-library/components/Toast', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const React = require('react');
  return {
    ToastContext: React.createContext({
      toastRef: {
        current: {
          get showToast() {
            return toastRefHolder.showToast;
          },
        },
      },
    }),
  };
});
jest.mock(
  '../../../../../component-library/components/Toast/Toast.types',
  () => ({
    ToastVariants: { Icon: 'Icon' },
  }),
);
jest.mock('../../../../../component-library/components/Buttons/Button', () => ({
  ButtonVariants: { Link: 'Link' },
}));
jest.mock('../../../../../component-library/components/Icons/Icon', () => ({
  __esModule: true,
  default: 'Icon',
  IconName: {
    Loading: 'Loading',
    Confirmation: 'Confirmation',
    Error: 'Error',
  },
  IconSize: { Lg: 'Lg' },
}));
jest.mock('@metamask/design-system-react-native', () => ({
  Box: 'Box',
  IconColor: { PrimaryDefault: 'PrimaryDefault' },
  IconSize: { Lg: 'Lg' },
}));
jest.mock(
  '@metamask/design-system-react-native/dist/components/temp-components/Spinner/index.cjs',
  () => ({
    Spinner: 'Spinner',
  }),
);

import React from 'react';
import { render, act } from '@testing-library/react-native';
import { TransactionStatus } from '@metamask/transaction-controller';
import { PredictTransactionToastHandler } from './PredictTransactionToastHandler';
import { usePredictContext } from './usePredictContext';
import { PredictTransactionEvent } from './PredictProvider.types';
import Engine from '../../../../../core/Engine';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { getEvmAccountFromSelectedAccountGroup } from '../../utils/accounts';
import { formatPrice, calculateNetAmount } from '../../utils/format';

const mockUsePredictContext = usePredictContext as jest.MockedFunction<
  typeof usePredictContext
>;
const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockGetEvmAccount =
  getEvmAccountFromSelectedAccountGroup as jest.MockedFunction<
    typeof getEvmAccountFromSelectedAccountGroup
  >;
const mockFormatPrice = formatPrice as jest.MockedFunction<typeof formatPrice>;
const mockCalculateNetAmount = calculateNetAmount as jest.MockedFunction<
  typeof calculateNetAmount
>;

type SubscriptionCallback = (event: PredictTransactionEvent) => void;

describe('PredictTransactionToastHandler', () => {
  let depositSubscribers: SubscriptionCallback[];
  let claimSubscribers: SubscriptionCallback[];
  let withdrawSubscribers: SubscriptionCallback[];
  let mockShowToast: jest.Mock;
  let mockNavigate: jest.Mock;
  let mockGoBack: jest.Mock;

  const createEvent = (
    status: TransactionStatus,
    overrides: Partial<PredictTransactionEvent> = {},
  ): PredictTransactionEvent => ({
    transactionMeta: {
      id: 'tx-123',
      status,
      metamaskPay: {
        totalFiat: '100',
        bridgeFeeFiat: '5',
        networkFeeFiat: '2',
      },
    } as PredictTransactionEvent['transactionMeta'],
    status,
    type: 'deposit',
    timestamp: Date.now(),
    ...overrides,
  });

  const renderWithContext = () => {
    toastRefHolder.showToast = mockShowToast;
    return render(<PredictTransactionToastHandler />);
  };

  beforeEach(() => {
    depositSubscribers = [];
    claimSubscribers = [];
    withdrawSubscribers = [];
    mockShowToast = jest.fn();
    mockNavigate = jest.fn();
    mockGoBack = jest.fn();

    mockUsePredictContext.mockReturnValue({
      subscribeToDepositEvents: jest.fn((cb) => {
        depositSubscribers.push(cb);
        return () => {
          depositSubscribers = depositSubscribers.filter((s) => s !== cb);
        };
      }),
      subscribeToClaimEvents: jest.fn((cb) => {
        claimSubscribers.push(cb);
        return () => {
          claimSubscribers = claimSubscribers.filter((s) => s !== cb);
        };
      }),
      subscribeToWithdrawEvents: jest.fn((cb) => {
        withdrawSubscribers.push(cb);
        return () => {
          withdrawSubscribers = withdrawSubscribers.filter((s) => s !== cb);
        };
      }),
    });

    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
    } as never);

    mockUseSelector.mockReturnValue([]);
    mockGetEvmAccount.mockReturnValue({ address: '0x123' } as never);
    mockFormatPrice.mockReturnValue('$100.00');
    mockCalculateNetAmount.mockReturnValue('93');

    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('subscribes to all event types on mount', () => {
      renderWithContext();

      expect(depositSubscribers).toHaveLength(1);
      expect(claimSubscribers).toHaveLength(1);
      expect(withdrawSubscribers).toHaveLength(1);
    });

    it('unsubscribes from all event types on unmount', () => {
      const { unmount } = renderWithContext();

      expect(depositSubscribers).toHaveLength(1);
      expect(claimSubscribers).toHaveLength(1);
      expect(withdrawSubscribers).toHaveLength(1);

      unmount();

      expect(depositSubscribers).toHaveLength(0);
      expect(claimSubscribers).toHaveLength(0);
      expect(withdrawSubscribers).toHaveLength(0);
    });

    it('renders null', () => {
      const { toJSON } = renderWithContext();

      expect(toJSON()).toBeNull();
    });

    it('uses fallback address when evmAccount is null', () => {
      mockGetEvmAccount.mockReturnValue(null);

      renderWithContext();

      expect(mockUseSelector).toHaveBeenCalled();
    });
  });

  describe('deposit events', () => {
    it('clears pending deposit on rejected status', () => {
      renderWithContext();
      const event = createEvent(TransactionStatus.rejected);

      act(() => {
        depositSubscribers[0](event);
      });

      expect(
        Engine.context.PredictController.clearPendingDeposit,
      ).toHaveBeenCalledWith({ providerId: 'polymarket' });
    });

    it('displays pending toast on approved status', () => {
      renderWithContext();
      const event = createEvent(TransactionStatus.approved);

      act(() => {
        depositSubscribers[0](event);
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: expect.arrayContaining([
            expect.objectContaining({ label: 'predict.deposit.adding_funds' }),
          ]),
        }),
      );
    });

    it('navigates to transaction details when pending toast onPress is called', () => {
      renderWithContext();
      const event = createEvent(TransactionStatus.approved);

      act(() => {
        depositSubscribers[0](event);
      });

      const toastCall = mockShowToast.mock.calls[0][0];
      expect(toastCall.closeButtonOptions).toBeDefined();

      act(() => {
        toastCall.closeButtonOptions.onPress();
      });

      expect(mockNavigate).toHaveBeenCalled();
    });

    it('clears pending deposit and displays confirmed toast on confirmed status', () => {
      renderWithContext();
      const event = createEvent(TransactionStatus.confirmed);

      act(() => {
        depositSubscribers[0](event);
      });

      expect(
        Engine.context.PredictController.clearPendingDeposit,
      ).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: expect.arrayContaining([
            expect.objectContaining({
              label: 'predict.deposit.ready_to_trade',
            }),
          ]),
        }),
      );
    });

    it('clears pending deposit and displays error toast on failed status', () => {
      renderWithContext();
      const event = createEvent(TransactionStatus.failed);

      act(() => {
        depositSubscribers[0](event);
      });

      expect(
        Engine.context.PredictController.clearPendingDeposit,
      ).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: expect.arrayContaining([
            expect.objectContaining({ label: 'predict.deposit.error_title' }),
          ]),
          linkButtonOptions: expect.objectContaining({
            label: 'predict.deposit.try_again',
          }),
        }),
      );
    });

    it('calls navigation.goBack when error toast retry is pressed', () => {
      renderWithContext();
      const event = createEvent(TransactionStatus.failed);

      act(() => {
        depositSubscribers[0](event);
      });

      const toastCall = mockShowToast.mock.calls[0][0];
      act(() => {
        toastCall.linkButtonOptions.onPress();
      });

      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('claim events', () => {
    it('confirms claim on rejected status', () => {
      renderWithContext();
      const event = createEvent(TransactionStatus.rejected, { type: 'claim' });

      act(() => {
        claimSubscribers[0](event);
      });

      expect(
        Engine.context.PredictController.confirmClaim,
      ).toHaveBeenCalledWith({ providerId: 'polymarket' });
    });

    it('displays pending toast on approved status', () => {
      renderWithContext();
      const event = createEvent(TransactionStatus.approved, { type: 'claim' });

      act(() => {
        claimSubscribers[0](event);
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: expect.arrayContaining([
            expect.objectContaining({
              label: 'predict.claim.toasts.pending.title',
            }),
          ]),
        }),
      );
    });

    it('confirms claim and displays confirmed toast on confirmed status', () => {
      renderWithContext();
      const event = createEvent(TransactionStatus.confirmed, { type: 'claim' });

      act(() => {
        claimSubscribers[0](event);
      });

      expect(Engine.context.PredictController.confirmClaim).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: expect.arrayContaining([
            expect.objectContaining({
              label: 'predict.deposit.account_ready',
            }),
          ]),
        }),
      );
    });

    it('displays error toast with retry on failed status', () => {
      renderWithContext();
      const event = createEvent(TransactionStatus.failed, { type: 'claim' });

      act(() => {
        claimSubscribers[0](event);
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: expect.arrayContaining([
            expect.objectContaining({
              label: 'predict.claim.toasts.error.title',
            }),
          ]),
          linkButtonOptions: expect.objectContaining({
            label: 'predict.claim.toasts.error.try_again',
          }),
        }),
      );
    });
  });

  describe('withdraw events', () => {
    it('clears withdraw transaction on rejected status', () => {
      renderWithContext();
      const event = createEvent(TransactionStatus.rejected, {
        type: 'withdraw',
      });

      act(() => {
        withdrawSubscribers[0](event);
      });

      expect(
        Engine.context.PredictController.clearWithdrawTransaction,
      ).toHaveBeenCalled();
    });

    it('displays pending toast on approved status', () => {
      renderWithContext();
      const event = createEvent(TransactionStatus.approved, {
        type: 'withdraw',
      });

      act(() => {
        withdrawSubscribers[0](event);
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: expect.arrayContaining([
            expect.objectContaining({
              label: 'predict.withdraw.withdrawing',
            }),
          ]),
        }),
      );
    });

    it('clears withdraw transaction and displays confirmed toast on confirmed status', () => {
      renderWithContext();
      const event = createEvent(TransactionStatus.confirmed, {
        type: 'withdraw',
      });

      act(() => {
        withdrawSubscribers[0](event);
      });

      expect(
        Engine.context.PredictController.clearWithdrawTransaction,
      ).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: expect.arrayContaining([
            expect.objectContaining({
              label: 'predict.withdraw.withdraw_completed',
            }),
          ]),
        }),
      );
    });

    it('clears withdraw transaction and displays error toast on failed status', () => {
      renderWithContext();
      const event = createEvent(TransactionStatus.failed, { type: 'withdraw' });

      act(() => {
        withdrawSubscribers[0](event);
      });

      expect(
        Engine.context.PredictController.clearWithdrawTransaction,
      ).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: expect.arrayContaining([
            expect.objectContaining({
              label: 'predict.withdraw.error_title',
            }),
          ]),
          linkButtonOptions: expect.objectContaining({
            label: 'predict.withdraw.try_again',
          }),
        }),
      );
    });

    it('uses zero amount when withdrawTransaction is null', () => {
      (
        Engine.context.PredictController.state as { withdrawTransaction: null }
      ).withdrawTransaction = null;
      renderWithContext();
      const event = createEvent(TransactionStatus.confirmed, {
        type: 'withdraw',
      });

      act(() => {
        withdrawSubscribers[0](event);
      });

      expect(mockFormatPrice).toHaveBeenCalledWith('0');
    });
  });

  describe('toast without onPress callback', () => {
    it('displays pending toast without closeButtonOptions when no onPress provided', () => {
      renderWithContext();
      const event = createEvent(TransactionStatus.approved, { type: 'claim' });

      act(() => {
        claimSubscribers[0](event);
      });

      const toastCall = mockShowToast.mock.calls[0][0];
      expect(toastCall.closeButtonOptions).toBeUndefined();
    });
  });

  describe('toast without retry label', () => {
    it('displays error toast without linkButtonOptions when no retryLabel', () => {
      renderWithContext();
      const event = createEvent(TransactionStatus.failed);

      mockShowToast.mockClear();
      act(() => {
        depositSubscribers[0](event);
      });

      expect(mockShowToast).toHaveBeenCalled();
    });
  });

  describe('won positions calculation', () => {
    it('calculates total claimable amount from won positions', () => {
      mockUseSelector.mockReturnValue([
        { currentValue: 50 },
        { currentValue: 30 },
        { currentValue: 20 },
      ]);
      mockFormatPrice.mockReturnValue('$100.00');

      renderWithContext();
      const event = createEvent(TransactionStatus.approved, { type: 'claim' });

      act(() => {
        claimSubscribers[0](event);
      });

      expect(mockFormatPrice).toHaveBeenCalledWith(100, { maximumDecimals: 2 });
    });
  });
});

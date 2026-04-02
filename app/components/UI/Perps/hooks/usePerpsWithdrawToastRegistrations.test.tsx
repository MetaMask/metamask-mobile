import { renderHook } from '@testing-library/react-native';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { usePerpsWithdrawToastRegistrations } from './usePerpsWithdrawToastRegistrations';
import { strings } from '../../../../../locales/i18n';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ToastVariants } from '../../../../component-library/components/Toast';

const MOCK_THEME = {
  colors: {
    success: { default: '#28a745' },
    error: { default: '#dc3545' },
    accent04: { normal: '#ffeeba' },
  },
};

jest.mock('../../../../util/theme', () => ({
  ...jest.requireActual('../../../../util/theme'),
  useAppThemeFromContext: () => MOCK_THEME,
}));

jest.mock('../../../../store', () => ({
  store: {
    getState: jest.fn(() => ({
      engine: {
        backgroundState: {
          TransactionController: { transactions: [] },
          TokensController: { allTokens: {} },
          NetworkController: { networkConfigurationsByChainId: {} },
        },
      },
    })),
  },
}));

describe('usePerpsWithdrawToastRegistrations', () => {
  let mockShowToast: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockShowToast = jest.fn();
  });

  function getHandler() {
    const { result } = renderHook(() =>
      usePerpsWithdrawToastRegistrations(),
    );
    expect(result.current).toHaveLength(1);
    expect(result.current[0].eventName).toBe(
      'TransactionController:transactionStatusUpdated',
    );
    return result.current[0].handler;
  }

  it('shows pending toast when perpsWithdraw transaction is approved', () => {
    const handler = getHandler();

    handler(
      {
        transactionMeta: {
          id: 'tx-1',
          type: TransactionType.perpsWithdraw,
          status: TransactionStatus.approved,
        } as TransactionMeta,
      },
      mockShowToast,
    );

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: ToastVariants.Icon,
        iconName: IconName.Loading,
        hasNoTimeout: false,
        labelOptions: expect.arrayContaining([
          expect.objectContaining({
            label: strings('perps.withdrawal.toast_pending_title'),
            isBold: true,
          }),
        ]),
      }),
    );
  });

  it('shows pending toast when perpsWithdraw is in nestedTransactions', () => {
    const handler = getHandler();

    handler(
      {
        transactionMeta: {
          id: 'tx-2',
          type: TransactionType.simpleSend,
          nestedTransactions: [{ type: TransactionType.perpsWithdraw }],
          status: TransactionStatus.approved,
        } as unknown as TransactionMeta,
      },
      mockShowToast,
    );

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        iconName: IconName.Loading,
      }),
    );
  });

  it('shows success toast when perpsWithdraw transaction is confirmed', () => {
    const handler = getHandler();

    handler(
      {
        transactionMeta: {
          id: 'tx-3',
          type: TransactionType.perpsWithdraw,
          status: TransactionStatus.confirmed,
        } as TransactionMeta,
      },
      mockShowToast,
    );

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: ToastVariants.Icon,
        iconName: IconName.Confirmation,
        labelOptions: expect.arrayContaining([
          expect.objectContaining({
            label: strings('perps.withdrawal.toast_completed_title'),
            isBold: true,
          }),
        ]),
      }),
    );
  });

  it('shows error toast when perpsWithdraw transaction fails', () => {
    const handler = getHandler();

    handler(
      {
        transactionMeta: {
          id: 'tx-4',
          type: TransactionType.perpsWithdraw,
          status: TransactionStatus.failed,
        } as TransactionMeta,
      },
      mockShowToast,
    );

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: ToastVariants.Icon,
        iconName: IconName.Error,
        labelOptions: expect.arrayContaining([
          expect.objectContaining({
            label: strings('perps.withdrawal.toast_error_title'),
            isBold: true,
          }),
        ]),
      }),
    );
  });

  it('ignores non-perpsWithdraw transactions', () => {
    const handler = getHandler();

    handler(
      {
        transactionMeta: {
          id: 'tx-5',
          type: TransactionType.simpleSend,
          status: TransactionStatus.approved,
        } as TransactionMeta,
      },
      mockShowToast,
    );

    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('does not duplicate toasts for same transaction + status', () => {
    const handler = getHandler();

    const payload = {
      transactionMeta: {
        id: 'tx-6',
        type: TransactionType.perpsWithdraw,
        status: TransactionStatus.approved,
      } as TransactionMeta,
    };

    handler(payload, mockShowToast);
    handler(payload, mockShowToast);

    expect(mockShowToast).toHaveBeenCalledTimes(1);
  });
});

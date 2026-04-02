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

jest.mock('../../../../util/theme', () => ({
  ...jest.requireActual('../../../../util/theme'),
  useAppThemeFromContext: () => ({
    colors: {
      success: { default: 'successDefault' },
      error: { default: 'errorDefault' },
      accent04: { normal: 'accent04Normal' },
    },
  }),
}));

const mockGetState = jest.fn(() => ({
  engine: {
    backgroundState: {
      TransactionController: { transactions: [] },
      TokensController: { allTokens: {} },
      NetworkController: { networkConfigurationsByChainId: {} },
    },
  },
}));

jest.mock('../../../../store', () => ({
  store: { getState: () => mockGetState() },
}));

describe('usePerpsWithdrawToastRegistrations', () => {
  let mockShowToast: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockShowToast = jest.fn();
  });

  function getHandler() {
    const { result } = renderHook(() => usePerpsWithdrawToastRegistrations());
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

  it('shows success toast with post-quote token and amount', () => {
    mockGetState.mockReturnValueOnce({
      engine: {
        backgroundState: {
          TransactionController: {
            transactions: [
              {
                id: 'tx-pq',
                metamaskPay: {
                  isPostQuote: true,
                  targetFiat: '0.25',
                  chainId: '0xa4b1',
                  tokenAddress: '0xtoken',
                },
              },
            ],
          },
          TokensController: {
            allTokens: {
              '0xa4b1': {
                '0x0': [{ address: '0xtoken', symbol: 'BNB' }],
              },
            },
          },
          NetworkController: { networkConfigurationsByChainId: {} },
        },
      },
    } as unknown as ReturnType<typeof mockGetState>);

    const handler = getHandler();

    handler(
      {
        transactionMeta: {
          id: 'tx-pq',
          type: TransactionType.perpsWithdraw,
          status: TransactionStatus.confirmed,
        } as TransactionMeta,
      },
      mockShowToast,
    );

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        iconName: IconName.Confirmation,
        labelOptions: expect.arrayContaining([
          expect.objectContaining({
            label: expect.stringContaining('BNB'),
            isBold: false,
          }),
        ]),
      }),
    );
  });

  it('shows success toast with ticker fallback when token not found', () => {
    mockGetState.mockReturnValueOnce({
      engine: {
        backgroundState: {
          TransactionController: {
            transactions: [
              {
                id: 'tx-ticker',
                metamaskPay: {
                  isPostQuote: true,
                  targetFiat: '1.50',
                  chainId: '0xa4b1',
                  tokenAddress: '0xunknown',
                },
              },
            ],
          },
          TokensController: { allTokens: {} },
          NetworkController: {
            networkConfigurationsByChainId: {
              '0xa4b1': { nativeCurrency: 'ETH' },
            },
          },
        },
      },
    } as unknown as ReturnType<typeof mockGetState>);

    const handler = getHandler();

    handler(
      {
        transactionMeta: {
          id: 'tx-ticker',
          type: TransactionType.perpsWithdraw,
          status: TransactionStatus.confirmed,
        } as TransactionMeta,
      },
      mockShowToast,
    );

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        iconName: IconName.Confirmation,
      }),
    );
  });

  it('shows success toast with USDC fallback when no token or ticker found', () => {
    mockGetState.mockReturnValueOnce({
      engine: {
        backgroundState: {
          TransactionController: {
            transactions: [
              {
                id: 'tx-usdc',
                metamaskPay: {
                  isPostQuote: true,
                  targetFiat: '0',
                },
              },
            ],
          },
          TokensController: { allTokens: {} },
          NetworkController: { networkConfigurationsByChainId: {} },
        },
      },
    } as unknown as ReturnType<typeof mockGetState>);

    const handler = getHandler();

    handler(
      {
        transactionMeta: {
          id: 'tx-usdc',
          type: TransactionType.perpsWithdraw,
          status: TransactionStatus.confirmed,
        } as TransactionMeta,
      },
      mockShowToast,
    );

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        iconName: IconName.Confirmation,
        labelOptions: expect.arrayContaining([
          expect.objectContaining({
            label: expect.stringContaining('USDC'),
            isBold: false,
          }),
        ]),
      }),
    );
  });

  it('ignores other status changes like submitted', () => {
    const handler = getHandler();

    handler(
      {
        transactionMeta: {
          id: 'tx-sub',
          type: TransactionType.perpsWithdraw,
          status: TransactionStatus.submitted,
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

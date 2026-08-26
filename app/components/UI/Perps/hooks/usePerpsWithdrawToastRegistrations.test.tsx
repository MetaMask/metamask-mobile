import { renderHook } from '@testing-library/react-native';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
  CHAIN_IDS,
} from '@metamask/transaction-controller';
import { usePerpsWithdrawToastRegistrations } from './usePerpsWithdrawToastRegistrations';
import { strings } from '../../../../../locales/i18n';
import { toast, ToastSeverity } from '@metamask/design-system-react-native';
import { MUSD_TOKEN_ADDRESS } from '../../Earn/constants/musd';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return {
    ...actual,
    toast: Object.assign(jest.fn(), { dismiss: jest.fn() }),
    Spinner: 'Spinner',
  };
});

jest.mock('../../../../util/theme', () => ({
  ...jest.requireActual('../../../../util/theme'),
  useAppThemeFromContext: () => ({
    colors: {
      success: { default: 'successDefault' },
      error: { default: 'errorDefault' },
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
  beforeEach(() => {
    jest.clearAllMocks();
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

    handler({
      transactionMeta: {
        id: 'tx-1',
        type: TransactionType.perpsWithdraw,
        status: TransactionStatus.approved,
      } as TransactionMeta,
    });

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: strings('perps.withdrawal.toast_pending_title'),
        hasNoTimeout: false,
      }),
    );
  });

  it('shows pending toast when perpsWithdraw is in nestedTransactions', () => {
    const handler = getHandler();

    handler({
      transactionMeta: {
        id: 'tx-2',
        type: TransactionType.simpleSend,
        nestedTransactions: [{ type: TransactionType.perpsWithdraw }],
        status: TransactionStatus.approved,
      } as unknown as TransactionMeta,
    });

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        startAccessory: expect.anything(),
      }),
    );
  });

  it('shows success toast when perpsWithdraw transaction is confirmed', () => {
    const handler = getHandler();

    handler({
      transactionMeta: {
        id: 'tx-3',
        type: TransactionType.perpsWithdraw,
        status: TransactionStatus.confirmed,
      } as TransactionMeta,
    });

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: ToastSeverity.Success,
        title: strings('perps.withdrawal.toast_completed_title'),
      }),
    );
  });

  it('shows error toast when perpsWithdraw transaction fails', () => {
    const handler = getHandler();

    handler({
      transactionMeta: {
        id: 'tx-4',
        type: TransactionType.perpsWithdraw,
        status: TransactionStatus.failed,
      } as TransactionMeta,
    });

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: ToastSeverity.Danger,
        title: strings('perps.withdrawal.toast_error_title'),
      }),
    );
  });

  it('ignores non-perpsWithdraw transactions', () => {
    const handler = getHandler();

    handler({
      transactionMeta: {
        id: 'tx-5',
        type: TransactionType.simpleSend,
        status: TransactionStatus.approved,
      } as TransactionMeta,
    });

    expect(toast).not.toHaveBeenCalled();
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

    handler({
      transactionMeta: {
        id: 'tx-pq',
        type: TransactionType.perpsWithdraw,
        status: TransactionStatus.confirmed,
      } as TransactionMeta,
    });

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringContaining('BNB'),
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

    handler({
      transactionMeta: {
        id: 'tx-ticker',
        type: TransactionType.perpsWithdraw,
        status: TransactionStatus.confirmed,
      } as TransactionMeta,
    });

    expect(toast).toHaveBeenCalledWith(expect.objectContaining({}));
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

    handler({
      transactionMeta: {
        id: 'tx-usdc',
        type: TransactionType.perpsWithdraw,
        status: TransactionStatus.confirmed,
      } as TransactionMeta,
    });

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        description: strings(
          'perps.withdrawal.toast_completed_subtitle_generic',
        ),
      }),
    );
  });

  describe('Money-account withdraw destination', () => {
    const moneyWithdrawMeta = (
      id: string,
      status: TransactionStatus,
    ): TransactionMeta =>
      ({
        id,
        type: TransactionType.perpsWithdraw,
        status,
        metamaskPay: {
          tokenAddress: MUSD_TOKEN_ADDRESS,
          chainId: CHAIN_IDS.MONAD,
          isPostQuote: true,
          targetFiat: '25',
        },
      }) as unknown as TransactionMeta;

    it('suppresses the native success toast when destination is the Money account', () => {
      const handler = getHandler();

      handler({
        transactionMeta: moneyWithdrawMeta(
          'tx-money',
          TransactionStatus.confirmed,
        ),
      });

      expect(toast).not.toHaveBeenCalled();
    });

    it('still shows the native success toast for a non-Money withdraw (other flows unchanged)', () => {
      const handler = getHandler();

      handler({
        transactionMeta: {
          id: 'tx-not-money',
          type: TransactionType.perpsWithdraw,
          status: TransactionStatus.confirmed,
          metamaskPay: {
            tokenAddress: MUSD_TOKEN_ADDRESS,
            chainId: '0x1',
            isPostQuote: true,
            targetFiat: '25',
          },
        } as unknown as TransactionMeta,
      });

      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ severity: ToastSeverity.Success }),
      );
    });
  });

  it('ignores other status changes like submitted', () => {
    const handler = getHandler();

    handler({
      transactionMeta: {
        id: 'tx-sub',
        type: TransactionType.perpsWithdraw,
        status: TransactionStatus.submitted,
      } as TransactionMeta,
    });

    expect(toast).not.toHaveBeenCalled();
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

    handler(payload);
    handler(payload);

    expect(toast).toHaveBeenCalledTimes(1);
  });
});

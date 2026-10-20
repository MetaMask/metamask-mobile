import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { usePerpsWithdrawMaxAmountRefresh } from './usePerpsWithdrawMaxAmountRefresh';
import { useTransactionPayBalance } from '../pay/useTransactionPayBalance';
import {
  useTransactionPayRequiredTokens,
  useTransactionPaySourceAmounts,
} from '../pay/useTransactionPayData';
import { useUpdateTransactionPayAmount } from '../pay/useUpdateTransactionPayAmount';
import { TransactionType } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';

jest.mock('../pay/useTransactionPayBalance');
jest.mock('../pay/useTransactionPayData');
jest.mock('../pay/useUpdateTransactionPayAmount');

const transactionMeta = {
  type: TransactionType.perpsWithdraw,
} as never;

function setup({
  balanceRaw = '487358300',
  balanceUsd = 4.873583,
  committedAmountRaw = '487358300',
  decimals = 8,
  isMaxAmount = true,
}: {
  balanceRaw?: string;
  balanceUsd?: number;
  committedAmountRaw?: string;
  decimals?: number;
  isMaxAmount?: boolean;
} = {}) {
  const updateTransactionPayAmountMock = jest.fn().mockResolvedValue(true);

  jest.mocked(useTransactionPayBalance).mockReturnValue({
    balanceRaw,
    balanceUsd,
  });
  jest.mocked(useTransactionPayRequiredTokens).mockReturnValue([
    {
      decimals,
    } as never,
  ]);
  jest.mocked(useTransactionPaySourceAmounts).mockReturnValue([
    {
      sourceAmountRaw: committedAmountRaw,
    } as never,
  ]);
  jest.mocked(useUpdateTransactionPayAmount).mockReturnValue({
    updateTransactionPayAmount: updateTransactionPayAmountMock,
  } as never);

  const hook = renderHookWithProvider(() =>
    usePerpsWithdrawMaxAmountRefresh({
      transactionMeta,
      isMaxAmount,
    }),
  );

  return { hook, updateTransactionPayAmountMock };
}

describe('usePerpsWithdrawMaxAmountRefresh', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not update when the committed amount matches the live balance', () => {
    setup();

    expect(useUpdateTransactionPayAmount).toHaveBeenCalled();
    expect(console.log).not.toHaveBeenCalled();
  });

  it('updates the committed amount when the live balance changes', () => {
    const { updateTransactionPayAmountMock } = setup({
      balanceRaw: '487358299',
      balanceUsd: 4.873582999999998,
      committedAmountRaw: '487358300',
    });

    expect(updateTransactionPayAmountMock).toHaveBeenCalledWith(
      '4.873582999999998',
    );
    expect(console.log).toHaveBeenCalledWith(
      '[OGP-PerpsWithdrawable] perpsWithdraw amount updating',
      expect.objectContaining({
        oldValue: '4.873583',
        newValue: '4.873582999999998',
      }),
    );
  });

  it('does not update when Max is disabled', () => {
    const { updateTransactionPayAmountMock } = setup({ isMaxAmount: false });

    expect(updateTransactionPayAmountMock).not.toHaveBeenCalled();
  });

  it('does not update when the transaction is not perps withdraw', () => {
    jest.mocked(useTransactionPayBalance).mockReturnValue({
      balanceRaw: '487358299',
      balanceUsd: 4.873582999999998,
    });
    jest.mocked(useTransactionPayRequiredTokens).mockReturnValue([
      {
        decimals: 8,
      } as never,
    ]);
    jest.mocked(useTransactionPaySourceAmounts).mockReturnValue([
      {
        sourceAmountRaw: '487358300',
      } as never,
    ]);
    const updateTransactionPayAmountMock = jest.fn();
    jest.mocked(useUpdateTransactionPayAmount).mockReturnValue({
      updateTransactionPayAmount: updateTransactionPayAmountMock,
    } as never);

    renderHookWithProvider(() =>
      usePerpsWithdrawMaxAmountRefresh({
        transactionMeta: {
          type: TransactionType.simpleSend,
        } as never,
        isMaxAmount: true,
      }),
    );

    expect(updateTransactionPayAmountMock).not.toHaveBeenCalled();
  });
});

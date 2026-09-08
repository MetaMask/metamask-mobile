import BigNumber from 'bignumber.js';
import { TransactionType } from '@metamask/transaction-controller';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { selectPrimaryMoneyAccount } from '../../../../../selectors/moneyAccountController';
import useMoneyAccountBalance from '../../../../UI/Money/hooks/useMoneyAccountBalance';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { usePayMoneyAccountAvailable } from './usePayMoneyAccountAvailable';

jest.mock('../../../../../selectors/moneyAccountController', () => ({
  selectPrimaryMoneyAccount: jest.fn(),
}));

jest.mock('../../../../UI/Money/hooks/useMoneyAccountBalance');

jest.mock('../transactions/useTransactionMetadataRequest', () => ({
  useTransactionMetadataRequest: jest.fn(),
}));

const MONEY_ACCOUNT = {
  address: '0xabc1111111111111111111111111111111111111',
};

const mockBalance = (
  withdrawableMusd: BigNumber | undefined,
  isBalanceLoading = false,
) => {
  jest.mocked(useMoneyAccountBalance).mockReturnValue({
    isBalanceLoading,
    withdrawableMusd,
  } as never);
};

const mockTransactionType = (type: TransactionType | undefined) => {
  (useTransactionMetadataRequest as jest.Mock).mockReturnValue(
    type ? { id: 'tx-1', type, txParams: {} } : undefined,
  );
};

const render = (options?: { enabled?: boolean }) =>
  renderHookWithProvider(() => usePayMoneyAccountAvailable(options));

describe('usePayMoneyAccountAvailable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (selectPrimaryMoneyAccount as unknown as jest.Mock).mockReturnValue(
      MONEY_ACCOUNT,
    );
    mockBalance(new BigNumber(100));
    mockTransactionType(TransactionType.perpsDeposit);
  });

  it('is unavailable when there is no money account', () => {
    (selectPrimaryMoneyAccount as unknown as jest.Mock).mockReturnValue(
      undefined,
    );

    expect(render().result.current).toStrictEqual({
      isAvailable: false,
      isPending: false,
    });
  });

  describe('funding flows', () => {
    it.each([TransactionType.perpsDeposit, TransactionType.predictDeposit])(
      'is available for %s when the balance is positive',
      (type) => {
        mockTransactionType(type);

        expect(render().result.current).toStrictEqual({
          isAvailable: true,
          isPending: false,
        });
      },
    );

    it.each([TransactionType.perpsDeposit, TransactionType.predictDeposit])(
      'is unavailable for %s when the balance is zero',
      (type) => {
        mockTransactionType(type);
        mockBalance(new BigNumber(0));

        expect(render().result.current).toStrictEqual({
          isAvailable: false,
          isPending: false,
        });
      },
    );

    it('is pending while the balance is loading', () => {
      mockBalance(undefined, true);

      expect(render().result.current).toStrictEqual({
        isAvailable: false,
        isPending: true,
      });
    });

    it('is unavailable and settled when the balance cannot be fetched', () => {
      mockBalance(undefined);

      expect(render().result.current).toStrictEqual({
        isAvailable: false,
        isPending: false,
      });
    });
  });

  describe('post-quote flows', () => {
    it.each([
      TransactionType.perpsWithdraw,
      TransactionType.predictWithdraw,
      TransactionType.moneyAccountWithdraw,
    ])('is available for %s despite a zero balance', (type) => {
      mockTransactionType(type);
      mockBalance(new BigNumber(0));

      expect(render().result.current).toStrictEqual({
        isAvailable: true,
        isPending: false,
      });
    });

    it('does not fetch a balance it cannot use', () => {
      mockTransactionType(TransactionType.perpsWithdraw);

      render();

      expect(useMoneyAccountBalance).toHaveBeenCalledWith({ enabled: false });
    });
  });

  describe('when disabled', () => {
    it('reports neither available nor pending', () => {
      mockBalance(undefined, true);

      expect(render({ enabled: false }).result.current).toStrictEqual({
        isAvailable: false,
        isPending: false,
      });
    });

    it('does not fetch a balance', () => {
      render({ enabled: false });

      expect(useMoneyAccountBalance).toHaveBeenCalledWith({ enabled: false });
    });
  });

  describe('outside a confirmation', () => {
    it('requires a balance when there is no transaction metadata', () => {
      mockTransactionType(undefined);
      mockBalance(new BigNumber(0));

      expect(render().result.current.isAvailable).toBe(false);
    });

    it('is available when there is no transaction metadata and a balance exists', () => {
      mockTransactionType(undefined);

      expect(render().result.current.isAvailable).toBe(true);
    });
  });
});

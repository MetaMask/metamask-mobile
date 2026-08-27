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

const mockBalance = (withdrawableMusd: BigNumber | undefined) => {
  jest.mocked(useMoneyAccountBalance).mockReturnValue({
    withdrawableMusd,
  } as never);
};

const mockTransactionType = (type: TransactionType | undefined) => {
  (useTransactionMetadataRequest as jest.Mock).mockReturnValue(
    type ? { id: 'tx-1', type, txParams: {} } : undefined,
  );
};

const render = () =>
  renderHookWithProvider(() => usePayMoneyAccountAvailable());

describe('usePayMoneyAccountAvailable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (selectPrimaryMoneyAccount as unknown as jest.Mock).mockReturnValue(
      MONEY_ACCOUNT,
    );
    mockBalance(new BigNumber(100));
    mockTransactionType(TransactionType.perpsDeposit);
  });

  it('returns false when there is no money account', () => {
    (selectPrimaryMoneyAccount as unknown as jest.Mock).mockReturnValue(
      undefined,
    );

    expect(render().result.current).toBe(false);
  });

  describe('funding flows', () => {
    it.each([TransactionType.perpsDeposit, TransactionType.predictDeposit])(
      'returns true for %s when the balance is positive',
      (type) => {
        mockTransactionType(type);

        expect(render().result.current).toBe(true);
      },
    );

    it.each([TransactionType.perpsDeposit, TransactionType.predictDeposit])(
      'returns false for %s when the balance is zero',
      (type) => {
        mockTransactionType(type);
        mockBalance(new BigNumber(0));

        expect(render().result.current).toBe(false);
      },
    );

    it('returns false when the balance is unknown, e.g. loading or fetch error', () => {
      mockBalance(undefined);

      expect(render().result.current).toBe(false);
    });
  });

  describe('post-quote flows', () => {
    it.each([
      TransactionType.perpsWithdraw,
      TransactionType.predictWithdraw,
      TransactionType.moneyAccountWithdraw,
    ])('returns true for %s despite a zero balance', (type) => {
      mockTransactionType(type);
      mockBalance(new BigNumber(0));

      expect(render().result.current).toBe(true);
    });
  });

  describe('outside a confirmation', () => {
    it('requires a balance when there is no transaction metadata', () => {
      mockTransactionType(undefined);
      mockBalance(new BigNumber(0));

      expect(render().result.current).toBe(false);
    });

    it('is available when there is no transaction metadata and a balance exists', () => {
      mockTransactionType(undefined);

      expect(render().result.current).toBe(true);
    });
  });
});

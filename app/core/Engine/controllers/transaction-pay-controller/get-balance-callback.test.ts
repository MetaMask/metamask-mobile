import {
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import {
  PaymentOverride,
  type GetBalanceRequest,
  type TransactionData,
} from '@metamask/transaction-pay-controller';
import Engine from '../../../../core/Engine';
import ReduxService from '../../../../core/redux/ReduxService';
import {
  getUsableMoneyAccountRedeemableRaw,
  selectMoneyAccountRedeemable,
} from '../../../../core/redux/slices/moneyBalance';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectPerpsAccountState } from '../../../../components/UI/Perps/selectors/perpsController';
import { getBalance } from './get-balance-callback';

jest.mock('../../../../core/redux/ReduxService', () => ({
  __esModule: true,
  default: { store: { getState: jest.fn().mockReturnValue({}) } },
}));
jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: { context: { PredictController: { state: { balances: {} } } } },
}));
jest.mock('../../../../core/redux/slices/moneyBalance');
jest.mock('../../../../selectors/moneyAccountController');
jest.mock('../../../../components/UI/Perps/selectors/perpsController');

const ACCOUNT_ADDRESS = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B';

function buildRequest({
  type,
  paymentOverride,
  decimals = 6,
  from = ACCOUNT_ADDRESS,
  omitFrom = false,
}: {
  type?: TransactionType;
  paymentOverride?: PaymentOverride;
  decimals?: number;
  from?: string;
  omitFrom?: boolean;
}): GetBalanceRequest {
  return {
    transaction: {
      type,
      txParams: { from: omitFrom ? undefined : from },
    } as TransactionMeta,
    transactionData: {
      paymentOverride,
      tokens: [{ decimals }],
    } as TransactionData,
  };
}

describe('getBalance', () => {
  const selectPerpsAccountStateMock = jest.mocked(selectPerpsAccountState);
  const selectRedeemableMock = jest.mocked(selectMoneyAccountRedeemable);
  const selectPrimaryMock = jest.mocked(selectPrimaryMoneyAccount);
  const getUsableMock = jest.mocked(getUsableMoneyAccountRedeemableRaw);

  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(ReduxService.store.getState).mockReturnValue({} as never);
    Engine.context.PredictController.state.balances = {};
  });

  describe('perps withdraw', () => {
    it('returns the HyperLiquid withdrawable balance converted to raw', () => {
      selectPerpsAccountStateMock.mockReturnValue({
        withdrawableBalance: '123.45',
      } as never);

      expect(
        getBalance(buildRequest({ type: TransactionType.perpsWithdraw })),
      ).toStrictEqual({
        balanceRaw: '123450000',
      });
    });

    it('returns undefined when the withdrawable balance is zero', () => {
      selectPerpsAccountStateMock.mockReturnValue({
        withdrawableBalance: '0',
      } as never);

      expect(
        getBalance(buildRequest({ type: TransactionType.perpsWithdraw })),
      ).toBeUndefined();
    });

    it('returns undefined when there is no perps account state', () => {
      selectPerpsAccountStateMock.mockReturnValue(null);

      expect(
        getBalance(buildRequest({ type: TransactionType.perpsWithdraw })),
      ).toBeUndefined();
    });
  });

  describe('predict withdraw', () => {
    it('returns the cached Polymarket balance converted to raw', () => {
      Engine.context.PredictController.state.balances = {
        [ACCOUNT_ADDRESS]: { balance: 50.5, validUntil: 0 },
      } as never;

      expect(
        getBalance(buildRequest({ type: TransactionType.predictWithdraw })),
      ).toStrictEqual({
        balanceRaw: '50500000',
      });
    });

    it('uses the cached balance even when its TTL has expired', () => {
      Engine.context.PredictController.state.balances = {
        [ACCOUNT_ADDRESS]: { balance: 10, validUntil: -1 },
      } as never;

      expect(
        getBalance(buildRequest({ type: TransactionType.predictWithdraw })),
      ).toStrictEqual({
        balanceRaw: '10000000',
      });
    });

    it('returns undefined when there is no cached balance', () => {
      expect(
        getBalance(buildRequest({ type: TransactionType.predictWithdraw })),
      ).toBeUndefined();
    });

    it('returns undefined when the transaction has no from address', () => {
      Engine.context.PredictController.state.balances = {
        [ACCOUNT_ADDRESS]: { balance: 10, validUntil: 0 },
      } as never;

      expect(
        getBalance(
          buildRequest({
            type: TransactionType.predictWithdraw,
            omitFrom: true,
          }),
        ),
      ).toBeUndefined();
    });
  });

  describe('money account', () => {
    beforeEach(() => {
      selectRedeemableMock.mockReturnValue({
        address: ACCOUNT_ADDRESS,
        raw: '15019083',
      });
      selectPrimaryMock.mockReturnValue({ address: ACCOUNT_ADDRESS } as never);
      getUsableMock.mockReturnValue('15019083');
    });

    it('returns the redeemable for a money account withdraw', () => {
      expect(
        getBalance(
          buildRequest({ type: TransactionType.moneyAccountWithdraw }),
        ),
      ).toStrictEqual({
        balanceRaw: '15019083',
      });
    });

    it('returns the redeemable for a MoneyAccount payment override', () => {
      expect(
        getBalance(
          buildRequest({ paymentOverride: PaymentOverride.MoneyAccount }),
        ),
      ).toStrictEqual({
        balanceRaw: '15019083',
      });
    });

    it('returns undefined when the redeemable is for a different account', () => {
      getUsableMock.mockReturnValue(undefined);

      expect(
        getBalance(
          buildRequest({ type: TransactionType.moneyAccountWithdraw }),
        ),
      ).toBeUndefined();
    });
  });

  it('returns undefined for unrelated transactions', () => {
    expect(
      getBalance(buildRequest({ type: TransactionType.simpleSend })),
    ).toBeUndefined();
  });
});

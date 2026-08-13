import {
  PaymentOverride,
  type ResolveSourceAmountRequest,
} from '@metamask/transaction-pay-controller';
import ReduxService from '../../../../core/redux/ReduxService';
import {
  getUsableMoneyAccountRedeemableRaw,
  selectMoneyAccountRedeemable,
} from '../../../../core/redux/slices/moneyBalance';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { resolveSourceAmount } from './resolve-source-amount-callback';

jest.mock('../../../../core/redux/ReduxService', () => ({
  __esModule: true,
  default: { store: { getState: jest.fn().mockReturnValue({}) } },
}));
jest.mock('../../../../core/redux/slices/moneyBalance');
jest.mock('../../../../selectors/moneyAccountController');

const ACCOUNT_ADDRESS = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B';

function buildRequest(
  overrides: Partial<ResolveSourceAmountRequest> = {},
): ResolveSourceAmountRequest {
  return {
    isMaxAmount: true,
    paymentOverride: PaymentOverride.MoneyAccount,
    ...overrides,
  } as ResolveSourceAmountRequest;
}

describe('resolveSourceAmount', () => {
  const selectRedeemableMock = jest.mocked(selectMoneyAccountRedeemable);
  const selectPrimaryMock = jest.mocked(selectPrimaryMoneyAccount);
  const getUsableMock = jest.mocked(getUsableMoneyAccountRedeemableRaw);

  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(ReduxService.store.getState).mockReturnValue({} as never);
    selectRedeemableMock.mockReturnValue({
      address: ACCOUNT_ADDRESS,
      raw: '15019083',
    });
    selectPrimaryMock.mockReturnValue({ address: ACCOUNT_ADDRESS } as never);
    getUsableMock.mockReturnValue('15019083');
  });

  it('returns the cached atomic redeemable for Money Account max', () => {
    expect(resolveSourceAmount(buildRequest())).toStrictEqual({
      sourceAmountRaw: '15019083',
    });
    expect(getUsableMock).toHaveBeenCalledWith(
      { address: ACCOUNT_ADDRESS, raw: '15019083' },
      ACCOUNT_ADDRESS,
    );
  });

  it('returns undefined when not max amount', () => {
    expect(
      resolveSourceAmount(buildRequest({ isMaxAmount: false })),
    ).toBeUndefined();
  });

  it('returns undefined when payment override is not Money Account', () => {
    expect(
      resolveSourceAmount(buildRequest({ paymentOverride: undefined })),
    ).toBeUndefined();
  });

  it('returns undefined when the cached redeemable is for a different account', () => {
    getUsableMock.mockReturnValue(undefined);

    expect(resolveSourceAmount(buildRequest())).toBeUndefined();
  });

  it('returns undefined when no cached redeemable is available', () => {
    selectRedeemableMock.mockReturnValue(null);
    getUsableMock.mockReturnValue(undefined);

    expect(resolveSourceAmount(buildRequest())).toBeUndefined();
  });
});

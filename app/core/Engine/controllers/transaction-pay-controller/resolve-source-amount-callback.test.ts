import {
  PaymentOverride,
  type ResolveSourceAmountRequest,
} from '@metamask/transaction-pay-controller';
import ReduxService from '../../../../core/redux/ReduxService';
import { selectMoneyAccountRedeemableRaw } from '../../../../core/redux/slices/moneyBalance';
import { resolveSourceAmount } from './resolve-source-amount-callback';

jest.mock('../../../../core/redux/ReduxService', () => ({
  __esModule: true,
  default: { store: { getState: jest.fn().mockReturnValue({}) } },
}));
jest.mock('../../../../core/redux/slices/moneyBalance');

function buildRequest(
  overrides: Partial<ResolveSourceAmountRequest> = {},
): ResolveSourceAmountRequest {
  return {
    token: {} as ResolveSourceAmountRequest['token'],
    paymentToken: {} as ResolveSourceAmountRequest['paymentToken'],
    isMaxAmount: true,
    paymentOverride: PaymentOverride.MoneyAccount,
    ...overrides,
  };
}

describe('resolveSourceAmount', () => {
  const selectRedeemableMock = jest.mocked(selectMoneyAccountRedeemableRaw);

  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(ReduxService.store.getState).mockReturnValue({} as never);
  });

  it('returns the cached atomic redeemable for Money Account max', () => {
    selectRedeemableMock.mockReturnValue('15019083');

    expect(resolveSourceAmount(buildRequest())).toStrictEqual({
      sourceAmountRaw: '15019083',
    });
  });

  it('returns undefined when not max amount', () => {
    selectRedeemableMock.mockReturnValue('15019083');

    expect(
      resolveSourceAmount(buildRequest({ isMaxAmount: false })),
    ).toBeUndefined();
  });

  it('returns undefined when payment override is not Money Account', () => {
    selectRedeemableMock.mockReturnValue('15019083');

    expect(
      resolveSourceAmount(buildRequest({ paymentOverride: undefined })),
    ).toBeUndefined();
  });

  it('returns undefined when no cached redeemable is available', () => {
    selectRedeemableMock.mockReturnValue(null);

    expect(resolveSourceAmount(buildRequest())).toBeUndefined();
  });
});

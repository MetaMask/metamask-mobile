import { PaymentOverride } from '@metamask/transaction-pay-controller';
import Engine from '../../../../../core/Engine';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useMoneyAccountPaymentOverride } from './useMoneyAccountPaymentOverride';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useParams } from '../../../../../util/navigation/navUtils';
import { selectPrimaryMoneyAccount } from '../../../../../selectors/moneyAccountController';
import { PayWithOption } from '../../components/confirm/confirm-component';

const TRANSACTION_ID = 'tx-perps-1';
const MONEY_ACCOUNT_ADDRESS = '0xabc1111111111111111111111111111111111111';

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      TransactionPayController: {
        setTransactionConfig: jest.fn(),
      },
    },
  },
}));

jest.mock('../transactions/useTransactionMetadataRequest', () => ({
  useTransactionMetadataRequest: jest.fn(),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../util/navigation/navUtils'),
  useParams: jest.fn(),
}));

jest.mock('../../../../../selectors/moneyAccountController', () => ({
  selectPrimaryMoneyAccount: jest.fn(),
}));

const setTransactionConfigMock = jest.mocked(
  Engine.context.TransactionPayController.setTransactionConfig,
);

const render = () =>
  renderHookWithProvider(() => useMoneyAccountPaymentOverride());

describe('useMoneyAccountPaymentOverride', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (selectPrimaryMoneyAccount as unknown as jest.Mock).mockReturnValue({
      address: MONEY_ACCOUNT_ADDRESS,
    });
    (useParams as jest.Mock).mockReturnValue({});
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue(undefined);
  });

  it('does nothing when payWithOption is not set', () => {
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
      id: TRANSACTION_ID,
    });

    render();

    expect(setTransactionConfigMock).not.toHaveBeenCalled();
  });

  it('does nothing when no transaction exists', () => {
    (useParams as jest.Mock).mockReturnValue({
      payWithOption: PayWithOption.MoneyAccount,
    });

    render();

    expect(setTransactionConfigMock).not.toHaveBeenCalled();
  });

  it('sets PaymentOverride.MoneyAccount when payWithOption is MoneyAccount and transaction exists', () => {
    (useParams as jest.Mock).mockReturnValue({
      payWithOption: PayWithOption.MoneyAccount,
    });
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
      id: TRANSACTION_ID,
    });

    render();

    expect(setTransactionConfigMock).toHaveBeenCalledWith(
      TRANSACTION_ID,
      expect.any(Function),
    );

    const callback = setTransactionConfigMock.mock.calls[0][1];
    const config: Record<string, unknown> = {};
    callback(config as never);

    expect(config.paymentOverride).toBe(PaymentOverride.MoneyAccount);
    expect(config.refundTo).toBe(MONEY_ACCOUNT_ADDRESS);
  });

  it('only applies override once per transaction', () => {
    (useParams as jest.Mock).mockReturnValue({
      payWithOption: PayWithOption.MoneyAccount,
    });
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
      id: TRANSACTION_ID,
    });

    const { rerender } = render();
    rerender({});

    expect(setTransactionConfigMock).toHaveBeenCalledTimes(1);
  });

  it('omits refundTo when money account has no address', () => {
    (selectPrimaryMoneyAccount as unknown as jest.Mock).mockReturnValue(
      undefined,
    );
    (useParams as jest.Mock).mockReturnValue({
      payWithOption: PayWithOption.MoneyAccount,
    });
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
      id: TRANSACTION_ID,
    });

    render();

    const callback = setTransactionConfigMock.mock.calls[0][1];
    const config: Record<string, unknown> = {};
    callback(config as never);

    expect(config.paymentOverride).toBe(PaymentOverride.MoneyAccount);
    expect(config.refundTo).toBeUndefined();
  });
});

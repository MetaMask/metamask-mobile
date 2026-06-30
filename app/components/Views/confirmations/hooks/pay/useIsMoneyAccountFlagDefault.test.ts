import { TransactionType } from '@metamask/transaction-controller';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useIsMoneyAccountFlagDefault } from './useIsMoneyAccountFlagDefault';
import { useParams } from '../../../../../util/navigation/navUtils';
import { selectPrimaryMoneyAccount } from '../../../../../selectors/moneyAccountController';
import { selectMetaMaskPayFlags } from '../../../../../selectors/featureFlagController/confirmations';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { PayWithOption } from '../../components/confirm/confirm-component';

jest.mock('../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../util/navigation/navUtils'),
  useParams: jest.fn(),
}));

jest.mock('../../../../../selectors/moneyAccountController', () => ({
  selectPrimaryMoneyAccount: jest.fn(),
}));

jest.mock(
  '../../../../../selectors/featureFlagController/confirmations',
  () => ({
    selectMetaMaskPayFlags: jest.fn(),
  }),
);

jest.mock('../transactions/useTransactionMetadataRequest', () => ({
  useTransactionMetadataRequest: jest.fn(),
}));

const MONEY_ACCOUNT_ADDRESS = '0xabc1111111111111111111111111111111111111';

const MONEY_ACCOUNT_FLAG = {
  defaultPaySelectedSection: {
    perpsWithdraw: 'money-account',
    predictWithdraw: 'money-account',
  },
};

const DEFAULT_FLAGS = {
  defaultPaySelectedSection: undefined,
};

const render = () =>
  renderHookWithProvider(() => useIsMoneyAccountFlagDefault());

describe('useIsMoneyAccountFlagDefault', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useParams as jest.Mock).mockReturnValue({});
    (selectPrimaryMoneyAccount as unknown as jest.Mock).mockReturnValue({
      address: MONEY_ACCOUNT_ADDRESS,
    });
    (selectMetaMaskPayFlags as unknown as jest.Mock).mockReturnValue(
      DEFAULT_FLAGS,
    );
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue(undefined);
  });

  it('returns false when flag is not set', () => {
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
      type: TransactionType.perpsDeposit,
    });

    const { result } = render();
    expect(result.current).toBe(false);
  });

  it.each([TransactionType.perpsWithdraw, TransactionType.predictWithdraw])(
    'returns true for %s when flag maps type to "money-account" and money account exists',
    (type) => {
      (selectMetaMaskPayFlags as unknown as jest.Mock).mockReturnValue(
        MONEY_ACCOUNT_FLAG,
      );
      (useTransactionMetadataRequest as jest.Mock).mockReturnValue({ type });

      const { result } = render();
      expect(result.current).toBe(true);
    },
  );

  it.each([TransactionType.perpsDeposit, TransactionType.predictDeposit])(
    'returns false for %s when type has no key in the flag object',
    (type) => {
      (selectMetaMaskPayFlags as unknown as jest.Mock).mockReturnValue(
        MONEY_ACCOUNT_FLAG,
      );
      (useTransactionMetadataRequest as jest.Mock).mockReturnValue({ type });

      const { result } = render();
      expect(result.current).toBe(false);
    },
  );

  it('returns false when flag is "money-account" but no money account', () => {
    (selectPrimaryMoneyAccount as unknown as jest.Mock).mockReturnValue(
      undefined,
    );
    (selectMetaMaskPayFlags as unknown as jest.Mock).mockReturnValue(
      MONEY_ACCOUNT_FLAG,
    );
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
      type: TransactionType.perpsDeposit,
    });

    const { result } = render();
    expect(result.current).toBe(false);
  });

  it('returns false when flag maps type to a different value', () => {
    (selectMetaMaskPayFlags as unknown as jest.Mock).mockReturnValue({
      defaultPaySelectedSection: { perpsWithdraw: 'crypto' },
    });
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
      type: TransactionType.perpsWithdraw,
    });

    const { result } = render();
    expect(result.current).toBe(false);
  });

  it('returns false when payWithOption is already set', () => {
    (useParams as jest.Mock).mockReturnValue({
      payWithOption: PayWithOption.MoneyAccount,
    });
    (selectMetaMaskPayFlags as unknown as jest.Mock).mockReturnValue(
      MONEY_ACCOUNT_FLAG,
    );
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
      type: TransactionType.perpsDeposit,
    });

    const { result } = render();
    expect(result.current).toBe(false);
  });

  it.each([
    TransactionType.simpleSend,
    TransactionType.swap,
    TransactionType.bridge,
    TransactionType.moneyAccountDeposit,
    TransactionType.predictDepositAndOrder,
  ])(
    'returns false for non-perps/predict type %s even when flag is enabled',
    (type) => {
      (selectMetaMaskPayFlags as unknown as jest.Mock).mockReturnValue(
        MONEY_ACCOUNT_FLAG,
      );
      (useTransactionMetadataRequest as jest.Mock).mockReturnValue({ type });

      const { result } = render();
      expect(result.current).toBe(false);
    },
  );

  it('returns false when no transaction metadata exists', () => {
    (selectMetaMaskPayFlags as unknown as jest.Mock).mockReturnValue(
      MONEY_ACCOUNT_FLAG,
    );
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue(undefined);

    const { result } = render();
    expect(result.current).toBe(false);
  });
});

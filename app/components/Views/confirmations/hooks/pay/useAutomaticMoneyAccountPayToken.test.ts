import BigNumber from 'bignumber.js';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { TransactionType } from '@metamask/transaction-controller';
import { PaymentOverride } from '@metamask/transaction-pay-controller';
import {
  isHardwareAccount,
  isQRHardwareAccount,
} from '../../../../../util/address';
import {
  selectMetaMaskPayFlags,
  selectMetaMaskPayTokensFlags,
} from '../../../../../selectors/featureFlagController/confirmations';
import { selectPrimaryMoneyAccount } from '../../../../../selectors/moneyAccountController';
import { selectPaymentOverrideByTransactionId } from '../../../../../selectors/transactionPayController';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import useMoneyAccountBalance from '../../../../UI/Money/hooks/useMoneyAccountBalance';
import { applyMoneyAccountOverride } from '../../utils/transaction-pay';
import { AssetType } from '../../types/token';
import { transactionIdMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { useAutomaticMoneyAccountPayToken } from './useAutomaticMoneyAccountPayToken';

jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../../../../../util/address');
jest.mock('../../../../../selectors/transactionPayController');
jest.mock(
  '../../../../../selectors/featureFlagController/confirmations',
  () => ({
    ...jest.requireActual(
      '../../../../../selectors/featureFlagController/confirmations',
    ),
    selectMetaMaskPayFlags: jest.fn(),
    selectMetaMaskPayTokensFlags: jest.fn(),
  }),
);
jest.mock('../../../../../selectors/moneyAccountController', () => ({
  ...jest.requireActual('../../../../../selectors/moneyAccountController'),
  selectPrimaryMoneyAccount: jest.fn(),
}));
jest.mock('../../../../UI/Money/hooks/useMoneyAccountBalance', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('../../utils/transaction-pay', () => ({
  ...jest.requireActual('../../utils/transaction-pay'),
  applyMoneyAccountOverride: jest.fn(),
}));

const MONEY_ACCOUNT_ADDRESS_MOCK = '0xabc1111111111111111111111111111111111111';

function runHook({
  autoSelectFiatPayment = false,
  availableTokens = [],
  disable = false,
  hasFiatPaymentSelected = false,
  payTokenSelected = false,
}: {
  autoSelectFiatPayment?: boolean;
  availableTokens?: AssetType[];
  disable?: boolean;
  hasFiatPaymentSelected?: boolean;
  payTokenSelected?: boolean;
} = {}) {
  return renderHookWithProvider(
    () =>
      useAutomaticMoneyAccountPayToken({
        autoSelectFiatPayment,
        availableTokens,
        disable,
        hasFiatPaymentSelected,
        payTokenSelected,
      }),
    { state: {} },
  );
}

describe('useAutomaticMoneyAccountPayToken', () => {
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );
  const isHardwareAccountMock = jest.mocked(isHardwareAccount);
  const isQRHardwareAccountMock = jest.mocked(isQRHardwareAccount);
  const selectMetaMaskPayFlagsMock = jest.mocked(selectMetaMaskPayFlags);
  const selectMetaMaskPayTokensFlagsMock = jest.mocked(
    selectMetaMaskPayTokensFlags,
  );
  const selectPrimaryMoneyAccountMock = jest.mocked(selectPrimaryMoneyAccount);
  const selectPaymentOverrideMock = jest.mocked(
    selectPaymentOverrideByTransactionId,
  );
  const useMoneyAccountBalanceMock = jest.mocked(useMoneyAccountBalance);
  const applyMoneyAccountOverrideMock = jest.mocked(applyMoneyAccountOverride);

  function mockMoneyAccountPay({
    balance = '7.61',
    enabled = true,
    isBalanceLoading = false,
    type = TransactionType.perpsDeposit,
  }: {
    balance?: string;
    enabled?: boolean;
    isBalanceLoading?: boolean;
    type?: TransactionType;
  } = {}) {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: transactionIdMock,
      type,
      txParams: { from: '0xdc47789de4ceff0e8fe9d15d728af7f17550c164' },
    } as never);
    selectPrimaryMoneyAccountMock.mockReturnValue({
      address: MONEY_ACCOUNT_ADDRESS_MOCK,
    } as never);
    selectMetaMaskPayFlagsMock.mockReturnValue({
      enableMoneyAccountTransactions: enabled
        ? {
            perpsDeposit: true,
            perpsDepositAndOrder: true,
            predictDeposit: true,
            predictDepositAndOrder: true,
          }
        : {},
    } as never);
    useMoneyAccountBalanceMock.mockReturnValue({
      isBalanceLoading,
      withdrawableFiatRaw: isBalanceLoading ? undefined : balance,
      withdrawableMusd: isBalanceLoading ? undefined : new BigNumber(balance),
    } as never);
  }

  beforeEach(() => {
    jest.resetAllMocks();

    isHardwareAccountMock.mockReturnValue(false);
    isQRHardwareAccountMock.mockReturnValue(false);
    selectPaymentOverrideMock.mockReturnValue(undefined);
    selectMetaMaskPayFlagsMock.mockReturnValue({
      enableMoneyAccountTransactions: {},
    } as never);
    selectMetaMaskPayTokensFlagsMock.mockReturnValue({
      preferredTokens: { default: [], overrides: {} },
      minimumRequiredTokenBalance: 10,
      blockedTokens: { default: { chainIds: [], tokens: [] }, overrides: {} },
    });
    selectPrimaryMoneyAccountMock.mockReturnValue(undefined);
    useMoneyAccountBalanceMock.mockReturnValue({
      isBalanceLoading: false,
      withdrawableFiatRaw: undefined,
      withdrawableMusd: undefined,
    } as never);
    useTransactionMetadataRequestMock.mockReturnValue({
      id: transactionIdMock,
      type: TransactionType.perpsDeposit,
      txParams: { from: '0xdc47789de4ceff0e8fe9d15d728af7f17550c164' },
    } as never);
  });

  it.each([
    ['perpsDeposit', TransactionType.perpsDeposit],
    ['perpsDepositAndOrder', TransactionType.perpsDepositAndOrder],
    ['predictDeposit', TransactionType.predictDeposit],
    ['predictDepositAndOrder', TransactionType.predictDepositAndOrder],
  ])(
    'selects money account for %s when it has a balance and the EOA has no tokens',
    (_label, type) => {
      mockMoneyAccountPay({ type });

      const { result } = runHook();

      expect(result.current.shouldSelect).toBe(true);
      expect(applyMoneyAccountOverrideMock).toHaveBeenCalledWith(
        transactionIdMock,
        MONEY_ACCOUNT_ADDRESS_MOCK,
        expect.objectContaining({ type, id: transactionIdMock }),
      );
    },
  );

  it('selects money account when it has the highest balance', () => {
    mockMoneyAccountPay({ balance: '76' });
    const availableTokens = [
      {
        address: '0x1234567890abcdef1234567890abcdef12345678',
        chainId: '0x1',
        fiat: { balance: 2 },
      },
    ] as AssetType[];

    const { result } = runHook({ availableTokens });

    expect(result.current.shouldSelect).toBe(true);
    expect(applyMoneyAccountOverrideMock).toHaveBeenCalled();
  });

  it('keeps the highest-balance preferred token selected', () => {
    const preferredToken = {
      address: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: '0x1',
      fiat: { balance: 20 },
    };
    mockMoneyAccountPay({ balance: '15' });
    selectMetaMaskPayTokensFlagsMock.mockReturnValue({
      preferredTokens: {
        default: [{ ...preferredToken, successRate: 1 }],
        overrides: {},
      },
      minimumRequiredTokenBalance: 10,
      blockedTokens: { default: { chainIds: [], tokens: [] }, overrides: {} },
    });
    const { result } = runHook({
      availableTokens: [preferredToken] as AssetType[],
    });

    expect(result.current.shouldSelect).toBe(false);
    expect(applyMoneyAccountOverrideMock).not.toHaveBeenCalled();
  });

  it('selects money account above the minimum when the highest token is not preferred', () => {
    mockMoneyAccountPay({ balance: '10' });
    const availableTokens = [
      {
        address: '0x1234567890abcdef1234567890abcdef12345678',
        chainId: '0x1',
        fiat: { balance: 20 },
      },
    ] as AssetType[];

    const { result } = runHook({ availableTokens });

    expect(result.current.shouldSelect).toBe(true);
    expect(applyMoneyAccountOverrideMock).toHaveBeenCalled();
  });

  it('keeps the highest token selected when money account is below the minimum', () => {
    mockMoneyAccountPay({ balance: '9.99' });
    const availableTokens = [
      {
        address: '0x1234567890abcdef1234567890abcdef12345678',
        chainId: '0x1',
        fiat: { balance: 20 },
      },
    ] as AssetType[];

    const { result } = runHook({ availableTokens });

    expect(result.current.shouldSelect).toBe(false);
    expect(applyMoneyAccountOverrideMock).not.toHaveBeenCalled();
  });

  it('does not select money account when its balance is 0', () => {
    mockMoneyAccountPay({ balance: '0' });

    const { result } = runHook();

    expect(result.current.shouldSelect).toBe(false);
    expect(applyMoneyAccountOverrideMock).not.toHaveBeenCalled();
  });

  it('does not select money account when the transaction type is not enabled', () => {
    mockMoneyAccountPay({ enabled: false });

    runHook();

    expect(applyMoneyAccountOverrideMock).not.toHaveBeenCalled();
  });

  it('returns pending while money account balance is loading', () => {
    mockMoneyAccountPay({ isBalanceLoading: true });

    const { result } = runHook();

    expect(result.current.isPending).toBe(true);
    expect(result.current.shouldSelect).toBe(false);
    expect(applyMoneyAccountOverrideMock).not.toHaveBeenCalled();
  });

  it('selects money account after balance loads when the EOA has no tokens', () => {
    mockMoneyAccountPay({ isBalanceLoading: true });

    const { rerender, result } = runHook();

    expect(applyMoneyAccountOverrideMock).not.toHaveBeenCalled();

    useMoneyAccountBalanceMock.mockReturnValue({
      isBalanceLoading: false,
      withdrawableFiatRaw: '7.61',
      withdrawableMusd: new BigNumber('7.61'),
    } as never);

    rerender(undefined);

    expect(result.current.shouldSelect).toBe(true);
    expect(applyMoneyAccountOverrideMock).toHaveBeenCalledWith(
      transactionIdMock,
      MONEY_ACCOUNT_ADDRESS_MOCK,
      expect.objectContaining({ type: TransactionType.perpsDeposit }),
    );
  });

  it('does not select money account for a hardware wallet', () => {
    mockMoneyAccountPay();
    isHardwareAccountMock.mockReturnValue(true);

    runHook();

    expect(applyMoneyAccountOverrideMock).not.toHaveBeenCalled();
  });

  it('does not select money account when auto-selecting fiat payment', () => {
    mockMoneyAccountPay();

    runHook({ autoSelectFiatPayment: true });

    expect(applyMoneyAccountOverrideMock).not.toHaveBeenCalled();
  });

  it('does not select money account when a pay token is already selected', () => {
    mockMoneyAccountPay();

    runHook({ payTokenSelected: true });

    expect(applyMoneyAccountOverrideMock).not.toHaveBeenCalled();
  });

  it('does not select money account when a fiat payment method is selected', () => {
    mockMoneyAccountPay();

    runHook({ hasFiatPaymentSelected: true });

    expect(applyMoneyAccountOverrideMock).not.toHaveBeenCalled();
  });

  it('does not select money account when payment override is already MoneyAccount', () => {
    mockMoneyAccountPay();
    selectPaymentOverrideMock.mockReturnValue(PaymentOverride.MoneyAccount);

    runHook();

    expect(applyMoneyAccountOverrideMock).not.toHaveBeenCalled();
  });

  it('does not select money account when disabled', () => {
    mockMoneyAccountPay();

    runHook({ disable: true });

    expect(applyMoneyAccountOverrideMock).not.toHaveBeenCalled();
  });
});

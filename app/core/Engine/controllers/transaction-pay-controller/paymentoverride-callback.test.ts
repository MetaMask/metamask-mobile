import { CHAIN_IDS } from '@metamask/transaction-controller';
import { PaymentOverride } from '@metamask/transaction-pay-controller';
import type { Hex } from '@metamask/utils';
import { getMoneyAccountWithdrawTransactionsData } from '../../../../components/UI/Money/utils/moneyAccountTransactions';
import ReduxService from '../../../../core/redux/ReduxService';
import { selectTransactionDataByTransactionId } from '../../../../selectors/transactionPayController';
import { getBridgeInfo } from '@metamask/perps-controller/constants/hyperLiquidConfig';
import { createPaymentOverrideCallback } from './paymentoverride-callback';

jest.mock('../../../../components/UI/Money/utils/moneyAccountTransactions');
jest.mock('../../../../core/redux/ReduxService', () => ({
  __esModule: true,
  default: { store: { getState: jest.fn() } },
}));
jest.mock('../../../../selectors/transactionPayController');
jest.mock('@metamask/perps-controller/constants/hyperLiquidConfig', () => ({
  getBridgeInfo: jest.fn(),
}));

const mockGetBridgeInfo = jest.mocked(getBridgeInfo);
const mockGetMoneyAccountWithdrawTransactionsData = jest.mocked(
  getMoneyAccountWithdrawTransactionsData,
);
const mockSelectTransactionDataByTransactionId = jest.mocked(
  selectTransactionDataByTransactionId,
);

const TRANSACTION_ID_MOCK = 'tx-1';
const MOCK_CHAIN_ID = '0xa4b1' as Hex;
const MOCK_AMOUNT_HUMAN = '10.5';
const MAINNET_BRIDGE_ADDRESS =
  '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7' as Hex;

const MOCK_TX_PARAMS = [
  { to: '0xTeller', data: '0xwithdraw', value: '0x0' },
  { to: '0xMusd', data: '0xtransfer', value: '0x0' },
];

describe('createPaymentOverrideCallback', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (
      jest.mocked(ReduxService) as unknown as { store: { getState: jest.Mock } }
    ).store = { getState: jest.fn().mockReturnValue({}) };
    mockGetBridgeInfo.mockReturnValue({
      contractAddress: MAINNET_BRIDGE_ADDRESS,
    } as never);
  });

  const VALID_TX_DATA = {
    paymentOverride: PaymentOverride.MoneyAccount,
    isPostQuote: false,
    tokens: [{ chainId: MOCK_CHAIN_ID, amountHuman: MOCK_AMOUNT_HUMAN }],
  };

  it('returns empty array when paymentOverride is not MoneyAccount', async () => {
    mockSelectTransactionDataByTransactionId.mockReturnValue({
      ...VALID_TX_DATA,
      paymentOverride: PaymentOverride.Perps,
    } as never);

    const callback = createPaymentOverrideCallback();
    const result = await callback(TRANSACTION_ID_MOCK);

    expect(result).toEqual([]);
    expect(mockGetMoneyAccountWithdrawTransactionsData).not.toHaveBeenCalled();
  });

  it('returns empty array when paymentOverride is undefined', async () => {
    mockSelectTransactionDataByTransactionId.mockReturnValue({
      ...VALID_TX_DATA,
      paymentOverride: undefined,
    } as never);

    const callback = createPaymentOverrideCallback();
    const result = await callback(TRANSACTION_ID_MOCK);

    expect(result).toEqual([]);
    expect(mockGetMoneyAccountWithdrawTransactionsData).not.toHaveBeenCalled();
  });

  it('returns empty array when isPostQuote is true', async () => {
    mockSelectTransactionDataByTransactionId.mockReturnValue({
      ...VALID_TX_DATA,
      isPostQuote: true,
    } as never);

    const callback = createPaymentOverrideCallback();
    const result = await callback(TRANSACTION_ID_MOCK);

    expect(result).toEqual([]);
    expect(mockGetMoneyAccountWithdrawTransactionsData).not.toHaveBeenCalled();
  });

  it('returns empty array when transaction data has no tokens', async () => {
    mockSelectTransactionDataByTransactionId.mockReturnValue(
      undefined as never,
    );

    const callback = createPaymentOverrideCallback();
    const result = await callback(TRANSACTION_ID_MOCK);

    expect(result).toEqual([]);
    expect(mockGetMoneyAccountWithdrawTransactionsData).not.toHaveBeenCalled();
  });

  it('returns empty array when tokens array is empty', async () => {
    mockSelectTransactionDataByTransactionId.mockReturnValue({
      ...VALID_TX_DATA,
      tokens: [],
    } as never);

    const callback = createPaymentOverrideCallback();
    const result = await callback(TRANSACTION_ID_MOCK);

    expect(result).toEqual([]);
    expect(mockGetMoneyAccountWithdrawTransactionsData).not.toHaveBeenCalled();
  });

  it('calls getMoneyAccountWithdrawTransactionsData with Monad chain ID and mainnet bridge address', async () => {
    mockSelectTransactionDataByTransactionId.mockReturnValue(
      VALID_TX_DATA as never,
    );
    mockGetMoneyAccountWithdrawTransactionsData.mockResolvedValue(
      MOCK_TX_PARAMS as never,
    );

    const callback = createPaymentOverrideCallback();
    await callback(TRANSACTION_ID_MOCK);

    expect(mockGetBridgeInfo).toHaveBeenCalledWith(false);
    expect(mockGetMoneyAccountWithdrawTransactionsData).toHaveBeenCalledWith(
      CHAIN_IDS.MONAD,
      MOCK_AMOUNT_HUMAN,
      MAINNET_BRIDGE_ADDRESS,
    );
  });

  it('returns transaction params from getMoneyAccountWithdrawTransactionsData', async () => {
    mockSelectTransactionDataByTransactionId.mockReturnValue(
      VALID_TX_DATA as never,
    );
    mockGetMoneyAccountWithdrawTransactionsData.mockResolvedValue(
      MOCK_TX_PARAMS as never,
    );

    const callback = createPaymentOverrideCallback();
    const result = await callback(TRANSACTION_ID_MOCK);

    expect(result).toBe(MOCK_TX_PARAMS);
  });

  it('returns empty array when getMoneyAccountWithdrawTransactionsData returns []', async () => {
    mockSelectTransactionDataByTransactionId.mockReturnValue(
      VALID_TX_DATA as never,
    );
    mockGetMoneyAccountWithdrawTransactionsData.mockResolvedValue([]);

    const callback = createPaymentOverrideCallback();
    const result = await callback(TRANSACTION_ID_MOCK);

    expect(result).toEqual([]);
  });
});

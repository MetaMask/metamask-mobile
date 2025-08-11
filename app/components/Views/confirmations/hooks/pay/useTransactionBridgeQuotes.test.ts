import { TransactionMeta } from '@metamask/transaction-controller';
import { useTransactionPayToken } from './useTransactionPayToken';
import { useTransactionPayTokenAmounts } from './useTransactionPayTokenAmounts';
import {
  TransactionToken,
  useTransactionRequiredTokens,
} from './useTransactionRequiredTokens';
import { useTransactionBridgeQuotes } from './useTransactionBridgeQuotes';
import { TransactionBridgeQuote, getBridgeQuotes } from '../../utils/bridge';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { act } from '@testing-library/react-native';
// eslint-disable-next-line import/no-namespace
import * as confirmationReducer from '../../../../../core/redux/slices/confirmationMetrics';
import { useTransactionMetadataOrThrow } from '../transactions/useTransactionMetadataRequest';

jest.mock('./useTransactionRequiredTokens');
jest.mock('./useTransactionPayToken');
jest.mock('./useTransactionPayTokenAmounts');
jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../../utils/bridge');

const TRANSACTION_ID_MOCK = '1234-5678';
const CHAIN_ID_SOURCE_MOCK = '0x1';
const CHAIN_ID_TARGET_MOCK = '0x2';
const TOKEN_ADDRESS_SOURCE_MOCK = '0x123';
const TOKEN_ADDRESS_TARGET_1_MOCK = '0x456';
const TOKEN_ADDRESS_TARGET_2_MOCK = '0x789';
const ACCOUNT_ADDRESS_MOCK = '0xabc';
const SOURCE_AMOUNT_1_MOCK = '1234';
const SOURCE_AMOUNT_2_MOCK = '5678';

const QUOTE_MOCK = {
  quote: {},
} as TransactionBridgeQuote;

function runHook() {
  return renderHookWithProvider(useTransactionBridgeQuotes, { state: {} })
    .result;
}

describe('useTransactionBridgeQuotes', () => {
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const getBridgeQuotesMock = jest.mocked(getBridgeQuotes);

  const useTransactionRequiredTokensMock = jest.mocked(
    useTransactionRequiredTokens,
  );

  const useTransactionPayTokenAmountsMock = jest.mocked(
    useTransactionPayTokenAmounts,
  );

  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataOrThrow,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionMetadataRequestMock.mockReturnValue({
      id: TRANSACTION_ID_MOCK,
      chainId: CHAIN_ID_TARGET_MOCK,
      txParams: {
        from: ACCOUNT_ADDRESS_MOCK,
      },
    } as unknown as TransactionMeta);

    useTransactionPayTokenMock.mockReturnValue({
      balanceFiat: '123.456',
      balanceHuman: '123.456',
      decimals: 4,
      payToken: {
        address: TOKEN_ADDRESS_SOURCE_MOCK,
        chainId: CHAIN_ID_SOURCE_MOCK,
      },
      setPayToken: jest.fn(),
    });

    useTransactionRequiredTokensMock.mockReturnValue([
      {
        address: TOKEN_ADDRESS_TARGET_1_MOCK,
      },
      {
        address: TOKEN_ADDRESS_TARGET_2_MOCK,
      },
    ] as unknown as TransactionToken[]);

    useTransactionPayTokenAmountsMock.mockReturnValue({
      amounts: [
        { amountRaw: SOURCE_AMOUNT_1_MOCK },
        { amountRaw: SOURCE_AMOUNT_2_MOCK },
      ],
    } as ReturnType<typeof useTransactionPayTokenAmounts>);

    getBridgeQuotesMock.mockResolvedValue([QUOTE_MOCK, QUOTE_MOCK]);
  });

  it('requests bridge quotes', () => {
    runHook();

    expect(getBridgeQuotesMock).toHaveBeenCalledWith([
      {
        from: ACCOUNT_ADDRESS_MOCK,
        sourceChainId: CHAIN_ID_SOURCE_MOCK,
        sourceTokenAddress: TOKEN_ADDRESS_SOURCE_MOCK,
        sourceTokenAmount: SOURCE_AMOUNT_1_MOCK,
        targetChainId: CHAIN_ID_TARGET_MOCK,
        targetTokenAddress: TOKEN_ADDRESS_TARGET_1_MOCK,
      },
      {
        from: ACCOUNT_ADDRESS_MOCK,
        sourceChainId: CHAIN_ID_SOURCE_MOCK,
        sourceTokenAddress: TOKEN_ADDRESS_SOURCE_MOCK,
        sourceTokenAmount: SOURCE_AMOUNT_2_MOCK,
        targetChainId: CHAIN_ID_TARGET_MOCK,
        targetTokenAddress: TOKEN_ADDRESS_TARGET_2_MOCK,
      },
    ]);
  });

  it('returns bridge quotes', async () => {
    const result = runHook();

    await act(async () => {
      // Intentionally empty
    });

    expect(result.current.quotes).toEqual([QUOTE_MOCK, QUOTE_MOCK]);
  });

  it('sets transaction bridge quotes in state', async () => {
    const setTransactionBridgeQuotesMock = jest.spyOn(
      confirmationReducer,
      'setTransactionBridgeQuotes',
    );

    runHook();

    await act(async () => {
      // Intentionally empty
    });

    expect(setTransactionBridgeQuotesMock).toHaveBeenCalledWith({
      transactionId: TRANSACTION_ID_MOCK,
      quotes: [QUOTE_MOCK, QUOTE_MOCK],
    });
  });
});

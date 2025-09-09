import { TransactionMeta } from '@metamask/transaction-controller';
import { useTransactionPayToken } from './useTransactionPayToken';
import { useTransactionPayTokenAmounts } from './useTransactionPayTokenAmounts';
import { useTransactionBridgeQuotes } from './useTransactionBridgeQuotes';
import { TransactionBridgeQuote, getBridgeQuotes } from '../../utils/bridge';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { act } from '@testing-library/react-native';
// eslint-disable-next-line import/no-namespace
import * as confirmationReducer from '../../../../../core/redux/slices/confirmationMetrics';
import { useTransactionMetadataOrThrow } from '../transactions/useTransactionMetadataRequest';
import { Hex } from '@metamask/utils';
import { useAlerts } from '../../context/alert-system-context';
import { AlertKeys } from '../../constants/alerts';
import {
  ATTEMPTS_MAX_DEFAULT,
  BUFFER_INITIAL_DEFAULT,
  BUFFER_STEP_DEFAULT,
  BUFFER_SUBSEQUENT_DEFAULT,
  SLIPPAGE_DEFAULT,
} from '../../../../../selectors/featureFlagController/confirmations';
import { initialState } from '../../../../UI/Bridge/_mocks_/initialState';

jest.mock('./useTransactionPayToken');
jest.mock('./useTransactionPayTokenAmounts');
jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../../utils/bridge');
jest.mock('../../context/alert-system-context');

jest.mock(
  '../../../../../core/redux/slices/bridge/utils/hasMinimumRequiredVersion',
  () => ({
    hasMinimumRequiredVersion: jest.fn().mockReturnValue(true),
  }),
);

jest.useFakeTimers();

const TRANSACTION_ID_MOCK = '1234-5678';
const CHAIN_ID_SOURCE_MOCK = '0x1';
const CHAIN_ID_TARGET_MOCK = '0x2';
const TOKEN_ADDRESS_SOURCE_MOCK = '0x123';
const TOKEN_ADDRESS_TARGET_1_MOCK = '0x456' as Hex;
const TOKEN_ADDRESS_TARGET_2_MOCK = '0x789' as Hex;
const ACCOUNT_ADDRESS_MOCK = '0xabc';
const SOURCE_AMOUNT_1_MOCK = '1234';
const SOURCE_AMOUNT_2_MOCK = '5678';
const MINIMUM_TOKEN_AMOUNT_1_MOCK = '123';
const MINIMUM_TOKEN_AMOUNT_2_MOCK = '234';
const SOURCE_BALANCE_RAW_MOCK = '1234560';

const QUOTE_MOCK = {
  quote: {},
} as TransactionBridgeQuote;

function runHook() {
  return renderHookWithProvider(useTransactionBridgeQuotes, {
    state: initialState,
  });
}

describe('useTransactionBridgeQuotes', () => {
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const getBridgeQuotesMock = jest.mocked(getBridgeQuotes);
  const useAlertsMock = jest.mocked(useAlerts);

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
      payToken: {
        address: TOKEN_ADDRESS_SOURCE_MOCK,
        balance: '123.456',
        balanceFiat: '123.456',
        balanceRaw: SOURCE_BALANCE_RAW_MOCK,
        chainId: CHAIN_ID_SOURCE_MOCK,
        decimals: 4,
        symbol: 'TST',
        tokenFiatAmount: 123.456,
      },
      setPayToken: jest.fn(),
    });

    useTransactionPayTokenAmountsMock.mockReturnValue({
      amounts: [
        {
          address: TOKEN_ADDRESS_TARGET_1_MOCK,
          amountRaw: SOURCE_AMOUNT_1_MOCK,
          targetAmountRaw: MINIMUM_TOKEN_AMOUNT_1_MOCK,
        },
        {
          address: TOKEN_ADDRESS_TARGET_2_MOCK,
          amountRaw: SOURCE_AMOUNT_2_MOCK,
          targetAmountRaw: MINIMUM_TOKEN_AMOUNT_2_MOCK,
        },
      ],
    } as ReturnType<typeof useTransactionPayTokenAmounts>);

    getBridgeQuotesMock.mockResolvedValue([QUOTE_MOCK, QUOTE_MOCK]);

    useAlertsMock.mockReturnValue({
      alerts: [],
    } as unknown as ReturnType<typeof useAlerts>);
  });

  it('requests bridge quotes', () => {
    runHook();

    expect(getBridgeQuotesMock).toHaveBeenCalledWith([
      {
        attemptsMax: ATTEMPTS_MAX_DEFAULT,
        bufferInitial: BUFFER_INITIAL_DEFAULT,
        bufferStep: BUFFER_STEP_DEFAULT,
        bufferSubsequent: BUFFER_SUBSEQUENT_DEFAULT,
        from: ACCOUNT_ADDRESS_MOCK,
        slippage: SLIPPAGE_DEFAULT,
        sourceBalanceRaw: SOURCE_BALANCE_RAW_MOCK,
        sourceChainId: CHAIN_ID_SOURCE_MOCK,
        sourceTokenAddress: TOKEN_ADDRESS_SOURCE_MOCK,
        sourceTokenAmount: SOURCE_AMOUNT_1_MOCK,
        targetAmountMinimum: MINIMUM_TOKEN_AMOUNT_1_MOCK,
        targetChainId: CHAIN_ID_TARGET_MOCK,
        targetTokenAddress: TOKEN_ADDRESS_TARGET_1_MOCK,
      },
      {
        attemptsMax: ATTEMPTS_MAX_DEFAULT,
        bufferInitial: BUFFER_INITIAL_DEFAULT,
        bufferStep: BUFFER_STEP_DEFAULT,
        bufferSubsequent: BUFFER_SUBSEQUENT_DEFAULT,
        from: ACCOUNT_ADDRESS_MOCK,
        slippage: SLIPPAGE_DEFAULT,
        sourceBalanceRaw: SOURCE_BALANCE_RAW_MOCK,
        sourceChainId: CHAIN_ID_SOURCE_MOCK,
        sourceTokenAddress: TOKEN_ADDRESS_SOURCE_MOCK,
        sourceTokenAmount: SOURCE_AMOUNT_2_MOCK,
        targetAmountMinimum: MINIMUM_TOKEN_AMOUNT_2_MOCK,
        targetChainId: CHAIN_ID_TARGET_MOCK,
        targetTokenAddress: TOKEN_ADDRESS_TARGET_2_MOCK,
      },
    ]);
  });

  it('returns bridge quotes', async () => {
    const { result } = runHook();

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

  it('returns empty list if no selected pay token', async () => {
    useTransactionPayTokenMock.mockReturnValue({
      payToken: undefined,
    } as unknown as ReturnType<typeof useTransactionPayToken>);

    const { result } = runHook();

    await act(async () => {
      // Intentionally empty
    });

    expect(result.current.quotes).toStrictEqual([]);
  });

  it('returns empty list if blocking alert', async () => {
    useAlertsMock.mockReturnValue({
      alerts: [
        {
          key: 'alert-key',
          isBlocking: true,
        },
      ],
    } as unknown as ReturnType<typeof useAlerts>);

    const { result } = runHook();

    await act(async () => {
      // Intentionally empty
    });

    expect(result.current.quotes).toStrictEqual([]);
  });

  it.each([AlertKeys.NoPayTokenQuotes, AlertKeys.InsufficientPayTokenNative])(
    'returns empty list if blocking alert unless %s alert',
    async (alertKey) => {
      useAlertsMock.mockReturnValue({
        alerts: [
          {
            key: alertKey,
            isBlocking: true,
          },
        ],
      } as unknown as ReturnType<typeof useAlerts>);

      const { result } = runHook();

      await act(async () => {
        // Intentionally empty
      });

      expect(result.current.quotes).toStrictEqual([QUOTE_MOCK, QUOTE_MOCK]);
    },
  );

  it('refreshes quotes', async () => {
    runHook();

    await act(async () => {
      // Intentionally empty
    });

    await act(async () => {
      await jest.advanceTimersByTimeAsync(29000);
    });

    expect(getBridgeQuotesMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(2000);
    });

    expect(getBridgeQuotesMock).toHaveBeenCalledTimes(2);
  });
});

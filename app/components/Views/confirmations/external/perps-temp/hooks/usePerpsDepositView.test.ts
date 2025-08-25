import { merge } from 'lodash';
import { renderHookWithProvider } from '../../../../../../util/test/renderWithProvider';
import { transactionApprovalControllerMock } from '../../../__mocks__/controllers/approval-controller-mock';
import {
  simpleSendTransactionControllerMock,
  transactionIdMock,
} from '../../../__mocks__/controllers/transaction-controller-mock';
import { useTokenAmount } from '../../../hooks/useTokenAmount';
import { usePerpsDepositView } from './usePerpsDepositView';
import { TransactionBridgeQuote } from '../../../utils/bridge';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';

jest.mock('./usePerpsDepositInit');
jest.mock('../../../hooks/useTokenAmount');
jest.mock('../../../hooks/pay/useAutomaticTransactionPayToken');
jest.mock('../../../hooks/pay/useTransactionPayToken');

function runHook(
  props: Parameters<typeof usePerpsDepositView>[0],
  {
    isLoading,
    quotes,
  }: {
    isLoading?: boolean;
    quotes?: Partial<TransactionBridgeQuote>[];
  } = {},
) {
  const state = merge(
    {},
    simpleSendTransactionControllerMock,
    transactionApprovalControllerMock,
    {
      confirmationMetrics: {
        transactionBridgeQuotesById: {
          [transactionIdMock]: quotes,
        },
        isTransactionBridgeQuotesLoadingById: {
          [transactionIdMock]: isLoading,
        },
      },
    },
  );

  return renderHookWithProvider(() => usePerpsDepositView(props), {
    state,
  });
}

describe('usePerpsDepositView', () => {
  const useTokenAmountMock = jest.mocked(useTokenAmount);
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);

  beforeEach(() => {
    jest.resetAllMocks();

    useTokenAmountMock.mockReturnValue({
      amountUnformatted: '1',
    } as ReturnType<typeof useTokenAmount>);

    useTransactionPayTokenMock.mockReturnValue({
      payToken: undefined,
    } as ReturnType<typeof useTransactionPayToken>);
  });

  it('returns isFullView as true if keyboard hidden and amount is non-zero with quotes loading', () => {
    const { result } = runHook(
      {
        isKeyboardVisible: false,
      },
      {
        isLoading: true,
      },
    );

    expect(result.current.isFullView).toBe(true);
  });

  it('returns isFullView as true if keyboard hidden and amount is non-zero with quotes', () => {
    const { result } = runHook(
      {
        isKeyboardVisible: false,
      },
      {
        quotes: [{}],
      },
    );

    expect(result.current.isFullView).toBe(true);
  });

  it('returns isFullView as false if keyboard visible', () => {
    const { result } = runHook(
      {
        isKeyboardVisible: true,
      },
      {
        quotes: [{}],
      },
    );

    expect(result.current.isFullView).toBe(false);
  });

  it('returns isFullView as false if amount is zero', () => {
    useTokenAmountMock.mockReturnValue({
      amountUnformatted: '0',
    } as ReturnType<typeof useTokenAmount>);

    const { result } = runHook(
      {
        isKeyboardVisible: false,
      },
      {
        quotes: [{}],
      },
    );

    expect(result.current.isFullView).toBe(false);
  });

  it('returns isFullView as false if quotes are undefined', () => {
    const { result } = runHook(
      {
        isKeyboardVisible: false,
      },
      {},
    );

    expect(result.current.isFullView).toBe(false);
  });

  it('returns isFullView as true if quotes are empty', () => {
    const { result } = runHook(
      {
        isKeyboardVisible: false,
      },
      {
        quotes: [],
      },
    );

    expect(result.current.isFullView).toBe(true);
  });

  it('returns isPayTokenSelected as false if payment token not selected', () => {
    const { result } = runHook({ isKeyboardVisible: false });
    expect(result.current.isPayTokenSelected).toBe(false);
  });

  it('returns isPayTokenSelected as true if payment token selected', () => {
    useTransactionPayTokenMock.mockReturnValue({
      payToken: {},
    } as ReturnType<typeof useTransactionPayToken>);

    const { result } = runHook({ isKeyboardVisible: false });

    expect(result.current.isPayTokenSelected).toBe(true);
  });
});

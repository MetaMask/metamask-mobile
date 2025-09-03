import { merge } from 'lodash';
import { renderHookWithProvider } from '../../../../../../util/test/renderWithProvider';
import { transactionApprovalControllerMock } from '../../../__mocks__/controllers/approval-controller-mock';
import {
  simpleSendTransactionControllerMock,
  transactionIdMock,
} from '../../../__mocks__/controllers/transaction-controller-mock';
import { useTokenAmount } from '../../../hooks/useTokenAmount';
import { usePerpsDepositView } from './usePerpsDepositView';

jest.mock('./usePerpsDepositInit');
jest.mock('../../../hooks/useTokenAmount');
jest.mock('../../../hooks/pay/useAutomaticTransactionPayToken');

function runHook(
  props: Parameters<typeof usePerpsDepositView>[0],
  {
    isLoading,
    hasQuotes,
  }: {
    isLoading?: boolean;
    hasQuotes?: boolean;
  } = {},
) {
  const state = merge(
    {},
    simpleSendTransactionControllerMock,
    transactionApprovalControllerMock,
    {
      confirmationMetrics: {
        transactionBridgeQuotesById: {
          [transactionIdMock]: hasQuotes ? [{}] : undefined,
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

  beforeEach(() => {
    jest.resetAllMocks();

    useTokenAmountMock.mockReturnValue({
      amountUnformatted: '1',
    } as ReturnType<typeof useTokenAmount>);
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
        hasQuotes: true,
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
        hasQuotes: true,
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
        hasQuotes: true,
      },
    );

    expect(result.current.isFullView).toBe(false);
  });
});

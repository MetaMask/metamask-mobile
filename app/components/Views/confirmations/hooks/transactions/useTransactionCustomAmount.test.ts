import { merge } from 'lodash';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useTransactionCustomAmount } from './useTransactionCustomAmount';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { otherControllersMock } from '../../__mocks__/controllers/other-controllers-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { act } from 'react';
import { useTokenFiatRate } from '../tokens/useTokenFiatRates';
import { useTokenAmount } from '../useTokenAmount';

jest.mock('../tokens/useTokenFiatRates');
jest.mock('../useTokenAmount');

function runHook() {
  return renderHookWithProvider(useTransactionCustomAmount, {
    state: merge(
      {},
      simpleSendTransactionControllerMock,
      transactionApprovalControllerMock,
      otherControllersMock,
    ),
  });
}

describe('useTransactionCustomAmount', () => {
  const useTokenFiatRateMock = jest.mocked(useTokenFiatRate);
  const useTokenAmountMock = jest.mocked(useTokenAmount);

  const updateTokenAmountMock: ReturnType<
    typeof useTokenAmount
  >['updateTokenAmount'] = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();

    useTokenFiatRateMock.mockReturnValue(2);

    useTokenAmountMock.mockReturnValue({
      updateTokenAmount: updateTokenAmountMock,
    } as ReturnType<typeof useTokenAmount>);
  });

  it('returns pending amount provided by updatePendingAmount', async () => {
    const { result } = runHook();

    await act(async () => {
      result.current.updatePendingAmount('123.45');
    });

    expect(result.current.amountFiat).toBe('123.45');
  });

  it('returns amount human calculated from fiat amount', async () => {
    const { result } = runHook();

    await act(async () => {
      result.current.updatePendingAmount('123.45');
    });

    expect(result.current.amountHuman).toBe('61.725');
  });

  it('returns amount fiat as zero if value empty', async () => {
    const { result } = runHook();

    await act(async () => {
      result.current.updatePendingAmount('');
    });

    expect(result.current.amountFiat).toBe('0');
  });

  it('returns amount fiat as zero if value has multiple leading zeroes', async () => {
    const { result } = runHook();

    await act(async () => {
      result.current.updatePendingAmount('000123');
    });

    expect(result.current.amountFiat).toBe('123');
  });

  it.each([',', '.'])(
    'adds leading zero to amount fiat if starts with %s',
    async (char) => {
      const { result } = runHook();

      await act(async () => {
        result.current.updatePendingAmount(char + '123');
      });

      expect(result.current.amountFiat).toBe('0' + char + '123');
    },
  );

  it('ignores value if length greater than max', async () => {
    const { result } = runHook();

    await act(async () => {
      result.current.updatePendingAmount('1'.repeat(26));
      result.current.updatePendingAmount('1'.repeat(27));
      result.current.updatePendingAmount('1'.repeat(28));
    });

    expect(result.current.amountFiat).toBe('1'.repeat(27));
  });

  it('updateTokenAmount updates token amount in transaction data', async () => {
    const { result } = runHook();

    await act(async () => {
      result.current.updatePendingAmount('123.45');
    });

    await act(async () => {
      result.current.updateTokenAmount();
    });

    expect(updateTokenAmountMock).toHaveBeenCalledWith('61.725');
  });
});

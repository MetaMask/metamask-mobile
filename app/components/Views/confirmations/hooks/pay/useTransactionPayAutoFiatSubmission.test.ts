import { renderHook, act } from '@testing-library/react-hooks';

import { useTransactionPayAutoFiatSubmission } from './useTransactionPayAutoFiatSubmission';
import { useTransactionConfirm } from '../transactions/useTransactionConfirm';
import { useTransactionPayFiatPayment } from './useTransactionPayData';
import { flushPromises } from '../../../../../util/test/utils';

jest.mock('../transactions/useTransactionConfirm');
jest.mock('./useTransactionPayData');

describe('useTransactionPayAutoFiatSubmission', () => {
  const onConfirmMock = jest.fn().mockResolvedValue(undefined);
  const useTransactionConfirmMock = jest.mocked(useTransactionConfirm);
  const useTransactionPayFiatPaymentMock = jest.mocked(
    useTransactionPayFiatPayment,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    onConfirmMock.mockResolvedValue(undefined);
    useTransactionConfirmMock.mockReturnValue({ onConfirm: onConfirmMock });
    useTransactionPayFiatPaymentMock.mockReturnValue(undefined);
  });

  it('does not auto-submit when fiatPayment is undefined', async () => {
    renderHook(() => useTransactionPayAutoFiatSubmission());

    await act(async () => {
      await flushPromises();
    });

    expect(onConfirmMock).not.toHaveBeenCalled();
  });

  it('does not auto-submit when selectedPaymentMethodId is missing', async () => {
    useTransactionPayFiatPaymentMock.mockReturnValue({
      amountFiat: '50.00',
      orderCode: 'order-1',
    } as never);

    renderHook(() => useTransactionPayAutoFiatSubmission());

    await act(async () => {
      await flushPromises();
    });

    expect(onConfirmMock).not.toHaveBeenCalled();
  });

  it('does not auto-submit when orderCode is missing', async () => {
    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: 'pm-123',
      amountFiat: '50.00',
    });

    renderHook(() => useTransactionPayAutoFiatSubmission());

    await act(async () => {
      await flushPromises();
    });

    expect(onConfirmMock).not.toHaveBeenCalled();
  });

  it('auto-submits when orderCode and selectedPaymentMethodId are present', async () => {
    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: 'pm-123',
      amountFiat: '50.00',
      orderCode: 'order-abc',
    } as never);

    renderHook(() => useTransactionPayAutoFiatSubmission());

    await act(async () => {
      await flushPromises();
    });

    expect(onConfirmMock).toHaveBeenCalledTimes(1);
  });

  it('does not auto-submit same orderCode twice', async () => {
    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: 'pm-123',
      amountFiat: '50.00',
      orderCode: 'order-abc',
    } as never);

    const { rerender } = renderHook(() =>
      useTransactionPayAutoFiatSubmission(),
    );

    await act(async () => {
      await flushPromises();
    });

    expect(onConfirmMock).toHaveBeenCalledTimes(1);

    rerender();

    await act(async () => {
      await flushPromises();
    });

    expect(onConfirmMock).toHaveBeenCalledTimes(1);
  });

  it('removes orderCode from tracking on failure allowing retry', async () => {
    onConfirmMock.mockRejectedValueOnce(new Error('submission failed'));

    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: 'pm-123',
      amountFiat: '50.00',
      orderCode: 'order-abc',
    } as never);

    const { rerender } = renderHook(() =>
      useTransactionPayAutoFiatSubmission(),
    );

    await act(async () => {
      await flushPromises();
    });

    expect(onConfirmMock).toHaveBeenCalledTimes(1);

    onConfirmMock.mockResolvedValue(undefined);
    rerender();

    await act(async () => {
      await flushPromises();
    });

    expect(onConfirmMock).toHaveBeenCalledTimes(2);
  });

  it('auto-submits for a different orderCode', async () => {
    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: 'pm-123',
      amountFiat: '50.00',
      orderCode: 'order-1',
    } as never);

    const { rerender } = renderHook(() =>
      useTransactionPayAutoFiatSubmission(),
    );

    await act(async () => {
      await flushPromises();
    });

    expect(onConfirmMock).toHaveBeenCalledTimes(1);

    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: 'pm-123',
      amountFiat: '50.00',
      orderCode: 'order-2',
    } as never);

    rerender();

    await act(async () => {
      await flushPromises();
    });

    expect(onConfirmMock).toHaveBeenCalledTimes(2);
  });
});

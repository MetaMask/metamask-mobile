import Engine from '../../../../core/Engine';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { personalSignatureConfirmationState } from '../../../../util/test/confirm-data-helpers';
import PPOMUtil from '../../../../lib/ppom/ppom-util';
// eslint-disable-next-line import/no-namespace
import * as QRHardwareHook from '../context/QRHardwareContext/QRHardwareContext';
import { useConfirmActions } from './useConfirmActions';

jest.mock('../../../../core/Engine', () => ({
  acceptPendingApproval: jest.fn(),
  rejectPendingApproval: jest.fn(),
}));

const mockCaptureSignatureMetrics = jest.fn();
jest.mock('./useSignatureMetrics', () => ({
  useSignatureMetrics: () => ({
    captureSignatureMetrics: mockCaptureSignatureMetrics,
  }),
}));

const flushPromises = async () => await new Promise(process.nextTick);

describe('useConfirmAction', () => {
  afterEach(() => {
    mockCaptureSignatureMetrics.mockClear();
  });

  it('call setScannerVisible if QR signing is in progress', async () => {
    const clearSecurityAlertResponseSpy = jest.spyOn(
      PPOMUtil,
      'clearSignatureSecurityAlertResponse',
    );
    const mockSetScannerVisible = jest.fn().mockResolvedValue(undefined);
    jest
      .spyOn(QRHardwareHook, 'useQRHardwareContext')
      .mockReturnValue({
        isQRSigningInProgress: true,
        setScannerVisible: mockSetScannerVisible,
      } as unknown as QRHardwareHook.QRHardwareContextType);
    const { result } = renderHookWithProvider(() => useConfirmActions(), {
      state: personalSignatureConfirmationState,
    });
    result?.current?.onConfirm();
    expect(mockSetScannerVisible).toHaveBeenCalledTimes(1);
    expect(mockSetScannerVisible).toHaveBeenLastCalledWith(true);
    expect(Engine.acceptPendingApproval).toHaveBeenCalledTimes(0);
    await flushPromises();
    expect(mockCaptureSignatureMetrics).toHaveBeenCalledTimes(0);
    expect(clearSecurityAlertResponseSpy).toHaveBeenCalledTimes(0);
  });

  it('call required callbacks when confirm button is clicked', async () => {
    const clearSecurityAlertResponseSpy = jest.spyOn(
      PPOMUtil,
      'clearSignatureSecurityAlertResponse',
    );
    const { result } = renderHookWithProvider(() => useConfirmActions(), {
      state: personalSignatureConfirmationState,
    });
    result?.current?.onConfirm();
    expect(Engine.acceptPendingApproval).toHaveBeenCalledTimes(1);
    await flushPromises();
    expect(mockCaptureSignatureMetrics).toHaveBeenCalledTimes(1);
    expect(clearSecurityAlertResponseSpy).toHaveBeenCalledTimes(1);
  });

  it('call required callbacks when reject button is clicked', async () => {
    const clearSecurityAlertResponseSpy = jest.spyOn(
      PPOMUtil,
      'clearSignatureSecurityAlertResponse',
    );
    const mockCancelQRScanRequestIfPresent = jest
      .fn()
      .mockResolvedValue(undefined);
    jest
      .spyOn(QRHardwareHook, 'useQRHardwareContext')
      .mockReturnValue({
        cancelQRScanRequestIfPresent: mockCancelQRScanRequestIfPresent,
      } as unknown as QRHardwareHook.QRHardwareContextType);
    const { result } = renderHookWithProvider(() => useConfirmActions(), {
      state: personalSignatureConfirmationState,
    });
    result?.current?.onReject();
    expect(mockCancelQRScanRequestIfPresent).toHaveBeenCalledTimes(1);
    await flushPromises();
    expect(Engine.rejectPendingApproval).toHaveBeenCalledTimes(1);
    expect(mockCaptureSignatureMetrics).toHaveBeenCalledTimes(1);
    expect(clearSecurityAlertResponseSpy).toHaveBeenCalledTimes(1);
  });
});

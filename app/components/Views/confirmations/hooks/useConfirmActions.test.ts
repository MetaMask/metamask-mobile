import Engine from '../../../../core/Engine';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { personalSignatureConfirmationState } from '../../../../util/test/confirm-data-helpers';
import PPOMUtil from '../../../../lib/ppom/ppom-util';
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
    const { result } = renderHookWithProvider(() => useConfirmActions(), {
      state: personalSignatureConfirmationState,
    });
    result?.current?.onReject();
    expect(Engine.rejectPendingApproval).toHaveBeenCalledTimes(1);
    expect(mockCaptureSignatureMetrics).toHaveBeenCalledTimes(1);
    expect(clearSecurityAlertResponseSpy).toHaveBeenCalledTimes(1);
  });
});

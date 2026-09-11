import { useNavigation } from '@react-navigation/native';

import Engine from '../../../../core/Engine';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import {
  personalSignatureConfirmationState,
  stakingDepositConfirmationState,
} from '../../../../util/test/confirm-data-helpers';
import PPOMUtil from '../../../../lib/ppom/ppom-util';
// eslint-disable-next-line import-x/no-namespace
import * as QRHardwareHook from '../context/qr-hardware-context/qr-hardware-context';
import { useConfirmReject } from './useConfirmReject';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  acceptPendingApproval: jest.fn(),
  rejectPendingApproval: jest.fn(),
  context: {
    KeyringController: {
      state: {
        keyrings: [
          {
            accounts: ['0x0000000000000000000000000000000000000000'],
          },
        ],
      },
    },
  },
}));

const mockCaptureSignatureMetrics = jest.fn();
jest.mock('./signatures/useSignatureMetrics', () => ({
  useSignatureMetrics: () => ({
    captureSignatureMetrics: mockCaptureSignatureMetrics,
  }),
}));

const flushPromises = async () => await new Promise(process.nextTick);

describe('useConfirmReject', () => {
  const useNavigationMock = jest.mocked(useNavigation);

  beforeEach(() => {
    jest.clearAllMocks();

    useNavigationMock.mockReturnValue({
      goBack: jest.fn(),
      navigate: jest.fn(),
    } as unknown as ReturnType<typeof useNavigation>);
  });

  it('rejects the pending approval and cancels any pending QR scan', async () => {
    const mockCancelQRScanRequestIfPresent = jest
      .fn()
      .mockResolvedValue(undefined);
    jest.spyOn(QRHardwareHook, 'useQRHardwareContext').mockReturnValue({
      cancelQRScanRequestIfPresent: mockCancelQRScanRequestIfPresent,
    } as unknown as QRHardwareHook.QRHardwareContextType);

    const { result } = renderHookWithProvider(() => useConfirmReject(), {
      state: personalSignatureConfirmationState,
    });

    result?.current?.onReject();

    expect(mockCancelQRScanRequestIfPresent).toHaveBeenCalledTimes(1);
    await flushPromises();
    expect(Engine.rejectPendingApproval).toHaveBeenCalledTimes(1);
  });

  it('captures signature reject metrics for signature confirmations', async () => {
    const clearSecurityAlertResponseSpy = jest.spyOn(
      PPOMUtil,
      'clearSignatureSecurityAlertResponse',
    );
    jest.spyOn(QRHardwareHook, 'useQRHardwareContext').mockReturnValue({
      cancelQRScanRequestIfPresent: jest.fn().mockResolvedValue(undefined),
    } as unknown as QRHardwareHook.QRHardwareContextType);

    const { result } = renderHookWithProvider(() => useConfirmReject(), {
      state: personalSignatureConfirmationState,
    });

    result?.current?.onReject();
    await flushPromises();

    expect(mockCaptureSignatureMetrics).toHaveBeenCalledTimes(1);
    expect(clearSecurityAlertResponseSpy).toHaveBeenCalledTimes(1);
  });

  it('does not capture signature metrics for non-signature confirmations', async () => {
    const clearSecurityAlertResponseSpy = jest.spyOn(
      PPOMUtil,
      'clearSignatureSecurityAlertResponse',
    );
    jest.spyOn(QRHardwareHook, 'useQRHardwareContext').mockReturnValue({
      cancelQRScanRequestIfPresent: jest.fn().mockResolvedValue(undefined),
    } as unknown as QRHardwareHook.QRHardwareContextType);

    const { result } = renderHookWithProvider(() => useConfirmReject(), {
      state: stakingDepositConfirmationState,
    });

    result?.current?.onReject();
    await flushPromises();

    expect(Engine.rejectPendingApproval).toHaveBeenCalledTimes(1);
    expect(mockCaptureSignatureMetrics).not.toHaveBeenCalled();
    expect(clearSecurityAlertResponseSpy).not.toHaveBeenCalled();
  });

  it('does not navigate back when skipNavigation is true', () => {
    const goBackSpy = jest.fn();
    useNavigationMock.mockReturnValue({
      goBack: goBackSpy,
      navigate: jest.fn(),
    } as unknown as ReturnType<typeof useNavigation>);
    jest.spyOn(QRHardwareHook, 'useQRHardwareContext').mockReturnValue({
      cancelQRScanRequestIfPresent: jest.fn().mockResolvedValue(undefined),
    } as unknown as QRHardwareHook.QRHardwareContextType);

    const { result } = renderHookWithProvider(() => useConfirmReject(), {
      state: personalSignatureConfirmationState,
    });

    result?.current?.onReject(undefined, true);

    expect(goBackSpy).not.toHaveBeenCalled();
  });
});

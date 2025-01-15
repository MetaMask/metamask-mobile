// eslint-disable-next-line import/no-namespace
import * as AddressUtils from '../../../../util/address';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { personalSignatureConfirmationState } from '../../../../util/test/confirm-data-helpers';

// eslint-disable-next-line import/no-namespace
import * as QRHardwareAwareness from './useQRHardwareAwareness';
import useConfirmationRedesignEnabled from './useConfirmationRedesignEnabled';

jest.mock('../../../../core/Engine', () => ({
  getTotalFiatAccountBalance: () => ({ tokenFiat: 10 }),
  context: {
    KeyringController: {
      state: {
        keyrings: [],
      },
      getOrAddQRKeyring: jest.fn(),
    },
  },
  controllerMessenger: {
    subscribe: jest.fn(),
  },
}));

describe('useConfirmationRedesignEnabled', () => {
  it('return true for personal sign request', async () => {
    const { result } = renderHookWithProvider(
      () => useConfirmationRedesignEnabled(),
      {
        state: personalSignatureConfirmationState,
      },
    );
    expect(result?.current.isRedesignedEnabled).toBeTruthy();
  });

  it('return false for external accounts', async () => {
    jest.spyOn(AddressUtils, 'isExternalHardwareAccount').mockReturnValue(true);
    const { result } = renderHookWithProvider(
      () => useConfirmationRedesignEnabled(),
      {
        state: personalSignatureConfirmationState,
      },
    );
    expect(result?.current.isRedesignedEnabled).toBeFalsy();
  });

  it('return false if QR hardware is syncing', async () => {
    jest
      .spyOn(QRHardwareAwareness, 'default')
      .mockReturnValue({ isSigningQRObject: true, isSyncingQRHardware: false });
    const { result } = renderHookWithProvider(
      () => useConfirmationRedesignEnabled(),
      {
        state: personalSignatureConfirmationState,
      },
    );
    expect(result?.current.isRedesignedEnabled).toBeFalsy();
  });

  it('return false if QR hardware has synced successfully', async () => {
    jest
      .spyOn(QRHardwareAwareness, 'default')
      .mockReturnValue({ isSigningQRObject: false, isSyncingQRHardware: true });
    const { result } = renderHookWithProvider(
      () => useConfirmationRedesignEnabled(),
      {
        state: personalSignatureConfirmationState,
      },
    );
    expect(result?.current.isRedesignedEnabled).toBeFalsy();
  });
});

// eslint-disable-next-line import/no-namespace
import * as AddressUtils from '../../../../util/address';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { personalSignatureConfirmationState } from '../../../../util/test/confirm-data-helpers';

import { useConfirmationRedesignEnabled } from './useConfirmationRedesignEnabled';

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
  it('return true for personal sign request', () => {
    const { result } = renderHookWithProvider(
      () => useConfirmationRedesignEnabled(),
      {
        state: personalSignatureConfirmationState,
      },
    );
    expect(result?.current.isRedesignedEnabled).toBeTruthy();
  });

  it('return false for external accounts', () => {
    jest.spyOn(AddressUtils, 'isExternalHardwareAccount').mockReturnValue(true);
    const { result } = renderHookWithProvider(
      () => useConfirmationRedesignEnabled(),
      {
        state: personalSignatureConfirmationState,
      },
    );
    expect(result?.current.isRedesignedEnabled).toBeFalsy();
  });
});

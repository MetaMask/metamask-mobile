import { AddressResolution } from '@metamask/snaps-sdk';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
// eslint-disable-next-line import/no-namespace
import * as SnapNameResolution from '../../../../Snaps/hooks/useSnapNameResolution';
// eslint-disable-next-line import/no-namespace
import * as SendValidationUtils from '../../utils/send-address-validations';
import { evmSendStateMock } from '../../__mocks__/send.mock';
import { useNameValidation } from './useNameValidation';

jest.mock('@metamask/bridge-controller', () => ({
  formatChainIdToCaip: jest.fn(),
}));

const mockState = {
  state: evmSendStateMock,
};

describe('useNameValidation', () => {
  it('return function to validate name', () => {
    const { result } = renderHookWithProvider(
      () => useNameValidation(),
      mockState,
    );
    expect(result.current.validateName).toBeDefined();
  });

  it('return resolved address when name is resolved', async () => {
    jest.spyOn(SnapNameResolution, 'useSnapNameResolution').mockReturnValue({
      fetchResolutions: () =>
        Promise.resolve([
          { resolvedAddress: 'dummy_address' } as unknown as AddressResolution,
        ]),
    });
    const { result } = renderHookWithProvider(
      () => useNameValidation(),
      mockState,
    );
    expect(
      await result.current.validateName(
        '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        'test.sol',
      ),
    ).toStrictEqual({
      resolvedAddress: 'dummy_address',
    });
  });

  it('return confusable error and warning as name is resolved', async () => {
    jest
      .spyOn(SendValidationUtils, 'getConfusableCharacterInfo')
      .mockReturnValue({
        error: 'dummy_error',
        warning: 'dummy_warning',
      });
    jest.spyOn(SnapNameResolution, 'useSnapNameResolution').mockReturnValue({
      fetchResolutions: () =>
        Promise.resolve([
          { resolvedAddress: 'dummy_address' } as unknown as AddressResolution,
        ]),
    });
    const { result } = renderHookWithProvider(
      () => useNameValidation(),
      mockState,
    );
    expect(
      await result.current.validateName(
        '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        'test.sol',
      ),
    ).toStrictEqual({
      error: 'dummy_error',
      warning: 'dummy_warning',
      resolvedAddress: 'dummy_address',
    });
  });
});

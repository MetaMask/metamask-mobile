import { AddressResolution } from '@metamask/snaps-sdk';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
// eslint-disable-next-line import/no-namespace
import * as SnapNameResolution from '../../../../Snaps/hooks/useSnapNameResolution';
// eslint-disable-next-line import/no-namespace
import * as SendValidationUtils from '../../utils/send-address-validations';
import { evmSendStateMock } from '../../__mocks__/send.mock';
import { useNameValidation } from './useNameValidation';
import { useSendType } from './useSendType';
import { useSendFlowEnsResolutions } from './useSendFlowEnsResolutions';

jest.mock('@metamask/bridge-controller', () => ({
  formatChainIdToCaip: jest.fn(),
}));

jest.mock('./useSendType', () => ({
  useSendType: jest.fn(),
}));

jest.mock('./useSendFlowEnsResolutions', () => ({
  useSendFlowEnsResolutions: jest.fn(() => ({
    setResolvedAddress: jest.fn(),
  })),
}));

const mockState = {
  state: evmSendStateMock,
};

describe('useNameValidation', () => {
  const mockUseSendType = jest.mocked(useSendType);
  const mockUseSendFlowEnsResolutions = jest.mocked(useSendFlowEnsResolutions);
  const mockSetResolvedAddress = jest.fn();

  beforeEach(() => {
    mockUseSendType.mockReturnValue({
      isEvmSendType: false,
    } as ReturnType<typeof useSendType>);
    mockUseSendFlowEnsResolutions.mockReturnValue({
      setResolvedAddress: mockSetResolvedAddress,
    } as unknown as ReturnType<typeof useSendFlowEnsResolutions>);
  });

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
    expect(mockSetResolvedAddress).not.toHaveBeenCalled();
  });

  it('calls setResolvedAddress when name is resolved and isEvmSendType is true', async () => {
    mockUseSendType.mockReturnValue({
      isEvmSendType: true,
    } as ReturnType<typeof useSendType>);
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
        'test.eth',
      ),
    ).toStrictEqual({
      resolvedAddress: 'dummy_address',
    });
    expect(mockSetResolvedAddress).toHaveBeenCalledWith(
      '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      'test.eth',
      'dummy_address',
    );
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

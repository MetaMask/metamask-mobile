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
    jest.clearAllMocks();
    mockUseSendType.mockReturnValue({
      isEvmSendType: false,
    } as ReturnType<typeof useSendType>);
    mockUseSendFlowEnsResolutions.mockReturnValue({
      setResolvedAddress: mockSetResolvedAddress,
    } as unknown as ReturnType<typeof useSendFlowEnsResolutions>);
    jest
      .spyOn(SendValidationUtils, 'getConfusableCharacterInfo')
      .mockReturnValue({});
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
      protocol: undefined,
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
      protocol: undefined,
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
      protocol: undefined,
    });
  });

  it('returns error when name resolver returns zero address', async () => {
    jest.spyOn(SnapNameResolution, 'useSnapNameResolution').mockReturnValue({
      fetchResolutions: () =>
        Promise.resolve([
          {
            resolvedAddress: '0x0000000000000000000000000000000000000000',
          } as unknown as AddressResolution,
        ]),
    });

    const { result } = renderHookWithProvider(
      () => useNameValidation(),
      mockState,
    );

    const validationResult = await result.current.validateName(
      '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      'test.eth',
    );

    expect(validationResult).toStrictEqual({
      error:
        'Name resolver returned an invalid address. Please check the name and try again.',
    });
  });

  it('returns error when name resolver returns burn address', async () => {
    jest.spyOn(SnapNameResolution, 'useSnapNameResolution').mockReturnValue({
      fetchResolutions: () =>
        Promise.resolve([
          {
            resolvedAddress: '0x0',
          } as unknown as AddressResolution,
        ]),
    });

    const { result } = renderHookWithProvider(
      () => useNameValidation(),
      mockState,
    );

    const validationResult = await result.current.validateName(
      '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      'test.eth',
    );

    expect(validationResult).toStrictEqual({
      error:
        'Name resolver returned an invalid address. Please check the name and try again.',
    });
  });

  it('returns empty object when signal is aborted before resolution', async () => {
    const mockFetchResolutions = jest.fn();
    jest.spyOn(SnapNameResolution, 'useSnapNameResolution').mockReturnValue({
      fetchResolutions: mockFetchResolutions,
    });

    const { result } = renderHookWithProvider(
      () => useNameValidation(),
      mockState,
    );

    const abortController = new AbortController();
    abortController.abort();

    const validationResult = await result.current.validateName(
      '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      'test.eth',
      abortController.signal,
    );

    expect(validationResult).toStrictEqual({});
    expect(mockFetchResolutions).not.toHaveBeenCalled();
  });

  it('returns empty object when signal is aborted during resolution', async () => {
    jest.spyOn(SnapNameResolution, 'useSnapNameResolution').mockReturnValue({
      fetchResolutions: () => Promise.resolve([]),
    });

    const { result } = renderHookWithProvider(
      () => useNameValidation(),
      mockState,
    );

    const abortController = new AbortController();
    const validationPromise = result.current.validateName(
      '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      'test.eth',
      abortController.signal,
    );

    abortController.abort();
    const validationResult = await validationPromise;

    expect(validationResult).toStrictEqual({});
  });

  it('returns protocol field from resolution', async () => {
    jest.spyOn(SnapNameResolution, 'useSnapNameResolution').mockReturnValue({
      fetchResolutions: () =>
        Promise.resolve([
          {
            resolvedAddress: 'dummy_address',
            protocol: 'lens',
          } as unknown as AddressResolution,
        ]),
    });

    const { result } = renderHookWithProvider(
      () => useNameValidation(),
      mockState,
    );

    const validationResult = await result.current.validateName(
      '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      'test.lens',
    );

    expect(validationResult).toStrictEqual({
      resolvedAddress: 'dummy_address',
      protocol: 'lens',
    });
  });

  it('returns error when name is not resolvable format', async () => {
    const { result } = renderHookWithProvider(
      () => useNameValidation(),
      mockState,
    );

    const validationResult = await result.current.validateName(
      '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      '123456',
    );

    expect(validationResult).toStrictEqual({
      error: "Couldn't resolve name",
    });
  });

  it('supports email-like format names', async () => {
    jest.spyOn(SnapNameResolution, 'useSnapNameResolution').mockReturnValue({
      fetchResolutions: () =>
        Promise.resolve([
          {
            resolvedAddress: 'dummy_address',
          } as unknown as AddressResolution,
        ]),
    });

    const { result } = renderHookWithProvider(
      () => useNameValidation(),
      mockState,
    );

    const validationResult = await result.current.validateName(
      '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      'user@protocol',
    );

    expect(validationResult).toStrictEqual({
      resolvedAddress: 'dummy_address',
      protocol: undefined,
    });
  });

  it('supports scheme-based format names', async () => {
    jest.spyOn(SnapNameResolution, 'useSnapNameResolution').mockReturnValue({
      fetchResolutions: () =>
        Promise.resolve([
          {
            resolvedAddress: 'dummy_address',
            protocol: 'lens',
          } as unknown as AddressResolution,
        ]),
    });

    const { result } = renderHookWithProvider(
      () => useNameValidation(),
      mockState,
    );

    const validationResult = await result.current.validateName(
      '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      'lens:username',
    );

    expect(validationResult).toStrictEqual({
      resolvedAddress: 'dummy_address',
      protocol: 'lens',
    });
  });
});

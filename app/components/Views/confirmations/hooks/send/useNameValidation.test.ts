import { AddressResolution } from '@metamask/snaps-sdk';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
// eslint-disable-next-line import/no-namespace
import * as SnapNameResolution from '../../../../Snaps/hooks/useSnapNameResolution';
// eslint-disable-next-line import/no-namespace
import * as SendUtils from '../../utils/send';
import { evmSendStateMock } from '../../__mocks__/send.mock';
import { useSendContext } from '../../context/send-context';
import { useNameValidation } from './useNameValidation';

jest.mock('../../context/send-context', () => ({
  useSendContext: jest.fn(),
}));

const mockState = {
  state: evmSendStateMock,
};

const mockUseSendContext = useSendContext as jest.MockedFunction<
  typeof useSendContext
>;

describe('useNameValidation', () => {
  it('return function to validate name', () => {
    mockUseSendContext.mockReturnValue({
      to: '4Nd1mY5U4Q5oLQjk5L3dhuRvhXcH2vCn2EDqjz9qZ3W4',
    } as unknown as ReturnType<typeof useSendContext>);
    const { result } = renderHookWithProvider(
      () => useNameValidation(),
      mockState,
    );
    expect(result.current.validateName).toBeDefined();
  });

  it('return resolved address when name is resolved', async () => {
    mockUseSendContext.mockReturnValue({
      chainId: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      to: 'test.sol',
    } as unknown as ReturnType<typeof useSendContext>);
    jest.spyOn(SnapNameResolution, 'useSnapNameResolution').mockReturnValue({
      results: [
        { resolvedAddress: 'dummy_address' } as unknown as AddressResolution,
      ],
      loading: false,
    });
    const { result } = renderHookWithProvider(
      () => useNameValidation(),
      mockState,
    );
    expect(await result.current.validateName()).toStrictEqual({
      resolvedAddress: 'dummy_address',
      toAddressValidated: 'test.sol',
    });
  });

  it('return confusable error and warning as name is resolved', async () => {
    mockUseSendContext.mockReturnValue({
      chainId: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      to: 'test.sol',
    } as unknown as ReturnType<typeof useSendContext>);
    jest.spyOn(SendUtils, 'getConfusableCharacterInfo').mockReturnValue({
      error: 'dummy_error',
      warning: 'dummy_warning',
    });
    jest.spyOn(SnapNameResolution, 'useSnapNameResolution').mockReturnValue({
      results: [
        { resolvedAddress: 'dummy_address' } as unknown as AddressResolution,
      ],
      loading: false,
    });
    const { result } = renderHookWithProvider(
      () => useNameValidation(),
      mockState,
    );
    expect(await result.current.validateName()).toStrictEqual({
      error: 'dummy_error',
      warning: 'dummy_warning',
      resolvedAddress: 'dummy_address',
      toAddressValidated: 'test.sol',
    });
  });

  it('return loading as true when resolving name', async () => {
    mockUseSendContext.mockReturnValue({
      chainId: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      to: 'test.sol',
    } as unknown as ReturnType<typeof useSendContext>);
    jest
      .spyOn(SnapNameResolution, 'useSnapNameResolution')
      .mockReturnValue({ results: [], loading: true });
    const { result } = renderHookWithProvider(
      () => useNameValidation(),
      mockState,
    );
    expect(await result.current.validateName()).toStrictEqual({
      loading: true,
      toAddressValidated: 'test.sol',
    });
  });
});

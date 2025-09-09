import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { evmSendStateMock } from '../../__mocks__/send.mock';
import { useSendType } from './useSendType';

const mockState = {
  state: evmSendStateMock,
};

describe('useSendType', () => {
  it('return types of send', () => {
    const { result } = renderHookWithProvider(() => useSendType(), mockState);
    expect(result.current).toEqual({
      isEvmNativeSendType: undefined,
      isEvmSendType: undefined,
      isNonEvmNativeSendType: undefined,
      isNonEvmSendType: undefined,
      isSolanaSendType: undefined,
    });
  });
});

import {
  ProviderValues,
  renderHookWithProvider,
} from '../../../../../util/test/renderWithProvider';
import { evmSendStateMock } from '../../__mocks__/send.mock';
import { useSendDisabled } from './useSendDisabled';

const mockState = {
  state: evmSendStateMock,
};

describe('useSendDisabled', () => {
  it('return field for sendDisabled', () => {
    const { result } = renderHookWithProvider(
      () => useSendDisabled(),
      mockState as ProviderValues,
    );
    expect(result.current).toStrictEqual({ sendDisabled: true });
  });
});

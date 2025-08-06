import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { evmSendStateMock } from '../../__mocks__/send.mock';
import { useSendAmountConfirmDisabled } from './useSendAmountConfirmDisabled';

const mockState = {
  state: evmSendStateMock,
};

describe('useSendAmountConfirmDisabled', () => {
  it('return field for isDisabled', () => {
    const { result } = renderHookWithProvider(
      () => useSendAmountConfirmDisabled(),
      mockState,
    );
    expect(result.current).toStrictEqual({ isDisabled: true });
  });
});

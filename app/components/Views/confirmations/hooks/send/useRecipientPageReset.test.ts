import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { evmSendStateMock } from '../../__mocks__/send.mock';
import { useRecipientPageReset } from './useRecipientPageReset';

const mockState = {
  state: evmSendStateMock,
};

const mockResetFn = jest.fn();

describe('useRecipientPageReset', () => {
  it('renders correctly', () => {
    expect(() => {
      renderHookWithProvider(
        () => useRecipientPageReset(mockResetFn),
        mockState,
      );
    }).not.toThrow();

    const { result } = renderHookWithProvider(
      () => useRecipientPageReset(mockResetFn),
      mockState,
    );
    expect(result.current).toEqual(undefined);
  });
});

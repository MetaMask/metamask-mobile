import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useSendScope } from './useSendScope';

describe('useSendScope', () => {
  it('always returns isBIP44 true', () => {
    const { result } = renderHookWithProvider(() => useSendScope());

    expect(result.current).toEqual({
      isSolanaOnly: false,
      isEvmOnly: false,
      isBIP44: true,
    });
  });
});

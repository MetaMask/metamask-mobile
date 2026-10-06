import type { Hex } from '@metamask/utils';
import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useIsNativeGasIncludedSupported } from '.';

jest.mock('../../../../hooks/useAsyncResult');

const mockUseAsyncResult = jest.mocked(useAsyncResult);

describe('useIsNativeGasIncludedSupported', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns whether native gas is included for the chain', () => {
    mockUseAsyncResult.mockReturnValue({ pending: false, value: true });

    const { result } = renderHookWithProvider(
      () => useIsNativeGasIncludedSupported('0x13b2' as Hex),
      { state: {} },
    );

    expect(result.current).toBe(true);
  });

  it('returns undefined while loading', () => {
    mockUseAsyncResult.mockReturnValue({ pending: true, value: undefined });

    const { result } = renderHookWithProvider(
      () => useIsNativeGasIncludedSupported('0x13b2' as Hex),
      { state: {} },
    );

    expect(result.current).toBeUndefined();
  });
});

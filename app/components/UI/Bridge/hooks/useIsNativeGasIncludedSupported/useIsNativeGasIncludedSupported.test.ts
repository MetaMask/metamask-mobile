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

  it('updates state when native gas is included for the chain', () => {
    mockUseAsyncResult.mockReturnValue({ pending: false, value: true });

    const { store } = renderHookWithProvider(
      () => useIsNativeGasIncludedSupported('0x13b2' as Hex),
      { state: {} },
    );

    expect(store.getState().bridge.isNativeGasIncludedSupported).toBe(true);
  });

  it('updates state to false while loading', () => {
    mockUseAsyncResult.mockReturnValue({ pending: true, value: undefined });

    const { store } = renderHookWithProvider(
      () => useIsNativeGasIncludedSupported('0x13b2' as Hex),
      { state: {} },
    );

    expect(store.getState().bridge.isNativeGasIncludedSupported).toBe(false);
  });
});

import { renderHookWithProvider } from '../../../../../../util/test/renderWithProvider';
import { evmSendStateMock } from '../../../__mocks__/send.mock';
import { useAssetSelectionMetrics } from './useAssetSelectionMetrics';

const mockState = {
  state: evmSendStateMock,
};

describe('useAssetSelectionMetrics', () => {
  it('return field getting asset selection related details', () => {
    const { result } = renderHookWithProvider(
      () => useAssetSelectionMetrics(),
      mockState,
    );
    expect(result.current.captureAssetSelected).toBeDefined();
    expect(result.current.setAssetListSize).toBeDefined();
    expect(result.current.setNoneAssetFilterMethod).toBeDefined();
    expect(result.current.setSearchAssetFilterMethod).toBeDefined();
  });
});

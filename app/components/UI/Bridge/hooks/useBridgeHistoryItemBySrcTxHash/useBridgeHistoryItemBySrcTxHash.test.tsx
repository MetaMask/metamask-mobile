import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useBridgeHistoryItemBySrcTxHash } from '.';
import { initialState } from '../../../../../components/UI/Bridge/_mocks_/initialState';
import { cloneDeep } from 'lodash';

describe('useBridgeHistoryItemBySrcTxHash', () => {
  it('should return empty map when no bridge history exists', () => {
    const state = cloneDeep(initialState);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    state.engine.backgroundState.BridgeStatusController.txHistory = {} as any;

    const { result } = renderHookWithProvider(
      () => useBridgeHistoryItemBySrcTxHash(),
      {
        state,
      },
    );

    expect(result.current.bridgeHistoryItemsBySrcTxHash).toEqual({});
  });

  it('should return correct bridge history items by source transaction hash', () => {
    const { result } = renderHookWithProvider(
      () => useBridgeHistoryItemBySrcTxHash(),
      {
        state: initialState,
      },
    );

    expect(result.current.bridgeHistoryItemsBySrcTxHash['0x123']).toEqual(
      initialState.engine.backgroundState.BridgeStatusController.txHistory['test-tx-id'],
    );
  });
});

import { initialState } from '../../_mocks_/initialState';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import {
  findBridgeHistoryItemBySrcTxHash,
  useBridgeHistoryItemBySrcTxHash,
} from '.';
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
      initialState.engine.backgroundState.BridgeStatusController.txHistory[
        'test-tx-id'
      ],
    );
  });

  it('indexes EVM transaction hashes case-insensitively for constant-time lookup', () => {
    const state = cloneDeep(initialState);
    const bridgeHistoryItem =
      state.engine.backgroundState.BridgeStatusController.txHistory[
        'test-tx-id'
      ];
    bridgeHistoryItem.status.srcChain.txHash = '0xAbC';

    const { result } = renderHookWithProvider(
      () => useBridgeHistoryItemBySrcTxHash(),
      { state },
    );

    expect(
      findBridgeHistoryItemBySrcTxHash(
        result.current.bridgeHistoryItemsBySrcTxHash,
        '0xaBc',
      ),
    ).toBe(bridgeHistoryItem);
    expect(result.current.bridgeHistoryItemsBySrcTxHash['0xabc']).toBe(
      bridgeHistoryItem,
    );
  });
});

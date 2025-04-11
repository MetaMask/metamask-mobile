import { useBridgeQuoteRequest } from './';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { createBridgeTestState } from '../../testUtils';
import { Hex } from '@metamask/utils';

describe('useBridgeQuoteRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns debounced function', () => {
    const testState = createBridgeTestState(
      {}, // No bridge controller overrides needed
      {
        sourceAmount: '1',
        sourceToken: { address: '0x1', chainId: '0x1' as Hex, decimals: 18 },
        destToken: { address: '0x2', chainId: '0x2' as Hex, decimals: 18 },
        selectedDestChainId: '0x2' as Hex,
        slippage: '0.5',
      },
    );

    const { result } = renderHookWithProvider(() => useBridgeQuoteRequest(), {
      state: testState,
    });

    expect(typeof result.current).toBe('function');
  });
});

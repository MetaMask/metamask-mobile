import { renderHook } from '@testing-library/react-native';
import type { BridgeToken } from '../../types';
import { endTrace, TraceName } from '../../../../../util/trace';
import { useSwapBridgePageLoadTrace } from '.';

jest.mock('../../../../../util/trace', () => ({
  ...jest.requireActual('../../../../../util/trace'),
  endTrace: jest.fn(),
}));

const mockEndTrace = endTrace as jest.MockedFunction<typeof endTrace>;

const sourceToken = { chainId: '0x1' } as unknown as BridgeToken;
const destToken = { chainId: '0x89' } as unknown as BridgeToken;

describe('useSwapBridgePageLoadTrace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('waits for the quote surface on a prefilled page', () => {
    const { rerender } = renderHook(
      ({ isQuoteSurfaceReady }: { isQuoteSurfaceReady: boolean }) =>
        useSwapBridgePageLoadTrace({
          traceId: 'prefilled-page-trace',
          sourceToken,
          destToken,
          latestSourceBalance: { displayBalance: '1' },
          sourceAmount: '1',
          isQuoteSurfaceReady,
        }),
      { initialProps: { isQuoteSurfaceReady: false } },
    );

    expect(mockEndTrace).not.toHaveBeenCalled();

    rerender({ isQuoteSurfaceReady: true });

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'prefilled-page-trace',
        data: expect.objectContaining({ result: 'success' }),
      }),
    );
  });

  it('marks an unfinished page trace cancelled on unmount', () => {
    const { unmount } = renderHook(() =>
      useSwapBridgePageLoadTrace({
        traceId: 'abandoned-page-trace',
      }),
    );

    unmount();

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.SwapViewLoaded,
        id: 'abandoned-page-trace',
        data: expect.objectContaining({ result: 'cancelled' }),
      }),
    );
  });
});

import { act, renderHook } from '@testing-library/react-native';
import type { OrderResult, Position } from '@metamask/perps-controller';
import Logger from '../../../../util/Logger';
import { usePerpsPostOrderTPSL } from './usePerpsPostOrderTPSL';

const mockUpdatePositionTPSL = jest.fn();
const mockShowToast = jest.fn();
const mockPostOrderAttachmentFailed = { id: 'post-order-attachment-failed' };

jest.mock('./usePerpsTrading', () => ({
  usePerpsTrading: () => ({
    updatePositionTPSL: mockUpdatePositionTPSL,
  }),
}));

jest.mock('./usePerpsToasts', () => ({
  __esModule: true,
  default: () => ({
    showToast: mockShowToast,
    PerpsToastOptions: {
      positionManagement: {
        tpsl: {
          postOrderAttachmentFailed: mockPostOrderAttachmentFailed,
        },
      },
    },
  }),
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

describe('usePerpsPostOrderTPSL', () => {
  const position = {
    symbol: 'ETH',
    size: '0.1',
  } as Position;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdatePositionTPSL.mockResolvedValue({ success: true });
  });

  it('passes the rendered position to the controller', async () => {
    const { result } = renderHook(() => usePerpsPostOrderTPSL());

    await act(async () => {
      await result.current.attachPostOrderTPSL({
        symbol: 'ETH',
        takeProfitPrice: '3500',
        position,
      });
    });

    expect(mockUpdatePositionTPSL).toHaveBeenCalledWith({
      symbol: 'ETH',
      takeProfitPrice: '3500',
      position,
    });
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('allows the controller fallback when the stream provides no position', async () => {
    const { result } = renderHook(() => usePerpsPostOrderTPSL());

    await act(async () => {
      await result.current.attachPostOrderTPSL({
        symbol: 'ETH',
        stopLossPrice: '2500',
        position: undefined,
      });
    });

    expect(mockUpdatePositionTPSL).toHaveBeenCalledWith({
      symbol: 'ETH',
      stopLossPrice: '2500',
      position: undefined,
    });
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('warns that the open position has no protection when attachment fails', async () => {
    mockUpdatePositionTPSL.mockResolvedValue({
      success: false,
      error: 'No position found for ETH',
    });
    const { result } = renderHook(() => usePerpsPostOrderTPSL());

    let attachmentResult: OrderResult | undefined;
    await act(async () => {
      attachmentResult = await result.current.attachPostOrderTPSL({
        symbol: 'ETH',
        takeProfitPrice: '3500',
      });
    });

    expect(attachmentResult).toEqual({
      success: false,
      error: 'No position found for ETH',
    });
    expect(mockShowToast).toHaveBeenCalledWith(mockPostOrderAttachmentFailed);
  });

  it('normalizes a rejected attachment as an unprotected position', async () => {
    mockUpdatePositionTPSL.mockRejectedValue(new Error('Network unavailable'));
    const { result } = renderHook(() => usePerpsPostOrderTPSL());

    let attachmentResult: OrderResult | undefined;
    await act(async () => {
      attachmentResult = await result.current.attachPostOrderTPSL({
        symbol: 'ETH',
        takeProfitPrice: '3500',
      });
    });

    expect(attachmentResult).toEqual({
      success: false,
      error: 'Network unavailable',
    });
    expect(Logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Network unavailable' }),
      'usePerpsPostOrderTPSL: Failed to attach protection',
    );
    expect(mockShowToast).toHaveBeenCalledWith(mockPostOrderAttachmentFailed);
  });
});

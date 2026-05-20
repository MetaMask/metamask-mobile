import { renderHook, act } from '@testing-library/react-native';
import { usePerpsMaxSlippage } from './usePerpsMaxSlippage';
import Engine from '../../../../core/Engine';

jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      getMaxSlippage: jest.fn(),
      setMaxSlippage: jest.fn(),
    },
  },
}));

const mockController = Engine.context.PerpsController as unknown as {
  getMaxSlippage: jest.Mock;
  setMaxSlippage: jest.Mock;
};

describe('usePerpsMaxSlippage', () => {
  beforeEach(() => {
    mockController.getMaxSlippage.mockReset();
    mockController.setMaxSlippage.mockReset();
  });

  it('returns the controller value with `user_configured` source', () => {
    mockController.getMaxSlippage.mockReturnValue(500);
    const { result } = renderHook(() => usePerpsMaxSlippage());
    expect(result.current.maxSlippageBps).toBe(500);
    expect(result.current.maxSlippageSource).toBe('user_configured');
  });

  it('falls back to the controller default with `default` source when unset', () => {
    mockController.getMaxSlippage.mockReturnValue(undefined);
    const { result } = renderHook(() => usePerpsMaxSlippage());
    expect(result.current.maxSlippageBps).toBe(300);
    expect(result.current.maxSlippageSource).toBe('default');
  });

  it('persists a new value and refreshes the read', () => {
    mockController.getMaxSlippage.mockReturnValue(undefined);
    const { result, rerender } = renderHook(() => usePerpsMaxSlippage());

    expect(result.current.maxSlippageBps).toBe(300);
    expect(result.current.maxSlippageSource).toBe('default');

    mockController.getMaxSlippage.mockReturnValue(450);

    act(() => {
      result.current.setMaxSlippage(450);
    });

    rerender();

    expect(mockController.setMaxSlippage).toHaveBeenCalledWith(450);
    expect(result.current.maxSlippageBps).toBe(450);
    expect(result.current.maxSlippageSource).toBe('user_configured');
  });
});

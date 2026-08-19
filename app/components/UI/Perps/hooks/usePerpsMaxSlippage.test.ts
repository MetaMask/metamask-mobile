import { renderHook, act } from '@testing-library/react-native';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller';
import { usePerpsMaxSlippage } from './usePerpsMaxSlippage';
import Engine from '../../../../core/Engine';
import { PERPS_SLIPPAGE_DEFAULT_BPS } from '../constants/slippageConfig';

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

  it('returns the controller value with the user-configured source', () => {
    mockController.getMaxSlippage.mockReturnValue(500);
    const { result } = renderHook(() => usePerpsMaxSlippage());
    expect(result.current.maxSlippageBps).toBe(500);
    expect(result.current.maxSlippageSource).toBe(
      PERPS_EVENT_VALUE.MAX_SLIPPAGE_SOURCE.USER_CONFIGURED,
    );
  });

  it('falls back to the controller default source when unset', () => {
    mockController.getMaxSlippage.mockReturnValue(undefined);
    const { result } = renderHook(() => usePerpsMaxSlippage());
    expect(result.current.maxSlippageBps).toBe(PERPS_SLIPPAGE_DEFAULT_BPS);
    expect(result.current.maxSlippageSource).toBe(
      PERPS_EVENT_VALUE.MAX_SLIPPAGE_SOURCE.DEFAULT,
    );
  });

  it('persists a new value and refreshes the read', () => {
    mockController.getMaxSlippage.mockReturnValue(undefined);
    const { result } = renderHook(() => usePerpsMaxSlippage());

    expect(result.current.maxSlippageBps).toBe(PERPS_SLIPPAGE_DEFAULT_BPS);
    expect(result.current.maxSlippageSource).toBe(
      PERPS_EVENT_VALUE.MAX_SLIPPAGE_SOURCE.DEFAULT,
    );

    mockController.getMaxSlippage.mockReturnValue(450);

    act(() => {
      result.current.setMaxSlippage(450);
    });

    expect(mockController.setMaxSlippage).toHaveBeenCalledWith(450);
    expect(result.current.maxSlippageBps).toBe(450);
    expect(result.current.maxSlippageSource).toBe(
      PERPS_EVENT_VALUE.MAX_SLIPPAGE_SOURCE.USER_CONFIGURED,
    );
  });
});

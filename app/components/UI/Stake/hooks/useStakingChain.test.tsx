import { backgroundState } from '../../../../util/test/initial-root-state';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { toHex } from '@metamask/controller-utils';
import useStakingChain from './useStakingChain';
import { mockNetworkState } from '../../../../util/test/network';

const buildStateWithNetwork = (chainId: string, nickname: string) => ({
  engine: {
    backgroundState: {
      ...backgroundState,
      NetworkController: {
        ...mockNetworkState({
          chainId: toHex(chainId),
          nickname,
        }),
      },
    },
  },
});

describe('useStakingChain', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  describe('when the chainId is mainnet', () => {
    it('returns true if chainId is mainnet', () => {
      const { result } = renderHookWithProvider(() => useStakingChain(), {
        state: buildStateWithNetwork('1', 'Ethereum'),
      });

      expect(result.current.isStakingSupportedChain).toBe(true);
    });
  });

  describe('when the chainId is Holesky', () => {
    it('returns true if chainId is holesky', () => {
      const { result } = renderHookWithProvider(() => useStakingChain(), {
        state: buildStateWithNetwork('17000', 'Holesky'),
      });

      expect(result.current.isStakingSupportedChain).toBe(true);
    });
  });

  describe('when the chainId is neither mainnet nor Holesky', () => {
    it('returns false if chainId is not mainnet or holesky', () => {
      const { result } = renderHookWithProvider(() => useStakingChain(), {
        state: buildStateWithNetwork('11', 'Test'),
      });

      expect(result.current.isStakingSupportedChain).toBe(false);
    });
  });
});

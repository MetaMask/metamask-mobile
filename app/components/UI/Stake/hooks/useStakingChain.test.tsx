import { backgroundState } from '../../../../util/test/initial-root-state';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { toHex } from '@metamask/controller-utils';
import useStakingChain, { useStakingChainByChainId } from './useStakingChain';
import { mockNetworkState } from '../../../../util/test/network';
import { Hex } from '@metamask/utils';

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

describe('useStakingChainByChainId', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('returns true for a supported chainId (mainnet)', () => {
    const { result } = renderHookWithProvider(() =>
      useStakingChainByChainId(toHex('1')),
    );
    expect(result.current.isStakingSupportedChain).toBe(true);
  });

  it('returns true for a supported chainId (Holesky)', () => {
    const { result } = renderHookWithProvider(() =>
      useStakingChainByChainId(toHex('17000')),
    );
    expect(result.current.isStakingSupportedChain).toBe(true);
  });

  it('returns false for an unsupported chainId', () => {
    const { result } = renderHookWithProvider(() =>
      useStakingChainByChainId(toHex('11')),
    );
    expect(result.current.isStakingSupportedChain).toBe(false);
  });

  it('handles invalid chainId gracefully', () => {
    const { result } = renderHookWithProvider(() =>
      useStakingChainByChainId('invalid-chain-id' as Hex),
    );
    expect(result.current.isStakingSupportedChain).toBe(false);
  });
});

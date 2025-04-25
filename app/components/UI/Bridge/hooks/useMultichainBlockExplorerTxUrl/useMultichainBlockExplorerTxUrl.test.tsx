import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useMultichainBlockExplorerTxUrl } from '.';
import { waitFor } from '@testing-library/react-native';
import { initialState } from '../../_mocks_/initialState';
import { ChainId } from '@metamask/bridge-controller';

describe('useMultichainBlockExplorerTxUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return undefined when chainId is missing', () => {
    const { result } = renderHookWithProvider(
      () => useMultichainBlockExplorerTxUrl({ txHash: '0x123' }),
      { state: initialState },
    );

    expect(result.current).toBeUndefined();
  });

  it('should return undefined when txHash is missing', () => {
    const { result } = renderHookWithProvider(
      () => useMultichainBlockExplorerTxUrl({ chainId: 1 }),
      { state: initialState },
    );

    expect(result.current).toBeUndefined();
  });

  it('should return EVM block explorer URL for EVM chain', async () => {
    const { result } = renderHookWithProvider(
      () => useMultichainBlockExplorerTxUrl({
        chainId: 1,
        txHash: '0x123456789abcdef'
      }),
      { state: initialState },
    );

    await waitFor(() => {
      expect(result.current).toEqual({
        explorerTxUrl: 'https://etherscan.io/tx/0x123456789abcdef',
        explorerName: 'Etherscan',
        networkImageSource: 1,
        chainName: 'Ethereum Mainnet',
      });
    });
  });

  it('should return Solana block explorer URL for Solana chain', async () => {
    const { result } = renderHookWithProvider(
      () => useMultichainBlockExplorerTxUrl({
        chainId: ChainId.SOLANA,
        txHash: 'solana-tx-hash'
      }),
      { state: initialState },
    );

    await waitFor(() => {
      expect(result.current).toEqual({
        explorerTxUrl: 'https://solscan.io/tx/solana-tx-hash',
        explorerName: 'Solscan',
        networkImageSource: 1,
        chainName: 'Solana',
      });
    });
  });
});

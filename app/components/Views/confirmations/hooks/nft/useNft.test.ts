import { MOCK_STATE_NFT } from '../../../../../util/test/mock-data/root-state/nft';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useNft } from './useNft';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

jest.mock('../transactions/useTransactionMetadataRequest', () => ({
  useTransactionMetadataRequest: jest.fn(),
}));

describe('useNft', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const mockTransaction =
      MOCK_STATE_NFT.engine.backgroundState.TransactionController
        .transactions[0];
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
      txParams: mockTransaction.txParams,
      chainId: mockTransaction.chainId,
    });
  });

  it('returns NFT data from state', () => {
    const { result } = renderHookWithProvider(useNft, {
      state: MOCK_STATE_NFT,
    });

    expect(result.current.chainId).toBe('0x1');
    expect(result.current.name).toBe('Test Dapp NFTs');
    expect(result.current.nft).toBeDefined();
    expect(result.current.nft?.tokenId).toBe('12345');
    expect(result.current.nft?.name).toBe('Test Dapp NFTs #12345');
    expect(result.current.tokenId?.toString()).toBe('12345');
  });
});

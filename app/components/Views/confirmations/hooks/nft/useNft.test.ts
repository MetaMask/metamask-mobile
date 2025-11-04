import {
  MOCK_STATE_NFT,
  MOCK_TX_NFT_TRANSFER,
} from '../../../../../util/test/mock-data/root-state/nft';
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

  it('returns NFT data for ERC1155 send', () => {
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
      txParams: {
        ...MOCK_TX_NFT_TRANSFER.txParams,
        data: '0xf242432a000000000000000000000000dc47789de4ceff0e8fe9d15d728af7f17550c16400000000000000000000000068d3ad12ea94779cb37262be1c179dbd8e208afe0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000',
      },
      chainId: '0x1',
    });
    const { result } = renderHookWithProvider(useNft, {
      state: {
        engine: {
          backgroundState: {
            ...MOCK_STATE_NFT.engine.backgroundState,
            TransactionController: {
              transactions: [
                {
                  ...MOCK_TX_NFT_TRANSFER,
                  txParams: {
                    ...MOCK_TX_NFT_TRANSFER.txParams,
                    data: '0xf242432a000000000000000000000000dc47789de4ceff0e8fe9d15d728af7f17550c16400000000000000000000000068d3ad12ea94779cb37262be1c179dbd8e208afe0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000',
                  },
                },
              ],
            },
          },
        },
      },
    });

    expect(result.current.chainId).toBe('0x1');
    expect(result.current.name).toBe('Test Dapp NFTs');
    expect(result.current.nft).toBeDefined();
    expect(result.current.nft?.tokenId).toBe('1');
    expect(result.current.nft?.name).toBe('Test Dapp NFTs #1');
    expect(result.current.tokenId?.toString()).toBe('1');
  });

  it('returns NFT data for ERC721 send', () => {
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
      txParams: {
        ...MOCK_TX_NFT_TRANSFER.txParams,
        data: '0x23b872dd000000000000000000000000dc47789de4ceff0e8fe9d15d728af7f17550c16400000000000000000000000068d3ad12ea94779cb37262be1c179dbd8e208afe0000000000000000000000000000000000000000000000000000000000003039',
      },
      chainId: '0x1',
    });
    const { result } = renderHookWithProvider(useNft, {
      state: {
        engine: {
          backgroundState: {
            ...MOCK_STATE_NFT.engine.backgroundState,
            TransactionController: {
              transactions: [
                {
                  ...MOCK_TX_NFT_TRANSFER,
                  txParams: {
                    ...MOCK_TX_NFT_TRANSFER.txParams,
                    data: '0x23b872dd000000000000000000000000dc47789de4ceff0e8fe9d15d728af7f17550c16400000000000000000000000068d3ad12ea94779cb37262be1c179dbd8e208afe0000000000000000000000000000000000000000000000000000000000008e9a',
                  },
                },
              ],
            },
          },
        },
      },
    });

    expect(result.current.chainId).toBe('0x1');
    expect(result.current.name).toBe('Test Dapp NFTs');
    expect(result.current.nft).toBeDefined();
    expect(result.current.nft?.tokenId).toBe('12345');
    expect(result.current.nft?.name).toBe('Test Dapp NFTs #12345');
    expect(result.current.tokenId?.toString()).toBe('12345');
  });
});

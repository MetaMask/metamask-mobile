import { renderHook } from '@testing-library/react-hooks';
import { SimulationTokenStandard } from '@metamask/transaction-controller';
import {
  useNftCollectionsMetadata,
  TokenStandard,
} from './useNftCollectionsMetadata';
import Engine from '../../../core/Engine';
import { getTokenDetails } from '../../../util/address';

jest.mock('../../../util/address', () => ({
  getTokenDetails: jest.fn(),
}));

jest.mock('../../../selectors/networkController', () => ({
  selectChainId: jest.fn(),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    NftController: {
      getNFTContractInfo: jest.fn(),
    },
  },
}));

const CHAIN_ID_MOCK = '0x1';
const ERC_721_ADDRESS_1 = '0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb';
const ERC_721_COLLECTION_1_MOCK = {
  image: 'url1',
  isSpam: false,
  name: 'Erc 721 1',
};

const ERC_721_ADDRESS_2 = '0x06012c8cf97bead5deae237070f9587f8e7a266d';
const ERC_721_COLLECTION_2_MOCK = {
  image: 'url2',
  isSpam: false,
  name: 'Erc 721 2',
};

describe('useNftCollectionsMetadata', () => {
  const { NftController } = Engine.context;
  const mockGetTokenDetails = jest.mocked(getTokenDetails);
  const mockGetNFTContractInfo = jest.mocked(NftController.getNFTContractInfo);

  beforeEach(() => {
    jest.resetAllMocks();
    mockGetNFTContractInfo.mockResolvedValue({
      collections: [ERC_721_COLLECTION_1_MOCK, ERC_721_COLLECTION_2_MOCK],
    });
    mockGetTokenDetails
      .mockResolvedValueOnce({
        name: 'TEST',
        symbol: 'TST',
        standard: TokenStandard.erc721,
      })
      .mockResolvedValueOnce({
        name: 'TEST',
        symbol: 'TST',
        standard: TokenStandard.erc721,
      });
  });

  it('calls NFT tokens API and returns the correct data structure', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useNftCollectionsMetadata([
        {
          contractAddress: ERC_721_ADDRESS_1,
          chainId: CHAIN_ID_MOCK,
        },
        {
          contractAddress: ERC_721_ADDRESS_2,
          chainId: CHAIN_ID_MOCK,
        },
      ]),
    );

    await waitForNextUpdate();

    expect(mockGetNFTContractInfo).toHaveBeenCalledTimes(1);

    expect(result.current).toStrictEqual({
      [CHAIN_ID_MOCK]: {
        [ERC_721_ADDRESS_1.toLowerCase()]: ERC_721_COLLECTION_1_MOCK,
        [ERC_721_ADDRESS_2.toLowerCase()]: ERC_721_COLLECTION_2_MOCK,
      },
    });
  });

  describe('does not call NFT tokens API', () => {
    it('if there are no contracts to fetch', async () => {
      renderHook(() => useNftCollectionsMetadata([]));
      expect(mockGetNFTContractInfo).not.toHaveBeenCalled();
    });

    it('if there are no valid nft request', async () => {
      // getTokenStandardAndDetails returns that the standard is ERC20
      mockGetTokenDetails.mockReset().mockResolvedValueOnce({
        name: 'TEST',
        symbol: 'TST',
        standard: SimulationTokenStandard.erc20,
      });

      renderHook(() =>
        useNftCollectionsMetadata([
          {
            contractAddress: '0xERC20Address',
            chainId: CHAIN_ID_MOCK,
          },
        ]),
      );
      expect(mockGetNFTContractInfo).not.toHaveBeenCalled();
    });

    it('if token standard request fails', async () => {
      mockGetTokenDetails.mockReset().mockRejectedValue(new Error('api error'));

      renderHook(() =>
        useNftCollectionsMetadata([
          {
            contractAddress: '0xERC20Address',
            chainId: CHAIN_ID_MOCK,
          },
        ]),
      );
      expect(mockGetNFTContractInfo).not.toHaveBeenCalled();
    });
  });

  it('does memoise result for same requests', async () => {
    const { waitForNextUpdate, rerender } = renderHook(() =>
      useNftCollectionsMetadata([
        {
          contractAddress: ERC_721_ADDRESS_1,
          chainId: CHAIN_ID_MOCK,
        },
        {
          contractAddress: ERC_721_ADDRESS_2,
          chainId: CHAIN_ID_MOCK,
        },
      ]),
    );

    await waitForNextUpdate();
    rerender();

    expect(mockGetNFTContractInfo).toHaveBeenCalledTimes(1);
  });
});

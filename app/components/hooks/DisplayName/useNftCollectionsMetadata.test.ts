import { renderHook } from '@testing-library/react-hooks';
import { SimulationTokenStandard } from '@metamask/transaction-controller';
import { selectChainId } from '../../../selectors/networkController';
import {
  useNftCollectionsMetadata,
  TokenStandard,
} from './useNftCollectionsMetadata';
import Engine from '../../../core/Engine';
import { getTokenDetails } from '../../../util/address';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useSelector: (selector: any) => selector(),
}));

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
  const mockSelectChainId = jest.mocked(selectChainId);
  const mockGetTokenDetails = jest.mocked(getTokenDetails);
  const mockGetNFTContractInfo = jest.mocked(NftController.getNFTContractInfo);

  beforeEach(() => {
    jest.resetAllMocks();
    mockSelectChainId.mockReturnValue(CHAIN_ID_MOCK);
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
          value: ERC_721_ADDRESS_1,
        },
        {
          value: ERC_721_ADDRESS_2,
        },
      ]),
    );

    await waitForNextUpdate();

    expect(mockGetNFTContractInfo).toHaveBeenCalledTimes(1);

    expect(result.current).toStrictEqual({
      [ERC_721_ADDRESS_1.toLowerCase()]: ERC_721_COLLECTION_1_MOCK,
      [ERC_721_ADDRESS_2.toLowerCase()]: ERC_721_COLLECTION_2_MOCK,
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
            value: '0xERC20Address',
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
            value: '0xERC20Address',
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
          value: ERC_721_ADDRESS_1,
        },
        {
          value: ERC_721_ADDRESS_2,
        },
      ]),
    );

    await waitForNextUpdate();
    rerender();

    expect(mockGetNFTContractInfo).toHaveBeenCalledTimes(1);
  });
});

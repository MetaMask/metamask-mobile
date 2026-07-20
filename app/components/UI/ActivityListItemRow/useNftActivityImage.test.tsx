import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { getFormattedIpfsUrl, type Nft } from '@metamask/assets-controllers';
import type { ActivityListItem } from '../../../util/activity-adapters';
import { selectNftByIdentity } from '../../../selectors/nftController';
import useIpfsGateway from '../../hooks/useIpfsGateway';
import { useNftActivityImage } from './useNftActivityImage';

jest.mock('@metamask/assets-controllers', () => ({
  getFormattedIpfsUrl: jest.fn(),
}));

jest.mock('../../hooks/useIpfsGateway');

jest.mock('../../../selectors/nftController', () => ({
  selectNftByIdentity: jest.fn(),
}));

const mockGetFormattedIpfsUrl = getFormattedIpfsUrl as jest.MockedFunction<
  typeof getFormattedIpfsUrl
>;
const mockUseIpfsGateway = useIpfsGateway as jest.MockedFunction<
  typeof useIpfsGateway
>;
const mockSelectNftByIdentity = selectNftByIdentity as jest.MockedFunction<
  typeof selectNftByIdentity
>;

const IPFS_GATEWAY = 'https://ipfs.io/ipfs/';

const renderUseNftActivityImage = (item: ActivityListItem) => {
  const store = configureStore({ reducer: { stub: () => ({}) } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return renderHook(() => useNftActivityImage(item), { wrapper });
};

const makeNftBuyItem = (
  valueTransfers: unknown[] = [
    {
      from: '0xseller',
      to: '0xbuyer',
      contractAddress: '0xCONTRACT',
      tokenId: '984',
      transferType: 'erc721',
    },
  ],
): ActivityListItem =>
  ({
    type: 'nftBuy',
    chainId: 'eip155:1',
    status: 'success',
    timestamp: 1,
    hash: '0xhash',
    raw: {
      type: 'apiEvmTransaction',
      data: { valueTransfers },
    },
    data: {
      from: '0xseller',
      to: '0xbuyer',
      token: { direction: 'in', symbol: 'FLUF World' },
    },
  }) as unknown as ActivityListItem;

describe('useNftActivityImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIpfsGateway.mockReturnValue(IPFS_GATEWAY);
    mockSelectNftByIdentity.mockReturnValue(undefined);
  });

  it('returns undefined and skips the lookup for non-NFT kinds', () => {
    const sendItem = {
      type: 'send',
      chainId: 'eip155:1',
      status: 'success',
      timestamp: 1,
      hash: '0xhash',
      data: { from: '0xa', to: '0xb' },
    } as unknown as ActivityListItem;

    const { result } = renderUseNftActivityImage(sendItem);

    expect(result.current).toBeUndefined();
    expect(mockSelectNftByIdentity).not.toHaveBeenCalled();
  });

  it('returns undefined for an NFT kind without an indexed transaction', () => {
    const item = {
      type: 'nftBuy',
      chainId: 'eip155:1',
      status: 'success',
      timestamp: 1,
      hash: '0xhash',
      data: { token: { direction: 'in', symbol: 'FLUF World' } },
    } as unknown as ActivityListItem;

    const { result } = renderUseNftActivityImage(item);

    expect(result.current).toBeUndefined();
    expect(mockSelectNftByIdentity).not.toHaveBeenCalled();
  });

  it('selects the NFT leg matching the activity, not the first NFT transfer', () => {
    const item = makeNftBuyItem([
      {
        from: '0xbuyer',
        to: '0xseller',
        contractAddress: '0xSENT',
        tokenId: '1',
        transferType: 'erc721',
      },
      {
        from: '0xseller',
        to: '0xbuyer',
        contractAddress: '0xRECEIVED',
        tokenId: '2',
        transferType: 'erc721',
      },
    ]);

    renderUseNftActivityImage(item);

    expect(mockSelectNftByIdentity).toHaveBeenCalledWith(
      expect.anything(),
      '0xRECEIVED',
      '2',
      '0x1',
    );
  });

  it('looks up the NFT by contract address, token id, and hex chain id', () => {
    renderUseNftActivityImage(makeNftBuyItem());

    expect(mockSelectNftByIdentity).toHaveBeenCalledWith(
      expect.anything(),
      '0xCONTRACT',
      '984',
      '0x1',
    );
  });

  it('returns an http(s) image directly without IPFS resolution', () => {
    mockSelectNftByIdentity.mockReturnValue({
      address: '0xCONTRACT',
      tokenId: '984',
      image: 'https://example.com/fluf.png',
    } as unknown as Nft);

    const { result } = renderUseNftActivityImage(makeNftBuyItem());

    expect(result.current).toBe('https://example.com/fluf.png');
    expect(mockGetFormattedIpfsUrl).not.toHaveBeenCalled();
  });

  it('resolves an ipfs image through the configured gateway', async () => {
    mockSelectNftByIdentity.mockReturnValue({
      address: '0xCONTRACT',
      tokenId: '984',
      image: 'ipfs://QmHash/1.png',
    } as unknown as Nft);
    mockGetFormattedIpfsUrl.mockResolvedValue(
      'https://ipfs.io/ipfs/QmHash/1.png',
    );

    const { result } = renderUseNftActivityImage(makeNftBuyItem());

    await waitFor(() =>
      expect(result.current).toBe('https://ipfs.io/ipfs/QmHash/1.png'),
    );
    expect(mockGetFormattedIpfsUrl).toHaveBeenCalledWith(
      IPFS_GATEWAY,
      'ipfs://QmHash/1.png',
      false,
    );
  });

  it('falls back to the collection image when the NFT image is missing', () => {
    mockSelectNftByIdentity.mockReturnValue({
      address: '0xCONTRACT',
      tokenId: '984',
      image: null,
      collection: { imageUrl: 'https://example.com/collection.png' },
    } as unknown as Nft);

    const { result } = renderUseNftActivityImage(makeNftBuyItem());

    expect(result.current).toBe('https://example.com/collection.png');
  });

  it('returns undefined when no NFT is found in state', () => {
    mockSelectNftByIdentity.mockReturnValue(undefined);

    const { result } = renderUseNftActivityImage(makeNftBuyItem());

    expect(result.current).toBeUndefined();
  });
});

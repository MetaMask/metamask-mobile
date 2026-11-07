import type { Nft } from '@metamask/assets-controllers';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import Engine from '../../../core/Engine';
import {
  clearNftMaliciousScanCache,
  useNftMaliciousNftScan,
} from './useNftMaliciousNftScan';

jest.mock('../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      PhishingController: { bulkScanTokens: jest.fn() },
      NftController: { removeNft: jest.fn() },
      NetworkController: {
        findNetworkClientIdByChainId: jest.fn(() => 'mainnet-client'),
      },
    },
  },
}));

const mockBulkScan = Engine.context.PhishingController
  .bulkScanTokens as jest.Mock;
const mockRemoveNft = Engine.context.NftController.removeNft as jest.Mock;

const makeNft = (address: string, tokenId: string, chainId = 1): Nft =>
  ({ address, tokenId, chainId, isCurrentlyOwned: true }) as Nft;

const verdict = (resultType: string, address: string) => ({
  result_type: resultType,
  chain: 'ethereum',
  address,
});

describe('useNftMaliciousNftScan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearNftMaliciousScanCache();
    mockBulkScan.mockResolvedValue({});
  });

  it('scans each contract once even when many tokenIds share it', async () => {
    const nfts = [
      makeNft('0xAAA', '1'),
      makeNft('0xaaa', '2'),
      makeNft('0xBBB', '3'),
    ];

    renderHook(() => useNftMaliciousNftScan(nfts));

    await waitFor(() => expect(mockBulkScan).toHaveBeenCalledTimes(1));
    expect(mockBulkScan).toHaveBeenCalledWith({
      chainId: '0x1',
      tokens: ['0xaaa', '0xbbb'],
    });
  });

  it('removes every NFT of a Malicious contract', async () => {
    mockBulkScan.mockResolvedValue({
      '0xaaa': verdict('Malicious', '0xaaa'),
      '0xbbb': verdict('Benign', '0xbbb'),
    });
    const nfts = [
      makeNft('0xaaa', '1'),
      makeNft('0xaaa', '2'),
      makeNft('0xbbb', '3'),
    ];

    renderHook(() => useNftMaliciousNftScan(nfts));

    await waitFor(() => expect(mockRemoveNft).toHaveBeenCalledTimes(2));
    expect(mockRemoveNft).toHaveBeenCalledWith('0xaaa', '1', 'mainnet-client');
    expect(mockRemoveNft).toHaveBeenCalledWith('0xaaa', '2', 'mainnet-client');
  });

  it.each(['Benign', 'Warning', 'Spam'])(
    'does not remove NFTs with a %s verdict',
    async (resultType) => {
      mockBulkScan.mockResolvedValue({ '0xaaa': verdict(resultType, '0xaaa') });

      renderHook(() => useNftMaliciousNftScan([makeNft('0xaaa', '1')]));

      await waitFor(() => expect(mockBulkScan).toHaveBeenCalled());
      expect(mockRemoveNft).not.toHaveBeenCalled();
    },
  );

  it('removes an NFT again when detection adds it back', async () => {
    mockBulkScan.mockResolvedValue({ '0xaaa': verdict('Malicious', '0xaaa') });
    const { rerender } = renderHook(
      ({ list }: { list: Nft[] }) => useNftMaliciousNftScan(list),
      { initialProps: { list: [makeNft('0xaaa', '1')] } },
    );
    await waitFor(() => expect(mockRemoveNft).toHaveBeenCalledTimes(1));

    // Detection re-adds the NFT (alongside a new one), so the list changes
    rerender({ list: [makeNft('0xaaa', '1'), makeNft('0xbbb', '2')] });

    await waitFor(() => expect(mockRemoveNft).toHaveBeenCalledTimes(2));
    // The verdict was cached, so no second scan for the same contract
    expect(mockBulkScan).toHaveBeenCalledTimes(2);
    expect(mockBulkScan).toHaveBeenLastCalledWith({
      chainId: '0x1',
      tokens: ['0xbbb'],
    });
  });

  it('does not request a contract that is already being scanned by an earlier run', async () => {
    let resolveScan: (value: unknown) => void = () => undefined;
    mockBulkScan.mockImplementationOnce(
      () => new Promise((resolve) => (resolveScan = resolve)),
    );
    const { rerender } = renderHook(
      ({ list }: { list: Nft[] }) => useNftMaliciousNftScan(list),
      { initialProps: { list: [makeNft('0xaaa', '1')] } },
    );

    // The list grows while the first scan is still in flight
    rerender({ list: [makeNft('0xaaa', '1'), makeNft('0xbbb', '2')] });

    await waitFor(() => expect(mockBulkScan).toHaveBeenCalledTimes(2));
    expect(mockBulkScan).toHaveBeenLastCalledWith({
      chainId: '0x1',
      tokens: ['0xbbb'],
    });
    await act(async () => resolveScan({}));
  });

  it('keeps scanning the other chains when one request fails', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => 0);
    mockBulkScan.mockRejectedValueOnce(new Error('network'));
    mockBulkScan.mockResolvedValueOnce({
      '0xaaa': verdict('Malicious', '0xaaa'),
    });

    renderHook(() =>
      useNftMaliciousNftScan([
        makeNft('0xaaa', '1', 1),
        makeNft('0xaaa', '2', 137),
      ]),
    );

    await waitFor(() => expect(mockRemoveNft).toHaveBeenCalledTimes(1));
    expect(mockBulkScan).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it('splits scans into batches of 100 per chain', async () => {
    const nfts = Array.from({ length: 150 }, (_, i) =>
      makeNft(`0x${i.toString(16).padStart(40, '0')}`, '1'),
    );

    renderHook(() => useNftMaliciousNftScan(nfts));

    await waitFor(() => expect(mockBulkScan).toHaveBeenCalledTimes(2));
    expect(mockBulkScan.mock.calls[0][0].tokens).toHaveLength(100);
    expect(mockBulkScan.mock.calls[1][0].tokens).toHaveLength(50);
  });

  it('groups contracts by chain', async () => {
    const nfts = [makeNft('0xaaa', '1', 1), makeNft('0xaaa', '1', 137)];

    renderHook(() => useNftMaliciousNftScan(nfts));

    await waitFor(() => expect(mockBulkScan).toHaveBeenCalledTimes(2));
    expect(mockBulkScan).toHaveBeenCalledWith({
      chainId: '0x1',
      tokens: ['0xaaa'],
    });
    expect(mockBulkScan).toHaveBeenCalledWith({
      chainId: '0x89',
      tokens: ['0xaaa'],
    });
  });

  it('does not re-request contracts with a cached verdict', async () => {
    mockBulkScan.mockResolvedValue({ '0xaaa': verdict('Benign', '0xaaa') });
    const { unmount } = renderHook(() =>
      useNftMaliciousNftScan([makeNft('0xaaa', '1')]),
    );
    await waitFor(() => expect(mockBulkScan).toHaveBeenCalledTimes(1));
    unmount();

    renderHook(() =>
      useNftMaliciousNftScan([makeNft('0xaaa', '2'), makeNft('0xbbb', '1')]),
    );

    await waitFor(() => expect(mockBulkScan).toHaveBeenCalledTimes(2));
    expect(mockBulkScan).toHaveBeenLastCalledWith({
      chainId: '0x1',
      tokens: ['0xbbb'],
    });
  });

  it('caches a verdict that arrives after the NFT list changed, so it is not requested again', async () => {
    let resolveScan: (value: unknown) => void = () => undefined;
    mockBulkScan.mockImplementationOnce(
      () => new Promise((resolve) => (resolveScan = resolve)),
    );
    const { rerender } = renderHook(
      ({ list }: { list: Nft[] }) => useNftMaliciousNftScan(list),
      { initialProps: { list: [makeNft('0xaaa', '1')] } },
    );

    // The list changes before the first scan resolves
    rerender({ list: [makeNft('0xbbb', '2')] });
    await act(async () => {
      resolveScan({ '0xaaa': verdict('Benign', '0xaaa') });
    });
    rerender({ list: [makeNft('0xaaa', '1'), makeNft('0xccc', '3')] });

    await waitFor(() => expect(mockBulkScan).toHaveBeenCalledTimes(3));
    expect(mockBulkScan).toHaveBeenLastCalledWith({
      chainId: '0x1',
      tokens: ['0xccc'],
    });
  });

  it('removes NFTs of an already-cached malicious contract without scanning again', async () => {
    mockBulkScan.mockResolvedValue({ '0xaaa': verdict('Malicious', '0xaaa') });
    mockRemoveNft.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    jest.spyOn(console, 'warn').mockImplementation(() => 0);
    const nfts = [makeNft('0xaaa', '1')];
    const { unmount } = renderHook(() => useNftMaliciousNftScan(nfts));
    await waitFor(() => expect(mockRemoveNft).toHaveBeenCalledTimes(1));
    unmount();

    renderHook(() => useNftMaliciousNftScan(nfts));

    await waitFor(() => expect(mockRemoveNft).toHaveBeenCalledTimes(2));
    expect(mockBulkScan).toHaveBeenCalledTimes(1);
  });

  it('keeps going when removal throws for one NFT', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => 0);
    mockBulkScan.mockResolvedValue({ '0xaaa': verdict('Malicious', '0xaaa') });
    mockRemoveNft.mockImplementationOnce(() => {
      throw new Error('boom');
    });

    renderHook(() =>
      useNftMaliciousNftScan([makeNft('0xaaa', '1'), makeNft('0xaaa', '2')]),
    );

    await waitFor(() => expect(mockRemoveNft).toHaveBeenCalledTimes(2));
    expect(warn).toHaveBeenCalledWith(
      'Failed to remove malicious NFT:',
      expect.any(Error),
    );
    warn.mockRestore();
  });

  it('fails open when the scan rejects and retries on a later mount', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => 0);
    mockBulkScan.mockRejectedValueOnce(new Error('network'));
    const nfts = [makeNft('0xaaa', '1')];

    const { unmount } = renderHook(() => useNftMaliciousNftScan(nfts));

    await waitFor(() => expect(warn).toHaveBeenCalled());
    expect(mockRemoveNft).not.toHaveBeenCalled();
    unmount();

    renderHook(() => useNftMaliciousNftScan(nfts));
    await waitFor(() => expect(mockBulkScan).toHaveBeenCalledTimes(2));
    warn.mockRestore();
  });

  it('removes nothing when the chain is unsupported (empty result)', async () => {
    renderHook(() => useNftMaliciousNftScan([makeNft('0xaaa', '1')]));

    await waitFor(() => expect(mockBulkScan).toHaveBeenCalled());
    expect(mockRemoveNft).not.toHaveBeenCalled();
  });

  it('does nothing when the PhishingController method is missing', async () => {
    const controller = Engine.context.PhishingController as unknown as {
      bulkScanTokens?: jest.Mock;
    };
    delete controller.bulkScanTokens;

    renderHook(() => useNftMaliciousNftScan([makeNft('0xaaa', '1')]));

    await waitFor(() => expect(mockRemoveNft).not.toHaveBeenCalled());
    controller.bulkScanTokens = mockBulkScan;
  });

  it('skips NFTs without a chain id', () => {
    renderHook(() =>
      useNftMaliciousNftScan([{ address: '0xaaa', tokenId: '1' } as Nft]),
    );

    expect(mockBulkScan).not.toHaveBeenCalled();
  });
});

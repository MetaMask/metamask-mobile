import { Hex } from '@metamask/utils';
import { query } from '@metamask/controller-utils';
import EthQuery from '@metamask/eth-query';
import { Interface } from '@ethersproject/abi';
import { Provider } from '@metamask/network-controller';
import Engine from '../../../../../core/Engine';
import {
  AGLAMERKL_ADDRESS_MAINNET,
  MERKL_DISTRIBUTOR_ADDRESS,
  DISTRIBUTOR_CLAIMED_ABI,
  MERKL_API_BASE_URL,
} from './constants';

// Mock @metamask/transaction-controller to avoid import issues in tests
jest.mock('@metamask/transaction-controller', () => ({
  CHAIN_IDS: {
    MAINNET: '0x1',
    LINEA_MAINNET: '0xe708',
  },
  TransactionType: {},
  WalletDevice: {},
}));

// Use chain IDs directly to avoid import issues in tests
const MAINNET_CHAIN_ID = '0x1' as const;

// Mock musd constants
jest.mock('../../constants/musd', () => ({
  MUSD_TOKEN_ADDRESS_BY_CHAIN: {
    '0x1': '0xaca92e438df0b2401ff60da7e4337b687a2435da',
    '0xe708': '0xaca92e438df0b2401ff60da7e4337b687a2435da',
  },
}));

// Import after mocks are set up
import {
  getClaimedAmountFromContract,
  fetchMerklRewards,
  clearMerklRewardsCache,
  MerklRewardData,
} from './merkl-client';

// Mock dependencies
jest.mock('../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(),
      getNetworkClientById: jest.fn(),
    },
  },
}));

jest.mock('@metamask/controller-utils', () => ({
  query: jest.fn(),
}));

jest.mock('@metamask/eth-query');

jest.mock('@ethersproject/abi', () => ({
  Interface: jest.fn(),
}));

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockEthQuery = EthQuery as jest.MockedClass<typeof EthQuery>;
const mockInterface = Interface as jest.MockedClass<typeof Interface>;
const mockEngine = Engine as jest.Mocked<typeof Engine>;

interface MockContractInterface {
  encodeFunctionData: jest.Mock<string, [string, unknown[]]>;
  decodeFunctionResult: jest.Mock<
    { amount: bigint; timestamp?: bigint; merkleRoot?: string } | unknown[],
    [string, string]
  >;
}

interface MockNetworkClient {
  provider: Provider;
}

const mockNetworkController: {
  findNetworkClientIdByChainId: jest.Mock<string | undefined, [Hex]>;
  getNetworkClientById: jest.Mock<MockNetworkClient, [string]>;
} = {
  findNetworkClientIdByChainId: jest.fn(),
  getNetworkClientById: jest.fn(),
};

describe('getClaimedAmountFromContract', () => {
  const mockUserAddress = '0x1234567890123456789012345678901234567890';
  const mockTokenAddress = AGLAMERKL_ADDRESS_MAINNET as Hex;
  const mockChainId = MAINNET_CHAIN_ID;
  const mockNetworkClientId = 'mainnet';
  const mockProvider = { send: jest.fn() } as unknown as Provider;

  let mockContractInterface: MockContractInterface;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(mockEngine, {
      context: {
        NetworkController: mockNetworkController,
      },
    });
    mockContractInterface = {
      encodeFunctionData: jest.fn(),
      decodeFunctionResult: jest.fn(),
    };

    mockInterface.mockImplementation(
      () => mockContractInterface as unknown as Interface,
    );
    mockEthQuery.mockImplementation(() => ({}) as EthQuery);
    mockNetworkController.findNetworkClientIdByChainId.mockReturnValue(
      mockNetworkClientId,
    );
    mockNetworkController.getNetworkClientById.mockReturnValue({
      provider: mockProvider,
    });
  });

  it('returns claimed amount with named struct', async () => {
    const mockEncodedData = '0x1234567890abcdef';
    const mockResponse =
      '0x0000000000000000000000000000000000000000000000000000000000000001';
    const mockDecoded = {
      amount: BigInt('222540254228106035846'),
      timestamp: BigInt('1768817903'),
      merkleRoot:
        '0xd9d1b028cd4d551e045e52e2f48d38a7921fb3d879cd994ffd22f30ddc6a7494',
    };

    mockContractInterface.encodeFunctionData.mockReturnValue(mockEncodedData);
    mockContractInterface.decodeFunctionResult.mockReturnValue(mockDecoded);
    mockQuery.mockResolvedValue(mockResponse);

    const result = await getClaimedAmountFromContract(
      mockUserAddress,
      mockTokenAddress,
      mockChainId,
    );

    expect(result).toBe('222540254228106035846');
    expect(
      mockNetworkController.findNetworkClientIdByChainId,
    ).toHaveBeenCalledWith(mockChainId);
    expect(mockNetworkController.getNetworkClientById).toHaveBeenCalledWith(
      mockNetworkClientId,
    );
    expect(mockContractInterface.encodeFunctionData).toHaveBeenCalledWith(
      'claimed',
      [mockUserAddress, mockTokenAddress],
    );
    expect(mockQuery).toHaveBeenCalledWith(expect.any(Object), 'call', [
      {
        to: MERKL_DISTRIBUTOR_ADDRESS,
        data: mockEncodedData,
      },
      'latest',
    ]);
    expect(mockContractInterface.decodeFunctionResult).toHaveBeenCalledWith(
      'claimed',
      mockResponse,
    );
  });

  it('returns claimed amount with positional struct', async () => {
    const mockEncodedData = '0x1234567890abcdef';
    const mockResponse =
      '0x0000000000000000000000000000000000000000000000000000000000000001';
    const mockDecoded = [
      BigInt('222540254228106035846'),
      BigInt('1768817903'),
      '0xd9d1b028cd4d551e045e52e2f48d38a7921fb3d879cd994ffd22f30ddc6a7494',
    ];

    mockContractInterface.encodeFunctionData.mockReturnValue(mockEncodedData);
    mockContractInterface.decodeFunctionResult.mockReturnValue(mockDecoded);
    mockQuery.mockResolvedValue(mockResponse);

    const result = await getClaimedAmountFromContract(
      mockUserAddress,
      mockTokenAddress,
      mockChainId,
    );

    expect(result).toBe('222540254228106035846');
  });

  it('returns null when networkClientId is not found', async () => {
    mockNetworkController.findNetworkClientIdByChainId.mockReturnValue(
      undefined,
    );

    const result = await getClaimedAmountFromContract(
      mockUserAddress,
      mockTokenAddress,
      mockChainId,
    );

    expect(result).toBe(null);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('returns null when response is empty', async () => {
    const mockEncodedData = '0x1234567890abcdef';

    mockContractInterface.encodeFunctionData.mockReturnValue(mockEncodedData);
    mockQuery.mockResolvedValue('0x');

    const result = await getClaimedAmountFromContract(
      mockUserAddress,
      mockTokenAddress,
      mockChainId,
    );

    expect(result).toBe(null);
    expect(mockContractInterface.decodeFunctionResult).not.toHaveBeenCalled();
  });

  it('returns null when response is null', async () => {
    const mockEncodedData = '0x1234567890abcdef';

    mockContractInterface.encodeFunctionData.mockReturnValue(mockEncodedData);
    mockQuery.mockResolvedValue(null);

    const result = await getClaimedAmountFromContract(
      mockUserAddress,
      mockTokenAddress,
      mockChainId,
    );

    expect(result).toBe(null);
    expect(mockContractInterface.decodeFunctionResult).not.toHaveBeenCalled();
  });

  it('returns null when contract call throws an error', async () => {
    const mockEncodedData = '0x1234567890abcdef';

    mockContractInterface.encodeFunctionData.mockReturnValue(mockEncodedData);
    mockQuery.mockRejectedValue(new Error('RPC error'));

    const result = await getClaimedAmountFromContract(
      mockUserAddress,
      mockTokenAddress,
      mockChainId,
    );

    expect(result).toBe(null);
  });

  it('returns null when decodeFunctionResult throws an error', async () => {
    const mockEncodedData = '0x1234567890abcdef';
    const mockResponse =
      '0x0000000000000000000000000000000000000000000000000000000000000001';

    mockContractInterface.encodeFunctionData.mockReturnValue(mockEncodedData);
    mockContractInterface.decodeFunctionResult.mockImplementation(() => {
      throw new Error('Decode error');
    });
    mockQuery.mockResolvedValue(mockResponse);

    const result = await getClaimedAmountFromContract(
      mockUserAddress,
      mockTokenAddress,
      mockChainId,
    );

    expect(result).toBe(null);
  });

  it('uses correct ABI for Interface', async () => {
    const mockEncodedData = '0x1234567890abcdef';
    const mockResponse =
      '0x0000000000000000000000000000000000000000000000000000000000000001';
    const mockDecoded = {
      amount: BigInt('1000000000000000000'),
    };

    mockContractInterface.encodeFunctionData.mockReturnValue(mockEncodedData);
    mockContractInterface.decodeFunctionResult.mockReturnValue(mockDecoded);
    mockQuery.mockResolvedValue(mockResponse);

    await getClaimedAmountFromContract(
      mockUserAddress,
      mockTokenAddress,
      mockChainId,
    );

    expect(mockInterface).toHaveBeenCalledWith(DISTRIBUTOR_CLAIMED_ABI);
  });

  it('handles zero claimed amount', async () => {
    const mockEncodedData = '0x1234567890abcdef';
    const mockResponse =
      '0x0000000000000000000000000000000000000000000000000000000000000001';
    const mockDecoded = {
      amount: BigInt('0'),
    };

    mockContractInterface.encodeFunctionData.mockReturnValue(mockEncodedData);
    mockContractInterface.decodeFunctionResult.mockReturnValue(mockDecoded);
    mockQuery.mockResolvedValue(mockResponse);

    const result = await getClaimedAmountFromContract(
      mockUserAddress,
      mockTokenAddress,
      mockChainId,
    );

    expect(result).toBe('0');
  });
});

// ---------------------------------------------------------------------------
// fetchMerklRewards – caching & deduplication
// ---------------------------------------------------------------------------

describe('fetchMerklRewards caching', () => {
  const mockUserAddress = '0xabc0000000000000000000000000000000000001';
  const mockTokenAddress = '0xdef0000000000000000000000000000000000002' as Hex;
  const mockChainId = MAINNET_CHAIN_ID as Hex;

  const mockRewardData: MerklRewardData[] = [
    {
      rewards: [
        {
          token: {
            address: mockTokenAddress,
            chainId: 1,
            symbol: 'TST',
            decimals: 18,
            price: 1,
          },
          pending: '0',
          proofs: ['0xproof1'],
          amount: '1000000000000000000',
          claimed: '0',
          recipient: mockUserAddress,
        },
      ],
    },
  ];

  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    // Reset cache between tests
    clearMerklRewardsCache();
    jest.restoreAllMocks();

    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockRewardData,
    } as Response);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns data from the API on first call', async () => {
    const result = await fetchMerklRewards({
      userAddress: mockUserAddress,
      chainIds: mockChainId,
      tokenAddress: mockTokenAddress,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockRewardData[0].rewards[0]);
  });

  it('returns cached data on second call without hitting the network', async () => {
    // First call – populates cache
    await fetchMerklRewards({
      userAddress: mockUserAddress,
      chainIds: mockChainId,
      tokenAddress: mockTokenAddress,
    });

    // Second call – should use cache
    const result = await fetchMerklRewards({
      userAddress: mockUserAddress,
      chainIds: mockChainId,
      tokenAddress: mockTokenAddress,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockRewardData[0].rewards[0]);
  });

  it('deduplicates concurrent requests to the same URL', async () => {
    // Fire two requests concurrently
    const [result1, result2] = await Promise.all([
      fetchMerklRewards({
        userAddress: mockUserAddress,
        chainIds: mockChainId,
        tokenAddress: mockTokenAddress,
      }),
      fetchMerklRewards({
        userAddress: mockUserAddress,
        chainIds: mockChainId,
        tokenAddress: mockTokenAddress,
      }),
    ]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result1).toEqual(result2);
  });

  it('fetches fresh data after clearMerklRewardsCache()', async () => {
    // Populate cache
    await fetchMerklRewards({
      userAddress: mockUserAddress,
      chainIds: mockChainId,
      tokenAddress: mockTokenAddress,
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Invalidate
    clearMerklRewardsCache();

    // Should hit the network again
    await fetchMerklRewards({
      userAddress: mockUserAddress,
      chainIds: mockChainId,
      tokenAddress: mockTokenAddress,
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('fetches fresh data after TTL expires', async () => {
    // Populate cache
    await fetchMerklRewards({
      userAddress: mockUserAddress,
      chainIds: mockChainId,
      tokenAddress: mockTokenAddress,
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Advance time past TTL (2 minutes)
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now + 2 * 60 * 1000 + 1);

    await fetchMerklRewards({
      userAddress: mockUserAddress,
      chainIds: mockChainId,
      tokenAddress: mockTokenAddress,
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('does not share cache across different URLs', async () => {
    const otherAddress = '0xother000000000000000000000000000000000099';

    await fetchMerklRewards({
      userAddress: mockUserAddress,
      chainIds: mockChainId,
      tokenAddress: mockTokenAddress,
    });

    await fetchMerklRewards({
      userAddress: otherAddress,
      chainIds: mockChainId,
      tokenAddress: mockTokenAddress,
    });

    // Two different URLs → two network calls
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('returns null (throwOnError=false) when API returns non-ok and no cache', async () => {
    fetchSpy.mockResolvedValueOnce({ ok: false, status: 500 } as Response);

    const result = await fetchMerklRewards(
      {
        userAddress: mockUserAddress,
        chainIds: mockChainId,
        tokenAddress: mockTokenAddress,
      },
      false,
    );

    expect(result).toBeNull();
  });

  it('throws (throwOnError=true) when API returns non-ok and no cache', async () => {
    fetchSpy.mockResolvedValueOnce({ ok: false, status: 500 } as Response);

    await expect(
      fetchMerklRewards({
        userAddress: mockUserAddress,
        chainIds: mockChainId,
        tokenAddress: mockTokenAddress,
      }),
    ).rejects.toThrow('Failed to fetch Merkl rewards: 500');
  });

  it('does not cache failed responses', async () => {
    fetchSpy.mockResolvedValueOnce({ ok: false, status: 500 } as Response);

    // First call fails
    await fetchMerklRewards(
      {
        userAddress: mockUserAddress,
        chainIds: mockChainId,
        tokenAddress: mockTokenAddress,
      },
      false,
    );

    // Reset mock to succeed
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => mockRewardData,
    } as Response);

    // Second call should hit the network (no stale failure cached)
    const result = await fetchMerklRewards({
      userAddress: mockUserAddress,
      chainIds: mockChainId,
      tokenAddress: mockTokenAddress,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result).toEqual(mockRewardData[0].rewards[0]);
  });

  it('constructs the correct URL with the expected base', async () => {
    await fetchMerklRewards({
      userAddress: mockUserAddress,
      chainIds: mockChainId,
      tokenAddress: mockTokenAddress,
    });

    const calledUrl = fetchSpy.mock.calls[0][0];
    expect(calledUrl).toBe(
      `${MERKL_API_BASE_URL}/users/${mockUserAddress}/rewards?chainId=1`,
    );
  });
});

// ---------------------------------------------------------------------------
// AbortSignal handling (throwIfAborted polyfill)
// ---------------------------------------------------------------------------

describe('fetchMerklRewards abort signal handling', () => {
  const mockUserAddress = '0xabc0000000000000000000000000000000000001';
  const mockTokenAddress = '0xdef0000000000000000000000000000000000002' as Hex;
  const mockChainId = MAINNET_CHAIN_ID as Hex;

  const mockRewardData: MerklRewardData[] = [
    {
      rewards: [
        {
          token: {
            address: mockTokenAddress,
            chainId: 1,
            symbol: 'TST',
            decimals: 18,
            price: 1,
          },
          pending: '0',
          proofs: ['0xproof1'],
          amount: '1000000000000000000',
          claimed: '0',
          recipient: mockUserAddress,
        },
      ],
    },
  ];

  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    clearMerklRewardsCache();
    jest.restoreAllMocks();

    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockRewardData,
    } as Response);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('throws AbortError immediately when signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      fetchMerklRewards({
        userAddress: mockUserAddress,
        chainIds: mockChainId,
        tokenAddress: mockTokenAddress,
        signal: controller.signal,
      }),
    ).rejects.toThrow('The operation was aborted.');

    // Should never reach the network
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('thrown error has name "AbortError"', async () => {
    const controller = new AbortController();
    controller.abort();

    try {
      await fetchMerklRewards({
        userAddress: mockUserAddress,
        chainIds: mockChainId,
        tokenAddress: mockTokenAddress,
        signal: controller.signal,
      });
      fail('Expected an error to be thrown');
    } catch (error) {
      expect((error as Error).name).toBe('AbortError');
    }
  });

  it('throws AbortError after shared request completes when signal is aborted during dedup wait', async () => {
    const controller = new AbortController();

    // Slow fetch so the second caller joins the pending promise
    let resolveSlowFetch!: (value: Response) => void;
    fetchSpy.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        resolveSlowFetch = resolve;
      }),
    );

    // First call — no signal, starts the request
    const firstPromise = fetchMerklRewards({
      userAddress: mockUserAddress,
      chainIds: mockChainId,
      tokenAddress: mockTokenAddress,
    });

    // Second call — with signal, joins the pending promise
    const secondPromise = fetchMerklRewards({
      userAddress: mockUserAddress,
      chainIds: mockChainId,
      tokenAddress: mockTokenAddress,
      signal: controller.signal,
    });

    // Abort while the request is still in-flight
    controller.abort();

    // Resolve the shared fetch
    resolveSlowFetch({
      ok: true,
      json: async () => mockRewardData,
    } as Response);

    // First call succeeds, second throws
    await expect(firstPromise).resolves.toEqual(mockRewardData[0].rewards[0]);
    await expect(secondPromise).rejects.toThrow('The operation was aborted.');
  });

  it('throws AbortError after new request completes when signal is aborted during fetch', async () => {
    const controller = new AbortController();

    let resolveSlowFetch!: (value: Response) => void;
    fetchSpy.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        resolveSlowFetch = resolve;
      }),
    );

    const promise = fetchMerklRewards({
      userAddress: mockUserAddress,
      chainIds: mockChainId,
      tokenAddress: mockTokenAddress,
      signal: controller.signal,
    });

    // Abort while fetch is in-flight
    controller.abort();

    // Resolve the fetch
    resolveSlowFetch({
      ok: true,
      json: async () => mockRewardData,
    } as Response);

    await expect(promise).rejects.toThrow('The operation was aborted.');
  });

  it('succeeds when signal is provided but not aborted', async () => {
    const controller = new AbortController();

    const result = await fetchMerklRewards({
      userAddress: mockUserAddress,
      chainIds: mockChainId,
      tokenAddress: mockTokenAddress,
      signal: controller.signal,
    });

    expect(result).toEqual(mockRewardData[0].rewards[0]);
  });

  it('succeeds when no signal is provided (undefined)', async () => {
    const result = await fetchMerklRewards({
      userAddress: mockUserAddress,
      chainIds: mockChainId,
      tokenAddress: mockTokenAddress,
    });

    expect(result).toEqual(mockRewardData[0].rewards[0]);
  });
});

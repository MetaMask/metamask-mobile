import { Hex } from '@metamask/utils';
import { query } from '@metamask/controller-utils';
import EthQuery from '@metamask/eth-query';
import { Interface } from '@ethersproject/abi';
import { Provider } from '@metamask/network-controller';
import Engine from '../../../../../core/Engine';
import { getClaimedAmountFromContract } from './merkl-client';
import {
  AGLAMERKL_ADDRESS,
  MERKL_DISTRIBUTOR_ADDRESS,
  DISTRIBUTOR_CLAIMED_ABI,
} from './constants';

// Use chain IDs directly to avoid import issues in tests
const MAINNET_CHAIN_ID = '0x1' as const;

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
  const mockTokenAddress = AGLAMERKL_ADDRESS as Hex;
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

  it('returns "0" when networkClientId is not found', async () => {
    mockNetworkController.findNetworkClientIdByChainId.mockReturnValue(
      undefined,
    );

    const result = await getClaimedAmountFromContract(
      mockUserAddress,
      mockTokenAddress,
      mockChainId,
    );

    expect(result).toBe('0');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('returns "0" when response is empty', async () => {
    const mockEncodedData = '0x1234567890abcdef';

    mockContractInterface.encodeFunctionData.mockReturnValue(mockEncodedData);
    mockQuery.mockResolvedValue('0x');

    const result = await getClaimedAmountFromContract(
      mockUserAddress,
      mockTokenAddress,
      mockChainId,
    );

    expect(result).toBe('0');
    expect(mockContractInterface.decodeFunctionResult).not.toHaveBeenCalled();
  });

  it('returns "0" when response is null', async () => {
    const mockEncodedData = '0x1234567890abcdef';

    mockContractInterface.encodeFunctionData.mockReturnValue(mockEncodedData);
    mockQuery.mockResolvedValue(null);

    const result = await getClaimedAmountFromContract(
      mockUserAddress,
      mockTokenAddress,
      mockChainId,
    );

    expect(result).toBe('0');
    expect(mockContractInterface.decodeFunctionResult).not.toHaveBeenCalled();
  });

  it('returns "0" when contract call throws an error', async () => {
    const mockEncodedData = '0x1234567890abcdef';

    mockContractInterface.encodeFunctionData.mockReturnValue(mockEncodedData);
    mockQuery.mockRejectedValue(new Error('RPC error'));

    const result = await getClaimedAmountFromContract(
      mockUserAddress,
      mockTokenAddress,
      mockChainId,
    );

    expect(result).toBe('0');
  });

  it('returns "0" when decodeFunctionResult throws an error', async () => {
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

    expect(result).toBe('0');
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

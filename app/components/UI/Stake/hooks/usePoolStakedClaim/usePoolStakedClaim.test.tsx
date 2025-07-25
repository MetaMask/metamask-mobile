import { ChainId, PooledStakingContract } from '@metamask/stake-sdk';
import { Contract } from 'ethers';
import usePoolStakedClaim from '.';
import { createMockAccountsControllerState } from '../../../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { MOCK_GET_POOLED_STAKES_API_RESPONSE } from '../../__mocks__/stakeMockData';
import { Stake } from '../../sdk/stakeSdkProvider';

const MOCK_ADDRESS_1 = '0x0123456789abcdef0123456789abcdef01234567';
const MOCK_NETWORK_CLIENT_ID = 'testNetworkClientId';
const MOCK_CLAIM_GAS_LIMIT = 201225;

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS_1,
]);

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

const mockPooledStakeData = MOCK_GET_POOLED_STAKES_API_RESPONSE.accounts[0];

// Create mock functions that can be reset and re-implemented
let mockEstimateMulticallGas: jest.Mock;
let mockEstimateClaimExitedAssetsGas: jest.Mock;
let mockEncodeMulticallTransactionData: jest.Mock;
let mockEncodeClaimExitedAssetsTransactionData: jest.Mock;
let mockAddTransaction: jest.Mock;
let mockUseStakeContext: jest.Mock;

// Mock the Engine module
jest.mock('../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      getNetworkClientById: jest.fn().mockReturnValue({
        configuration: {
          chainId: '0x1',
          rpcUrl: 'https://mainnet.infura.io/v3',
          ticker: 'ETH',
          type: 'custom',
        },
      }),
      findNetworkClientIdByChainId: jest.fn().mockReturnValue('mainnet'),
    },
    TransactionController: {
      get addTransaction() {
        return mockAddTransaction;
      },
    },
  },
}));

// Mock useStakeContext
jest.mock('../useStakeContext', () => ({
  get useStakeContext() {
    return mockUseStakeContext;
  },
}));

describe('usePoolStakedClaim', () => {
  let mockPooledStakingContractService: PooledStakingContract;
  let mockSdkContext: Stake;

  beforeAll(() => {
    jest.resetAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Re-create mock functions with fresh implementations
    mockEstimateMulticallGas = jest
      .fn()
      .mockResolvedValue(MOCK_CLAIM_GAS_LIMIT);
    mockEstimateClaimExitedAssetsGas = jest
      .fn()
      .mockResolvedValue(MOCK_CLAIM_GAS_LIMIT);
    mockEncodeMulticallTransactionData = jest.fn().mockResolvedValue({
      data: '0x00000',
      chainId: '1',
    });
    mockEncodeClaimExitedAssetsTransactionData = jest.fn().mockResolvedValue({
      data: '0x00000',
      chainId: '1',
    });
    mockAddTransaction = jest.fn().mockResolvedValue(1);
    mockUseStakeContext = jest.fn();

    // Create fresh contract service mock
    mockPooledStakingContractService = {
      chainId: ChainId.ETHEREUM,
      contract: new Contract('0x0000000000000000000000000000000000000000', []),
      convertToShares: jest.fn(),
      encodeClaimExitedAssetsTransactionData:
        mockEncodeClaimExitedAssetsTransactionData,
      encodeDepositTransactionData: jest.fn(),
      encodeEnterExitQueueTransactionData: jest.fn(),
      encodeMulticallTransactionData: mockEncodeMulticallTransactionData,
      estimateClaimExitedAssetsGas: mockEstimateClaimExitedAssetsGas,
      estimateDepositGas: jest.fn(),
      estimateEnterExitQueueGas: jest.fn(),
      estimateMulticallGas: mockEstimateMulticallGas,
      getShares: jest.fn(),
    };

    // Create fresh SDK context mock
    mockSdkContext = {
      stakingContract: mockPooledStakingContractService,
      networkClientId: MOCK_NETWORK_CLIENT_ID,
    };

    // Set up the mock to return our fresh context
    mockUseStakeContext.mockReturnValue(mockSdkContext);
  });

  afterAll(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('attempts to claim multiple exit requests via multicall', async () => {
    const { result } = renderHookWithProvider(() => usePoolStakedClaim(), {
      state: mockInitialState,
    });

    await result.current.attemptPoolStakedClaimTransaction(
      MOCK_ADDRESS_1,
      mockPooledStakeData,
    );

    expect(mockEstimateMulticallGas).toHaveBeenCalledTimes(1);
    expect(mockEncodeMulticallTransactionData).toHaveBeenCalledTimes(1);
    expect(mockAddTransaction).toHaveBeenCalledTimes(1);
  });

  it('attempts to claim a single exit request', async () => {
    const mockPooledStakeDataWithSingleExistRequest = {
      ...mockPooledStakeData,
      exitRequests: [mockPooledStakeData.exitRequests[1]],
    };

    const { result } = renderHookWithProvider(() => usePoolStakedClaim(), {
      state: mockInitialState,
    });

    await result.current.attemptPoolStakedClaimTransaction(
      MOCK_ADDRESS_1,
      mockPooledStakeDataWithSingleExistRequest,
    );

    expect(mockEstimateClaimExitedAssetsGas).toHaveBeenCalledTimes(1);
    expect(mockEncodeClaimExitedAssetsTransactionData).toHaveBeenCalledTimes(1);
    expect(mockAddTransaction).toHaveBeenCalledTimes(1);
  });
});

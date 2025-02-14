import {
  ChainId,
  PooledStakingContract,
  StakingType,
} from '@metamask/stake-sdk';
import usePoolStakedClaim from '.';
import { Contract } from 'ethers';
import { Stake } from '../../sdk/stakeSdkProvider';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { createMockAccountsControllerState } from '../../../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { MOCK_GET_POOLED_STAKES_API_RESPONSE } from '../../__mocks__/mockData';

const MOCK_ADDRESS_1 = '0x0123456789abcdef0123456789abcdef01234567';
const MOCK_NETWORK_CLIENT_ID = 'testNetworkClientId';

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

const MOCK_CLAIM_GAS_LIMIT = 201225;

const mockEstimateMulticallGas = jest
  .fn()
  .mockResolvedValue(MOCK_CLAIM_GAS_LIMIT);

const mockEstimateClaimExitedAssetsGas = jest
  .fn()
  .mockResolvedValue(MOCK_CLAIM_GAS_LIMIT);

const mockEncodeMulticallTransactionData = jest.fn().mockResolvedValue({
  data: '0x00000',
  chainId: '1',
});

const mockEncodeClaimExitedAssetsTransactionData = jest.fn().mockResolvedValue({
  data: '0x00000',
  chainId: '1',
});

const mockPooledStakingContractService: PooledStakingContract = {
  chainId: ChainId.ETHEREUM,
  connectSignerOrProvider: jest.fn(),
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

const mockSdkContext: Stake = {
  stakingContract: mockPooledStakingContractService,
  sdkType: StakingType.POOLED,
  setSdkType: jest.fn(),
  networkClientId: MOCK_NETWORK_CLIENT_ID,
};

jest.mock('../useStakeContext', () => ({
  useStakeContext: () => mockSdkContext,
}));

let mockAddTransaction: jest.Mock;

jest.mock('../../../../../core/Engine', () => {
  mockAddTransaction = jest.fn().mockResolvedValue(1);

  return {
    context: {
      NetworkController: {
        getNetworkClientById: () => ({
          configuration: {
            chainId: '0x1',
            rpcUrl: 'https://mainnet.infura.io/v3',
            ticker: 'ETH',
            type: 'custom',
          },
        }),
        findNetworkClientIdByChainId: () => 'mainnet',
      },
      TransactionController: {
        addTransaction: mockAddTransaction,
      },
    },
  };
});

const mockPooledStakeData = MOCK_GET_POOLED_STAKES_API_RESPONSE.accounts[0];

describe('usePoolStakedClaim', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
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

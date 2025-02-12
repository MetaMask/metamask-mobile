import usePoolStakedUnstake from '.';
import { createMockAccountsControllerState } from '../../../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import {
  PooledStakingContract,
  StakingType,
  ChainId,
} from '@metamask/stake-sdk';
import { BigNumber, Contract } from 'ethers';
import { Stake } from '../../sdk/stakeSdkProvider';
import useBalance from '../useBalance';

const MOCK_ADDRESS_1 = '0x0';

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

const MOCK_DEPOSIT_CONTRACT_ADDRESS =
  '0x4fef9d741011476750a243ac70b9789a63dd47df';

const MOCK_RECEIVER_ADDRESS = '0x316bde155acd07609872a56bc32ccfb0b13201fa';
const MOCK_UNSTAKE_GAS_LIMIT = 73135;
const MOCK_UNSTAKE_VALUE_WEI = '10000000000000000'; // 0.01 ETH
const MOCK_STAKED_BALANCE_VALUE_WEI = '20000000000000000'; // 0.02 ETH
const MOCK_UNSTAKE_ALL_VALUE_WEI = MOCK_STAKED_BALANCE_VALUE_WEI;
const MOCK_USER_SHARES = '20000000000008000';
const MOCK_NETWORK_CLIENT_ID = 'testNetworkClientId';

const ENCODED_TX_UNSTAKE_DATA = {
  chainId: 1,
  data: '0x8ceab9aa00000000000000000000000000000000000000000000000000230fa39a9b6ca0000000000000000000000000316bde155acd07609872a56bc32ccfb0b13201fa',
  from: MOCK_RECEIVER_ADDRESS,
  gasLimit: 1699079,
  to: MOCK_DEPOSIT_CONTRACT_ADDRESS,
  value: '0',
};

const mockConnectSignerOrProvider = jest.fn().mockReturnValue({ provider: {} });
const mockEstimateEnterExitQueueGas = jest
  .fn()
  .mockResolvedValue(MOCK_UNSTAKE_GAS_LIMIT);
const mockEncodeEnterExitQueueTransactionData = jest
  .fn()
  .mockReturnValue(ENCODED_TX_UNSTAKE_DATA);

const mockConvertToShares = jest
  .fn()
  .mockResolvedValue({ hex: '0x230fa39a9b6ca0', type: 'BigNumber' });

const mockGetShares = jest
  .fn()
  .mockResolvedValue(BigNumber.from(MOCK_USER_SHARES));

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

const mockPooledStakingContractService: PooledStakingContract = {
  chainId: ChainId.ETHEREUM,
  connectSignerOrProvider: mockConnectSignerOrProvider,
  contract: {
    ...new Contract('0x0000000000000000000000000000000000000000', []),
    provider: {
      call: jest.fn(),
    },
  } as unknown as Contract,
  convertToShares: mockConvertToShares,
  getShares: mockGetShares,
  encodeClaimExitedAssetsTransactionData: jest.fn(),
  encodeDepositTransactionData: jest.fn(),
  encodeEnterExitQueueTransactionData: mockEncodeEnterExitQueueTransactionData,
  encodeMulticallTransactionData: jest.fn(),
  estimateClaimExitedAssetsGas: jest.fn(),
  estimateDepositGas: jest.fn(),
  estimateEnterExitQueueGas: mockEstimateEnterExitQueueGas,
  estimateMulticallGas: jest.fn(),
};

const mockSdkContext: Stake = {
  stakingContract: mockPooledStakingContractService,
  sdkType: StakingType.POOLED,
  setSdkType: jest.fn(),
  networkClientId: MOCK_NETWORK_CLIENT_ID,
};

const mockBalance: Pick<ReturnType<typeof useBalance>, 'stakedBalanceWei'> = {
  stakedBalanceWei: MOCK_STAKED_BALANCE_VALUE_WEI,
};

jest.mock('../useStakeContext', () => ({
  useStakeContext: () => mockSdkContext,
}));

jest.mock('../useBalance', () => ({
  __esModule: true,
  default: () => mockBalance,
}));

describe('usePoolStakedUnstake', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  describe('attemptUnstakeTransaction', () => {
    it('attempts to create and submit an unstake transaction', async () => {
      const { result } = renderHookWithProvider(() => usePoolStakedUnstake(), {
        state: mockInitialState,
      });

      await result.current.attemptUnstakeTransaction(
        MOCK_UNSTAKE_VALUE_WEI,
        MOCK_RECEIVER_ADDRESS,
      );

      expect(mockGetShares).toHaveBeenCalledTimes(0);
      expect(mockConvertToShares).toHaveBeenCalledTimes(1);
      expect(mockEstimateEnterExitQueueGas).toHaveBeenCalledTimes(1);
      expect(mockEncodeEnterExitQueueTransactionData).toHaveBeenCalledTimes(1);
      expect(mockAddTransaction).toHaveBeenCalledTimes(1);
    });

    it('attempts to create and submit an unstake all transaction', async () => {
      const { result } = renderHookWithProvider(() => usePoolStakedUnstake(), {
        state: mockInitialState,
      });

      await result.current.attemptUnstakeTransaction(
        MOCK_UNSTAKE_ALL_VALUE_WEI,
        MOCK_RECEIVER_ADDRESS,
      );

      expect(mockConvertToShares).toHaveBeenCalledTimes(0);
      expect(mockGetShares).toHaveBeenCalledTimes(1);
      expect(mockEstimateEnterExitQueueGas).toHaveBeenCalledTimes(1);
      expect(mockEncodeEnterExitQueueTransactionData).toHaveBeenCalledTimes(1);
      expect(mockEncodeEnterExitQueueTransactionData).toHaveBeenCalledWith(BigNumber.from(MOCK_USER_SHARES), MOCK_RECEIVER_ADDRESS, { gasLimit: MOCK_UNSTAKE_GAS_LIMIT });
      expect(mockAddTransaction).toHaveBeenCalledTimes(1);
    });
  });
});

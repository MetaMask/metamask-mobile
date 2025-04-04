import { toHex } from '@metamask/controller-utils';
import usePoolStakedDeposit from './index';
import { createMockAccountsControllerState } from '../../../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import useMetrics from '../../../../hooks/useMetrics/useMetrics';
import { MetricsEventBuilder } from '../../../../../core/Analytics/MetricsEventBuilder';
import {
  PooledStakingContract,
  StakingType,
  ChainId,
} from '@metamask/stake-sdk';
import { Contract } from 'ethers';
import { Stake } from '../../sdk/stakeSdkProvider';
import { EVENT_PROVIDERS } from '../../constants/events';
const MOCK_ADDRESS_1 = '0x0';
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

const MOCK_DEPOSIT_CONTRACT_ADDRESS =
  '0x4fef9d741011476750a243ac70b9789a63dd47df';
const MOCK_RECEIVER_ADDRESS = '0x316bde155acd07609872a56bc32ccfb0b13201fa';
const MOCK_STAKE_DEPOSIT_GAS_LIMIT = 54809;
const MOCK_DEPOSIT_VALUE_WEI = '10000000000000000'; // 0.01 ETH

const ENCODED_TX_DEPOSIT_DATA = {
  chainId: 1,
  data: '0xf9609f08000000000000000000000000316bde155acd07609872a56bc32ccfb0b13201fa0000000000000000000000000000000000000000000000000000000000000000',
  from: MOCK_RECEIVER_ADDRESS,
  gasLimit: 1699079,
  to: MOCK_DEPOSIT_CONTRACT_ADDRESS,
  value: { hex: toHex(MOCK_DEPOSIT_VALUE_WEI), type: 'BigNumber' },
};

const mockConnectSignerOrProvider = jest.fn().mockReturnValue({ provider: {} });
const mockEstimateDepositGas = jest
  .fn()
  .mockResolvedValue(MOCK_STAKE_DEPOSIT_GAS_LIMIT);
const mockEncodeDepositTransactionData = jest
  .fn()
  .mockReturnValue(ENCODED_TX_DEPOSIT_DATA);
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
  contract: new Contract('0x0000000000000000000000000000000000000000', []),
  convertToShares: jest.fn(),
  encodeClaimExitedAssetsTransactionData: jest.fn(),
  encodeDepositTransactionData: mockEncodeDepositTransactionData,
  encodeEnterExitQueueTransactionData: jest.fn(),
  encodeMulticallTransactionData: jest.fn(),
  estimateClaimExitedAssetsGas: jest.fn(),
  estimateDepositGas: mockEstimateDepositGas,
  estimateEnterExitQueueGas: jest.fn(),
  estimateMulticallGas: jest.fn(),
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

jest.mock('../../../../hooks/useMetrics/useMetrics');

describe('usePoolStakedDeposit', () => {
  const mockTrackEvent = jest.fn();
  const useMetricsMock = jest.mocked(useMetrics);

  beforeEach(() => {
    useMetricsMock.mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: MetricsEventBuilder.createEventBuilder,
    } as unknown as ReturnType<typeof useMetrics>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  describe('attemptDepositTransaction', () => {
    it('attempts to create and submit a staking deposit transaction', async () => {
      const { result } = renderHookWithProvider(() => usePoolStakedDeposit(), {
        state: mockInitialState,
      });

      await result.current.attemptDepositTransaction(
        MOCK_DEPOSIT_VALUE_WEI,
        MOCK_RECEIVER_ADDRESS,
      );

      expect(mockEncodeDepositTransactionData).toHaveBeenCalledTimes(1);
      expect(mockEstimateDepositGas).toHaveBeenCalledTimes(1);
      expect(mockAddTransaction).toHaveBeenCalledTimes(1);

      await result.current.attemptDepositTransaction(
        MOCK_DEPOSIT_VALUE_WEI,
        MOCK_RECEIVER_ADDRESS,
        undefined,
        true,
      );

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: expect.objectContaining({
            is_redesigned: true,
            selected_provider: EVENT_PROVIDERS.CONSENSYS,
            transaction_amount_eth: '0.01',
          }),
        }),
      );
    });
  });
});

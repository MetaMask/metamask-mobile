import {
  ChainId,
  PooledStakingContract,
  StakingType,
} from '@metamask/stake-sdk';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { Stake } from '../sdk/stakeSdkProvider';
// eslint-disable-next-line import/no-namespace
import * as useStakeContextHook from '../hooks/useStakeContext';
import { Contract } from '@ethersproject/contracts';
import { StakeModalStack, StakeScreenStack } from '../routes';

const mockPooledStakingContractService: PooledStakingContract = {
  chainId: ChainId.ETHEREUM,
  connectSignerOrProvider: jest.fn(),
  contract: new Contract('0x0000000000000000000000000000000000000000', []),
  convertToShares: jest.fn(),
  encodeClaimExitedAssetsTransactionData: jest.fn(),
  encodeDepositTransactionData: jest.fn(),
  encodeEnterExitQueueTransactionData: jest.fn(),
  encodeMulticallTransactionData: jest.fn(),
  estimateClaimExitedAssetsGas: jest.fn(),
  estimateDepositGas: jest.fn(),
  estimateEnterExitQueueGas: jest.fn(),
  estimateMulticallGas: jest.fn(),
};

const mockSDK: Stake = {
  sdkService: mockPooledStakingContractService,
  sdkType: StakingType.POOLED,
  setSdkType: jest.fn(),
};

jest.mock('../../Stake/constants', () => ({
  isPooledStakingFeatureEnabled: jest.fn().mockReturnValue(true),
}));

jest.mock('../../../../core/Engine', () => ({
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
  },
}));

describe('Stake Modals With Stake Sdk Provider', () => {
  const initialState = {
    engine: {
      backgroundState,
    },
  };
  it('renders stake screen with stake sdk provider and resolved stake context', () => {
    const useStakeContextSpy = jest
      .spyOn(useStakeContextHook, 'useStakeContext')
      .mockReturnValue(mockSDK);

    const { toJSON } = renderWithProvider(StakeScreenStack(), {
      state: initialState,
    });

    expect(toJSON()).toMatchSnapshot();
    expect(useStakeContextSpy).toHaveBeenCalled();
  });

  it('renders stake modal with stake sdk provider and resolved stake context', () => {
    const useStakeContextSpy = jest
      .spyOn(useStakeContextHook, 'useStakeContext')
      .mockReturnValue(mockSDK);

    const { toJSON } = renderWithProvider(StakeModalStack(), {
      state: initialState,
    });

    expect(toJSON()).toMatchSnapshot();
    expect(useStakeContextSpy).toHaveBeenCalledTimes(0);
  });
});

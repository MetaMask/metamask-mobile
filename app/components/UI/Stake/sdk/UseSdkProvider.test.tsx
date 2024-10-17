import {
  ChainId,
  PooledStakingContract,
  StakingType,
} from '@metamask/stake-sdk';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { createStackNavigator } from '@react-navigation/stack';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { Stake } from '../sdk/stakeSdkProvider';
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

describe('Stake Modals With Stake Sdk Provider', () => {
  const initialState = {
    engine: {
      backgroundState,
    },
  };
    
  it('should render correctly stake screen with stake sdk provider and resolve the stake context', () => {
    const useStakeContextSpy = jest
    .spyOn(useStakeContextHook, 'useStakeContext')
    .mockReturnValue(mockSDK);

    const { toJSON } = renderWithProvider(StakeScreenStack(), {
      state: initialState,
    });

    expect(toJSON()).toMatchSnapshot();
    expect(useStakeContextSpy).toHaveBeenCalled();
  });

  it('should render correctly stake modal with stake sdk provider and resolve the stake context', () => {
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

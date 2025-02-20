import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { StakeSDKProvider } from '../sdk/stakeSdkProvider';
// eslint-disable-next-line import/no-namespace
import * as useStakeContextHook from '../hooks/useStakeContext';
import { View } from 'react-native';
import Text from '../../../../component-library/components/Texts/Text';
import { MOCK_POOL_STAKING_SDK } from '../__mocks__/mockData';

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

const MockComponent = () => {
  const stakeContext = useStakeContextHook.useStakeContext();

  const stakeContractAddress = stakeContext.stakingContract?.contract.address;

  return (
    <View>
      <Text>{stakeContractAddress}</Text>
    </View>
  );
};

describe('Stake Modals With Stake Sdk Provider', () => {
  const initialState = {
    engine: {
      backgroundState,
    },
  };

  it('renders stake screen with stake sdk provider and resolved stake context', () => {
    const useStakeContextSpy = jest
      .spyOn(useStakeContextHook, 'useStakeContext')
      .mockReturnValue(MOCK_POOL_STAKING_SDK);

    const { toJSON } = renderWithProvider(
      <StakeSDKProvider>
        <MockComponent />
      </StakeSDKProvider>,
      {
        state: initialState,
      },
    );

    expect(toJSON()).toMatchSnapshot();
    expect(useStakeContextSpy).toHaveBeenCalled();
  });
});

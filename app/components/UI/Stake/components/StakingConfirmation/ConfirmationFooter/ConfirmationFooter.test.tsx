import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import ConfirmationFooter from './ConfirmationFooter';
import { ConfirmationFooterProps } from './ConfirmationFooter.types';
import { createMockAccountsControllerState } from '../../../../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { FooterButtonGroupActions } from './FooterButtonGroup/FooterButtonGroup.types';
import {
  PooledStakingContract,
  StakingType,
  ChainId,
} from '@metamask/stake-sdk';
import { Contract } from 'ethers';
import { Stake } from '../../../sdk/stakeSdkProvider';

const MOCK_ADDRESS_1 = '0x0';
const MOCK_ADDRESS_2 = '0x1';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS_1,
  MOCK_ADDRESS_2,
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

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

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
  stakingContract: mockPooledStakingContractService,
  sdkType: StakingType.POOLED,
  setSdkType: jest.fn(),
};

jest.mock('../../../hooks/useStakeContext', () => ({
  useStakeContext: () => mockSDK,
}));

describe('ConfirmationFooter', () => {
  it('render matches snapshot', () => {
    const props: ConfirmationFooterProps = {
      valueWei: '3210000000000000',
      action: FooterButtonGroupActions.STAKE,
    };

    const { toJSON } = renderWithProvider(<ConfirmationFooter {...props} />, {
      state: mockInitialState,
    });

    expect(toJSON()).toMatchSnapshot();
  });
});

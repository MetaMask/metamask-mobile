import { CHAIN_IDS } from '@metamask/transaction-controller';
import { useFocusEffect } from '@react-navigation/native';
import { fireEvent } from '@testing-library/react-native';
import React from 'react';
import Engine from '../../../../../../../core/Engine';
import { createMockAccountsControllerState } from '../../../../../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../../../../../util/test/initial-root-state';
import { mockNetworkState } from '../../../../../../../util/test/network';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { MOCK_POOL_STAKING_SDK } from '../../../../__mocks__/mockData';
import useStakingChain from '../../../../hooks/useStakingChain';
import ClaimBanner from './ClaimBanner';

const MOCK_CLAIM_AMOUNT = '16000000000000000';
const MOCK_ADDRESS_1 = '0x0123456789abcdef0123456789abcdef01234567';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS_1,
]);

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

jest.mock('../../../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      setActiveNetwork: jest.fn(),
    },
    MultichainNetworkController: {
      setActiveNetwork: jest.fn(),
    },
  },
}));

jest.mock('../../../../hooks/useStakeContext', () => ({
  __esModule: true,
  useStakeContext: jest.fn(() => MOCK_POOL_STAKING_SDK),
}));

jest.mock('../../../../hooks/useStakingChain', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    isStakingSupportedChain: true,
  })),
}));

const mockAttemptPoolStakedClaimTransaction = jest.fn();

jest.mock('../../../../hooks/usePoolStakedClaim', () => ({
  __esModule: true,
  default: () => ({
    attemptPoolStakedClaimTransaction: mockAttemptPoolStakedClaimTransaction,
  }),
}));

const mockNavigate = jest.fn();
const noop = () => undefined;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: jest.fn(),
    addListener: jest.fn().mockReturnValue(noop),
  }),
  useFocusEffect: jest.fn(),
}));

describe('ClaimBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    (useStakingChain as jest.Mock).mockReturnValue({
      isStakingSupportedChain: true,
    });
    (useFocusEffect as jest.Mock).mockImplementation(jest.fn());
  });

  it('render matches snapshot', () => {
    const { toJSON } = renderWithProvider(
      <ClaimBanner claimableAmount={MOCK_CLAIM_AMOUNT} />,
      { state: mockInitialState },
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('claim button switches to mainnet on press if on unsupported chain', async () => {
    (useStakingChain as jest.Mock).mockReturnValue({
      isStakingSupportedChain: false,
    });
    const { getByTestId } = renderWithProvider(
      <ClaimBanner claimableAmount={MOCK_CLAIM_AMOUNT} />,
      {
        state: {
          ...mockInitialState,
          engine: {
            ...mockInitialState.engine,
            backgroundState: {
              ...mockInitialState.engine.backgroundState,
              NetworkController: {
                ...mockNetworkState({
                  chainId: CHAIN_IDS.SEPOLIA,
                  id: 'sepolia',
                  nickname: 'Sepolia',
                  ticker: 'ETH',
                }),
              },
            },
          },
        },
      },
    );

    const claimButton = getByTestId('claim-banner-claim-eth-button');

    fireEvent.press(claimButton);

    expect(
      Engine.context.MultichainNetworkController.setActiveNetwork,
    ).toHaveBeenCalledWith('mainnet');
  });

  it('claim button is disabled on subsequent presses', async () => {
    const { getByTestId } = renderWithProvider(
      <ClaimBanner claimableAmount={MOCK_CLAIM_AMOUNT} />,
      { state: mockInitialState },
    );

    const claimButton = getByTestId('claim-banner-claim-eth-button');

    fireEvent.press(claimButton);

    expect(claimButton.props.disabled).toBe(true);
    expect(
      Engine.context.MultichainNetworkController.setActiveNetwork,
    ).not.toHaveBeenCalled();
    expect(mockAttemptPoolStakedClaimTransaction).toHaveBeenCalledTimes(1);
  });
});

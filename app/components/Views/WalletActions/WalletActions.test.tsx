import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import renderWithProvider, {
  DeepPartial,
} from '../../../util/test/renderWithProvider';

import WalletActions from './WalletActions';
import { WalletActionsBottomSheetSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletActionsBottomSheet.selectors';
import { backgroundState } from '../../../util/test/initial-root-state';
import { RootState } from '../../../reducers';
import { mockNetworkState } from '../../../util/test/network';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import {
  expectedUuid2,
  MOCK_ACCOUNTS_CONTROLLER_STATE,
} from '../../../util/test/accountsControllerTestUtils';
import useStakingChain from '../../UI/Stake/hooks/useStakingChain';
import Engine from '../../../core/Engine';
import { isStablecoinLendingFeatureEnabled } from '../../UI/Stake/constants';

jest.mock('../../../components/UI/Stake/constants', () => ({
  isStablecoinLendingFeatureEnabled: jest.fn(),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    NetworkController: {
      setActiveNetwork: jest.fn(),
    },
  },
}));
jest.mock('../../../components/UI/Stake/hooks/useStakingChain', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({
    isStakingSupportedChain: true,
  }),
}));

const mockInitialState: DeepPartial<RootState> = {
  swaps: { '0x1': { isLive: true }, hasOnboarded: false, isLive: true },
  fiatOrders: {
    networks: [
      {
        active: true,
        chainId: '1',
        chainName: 'Ethereum Mainnet',
        nativeTokenSupported: true,
      },
    ],
  },
  engine: {
    backgroundState: {
      ...backgroundState,
      NetworkController: {
        ...mockNetworkState({
          chainId: CHAIN_IDS.MAINNET,
          id: 'mainnet',
          nickname: 'Ethereum Mainnet',
          ticker: 'ETH',
        }),
      },
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { width: 0, height: 0, x: 0, y: 0 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
    useSafeAreaFrame: jest.fn().mockImplementation(() => frame),
  };
});

describe('WalletActions', () => {
  afterEach(() => {
    mockNavigate.mockClear();
  });
  it('should renderWithProvider correctly', () => {
    jest.mock('react-redux', () => ({
      ...jest.requireActual('react-redux'),
      useSelector: jest
        .fn()
        .mockImplementation((callback) => callback(mockInitialState)),
    }));
    const { getByTestId } = renderWithProvider(<WalletActions />, {
      state: mockInitialState,
    });

    expect(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON),
    ).toBeDefined();
    expect(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.SEND_BUTTON),
    ).toBeDefined();
    expect(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.RECEIVE_BUTTON),
    ).toBeDefined();
    expect(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.SWAP_BUTTON),
    ).toBeDefined();
    expect(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.BRIDGE_BUTTON),
    ).toBeDefined();
  });

  it('should render earn button if the stablecoin lending feature is enabled', () => {
    (isStablecoinLendingFeatureEnabled as jest.Mock).mockReturnValue(true);
    const { getByTestId } = renderWithProvider(<WalletActions />, {
      state: mockInitialState,
    });

    expect(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.EARN_BUTTON),
    ).toBeDefined();
  });

  it('should not show the buy button and swap button if the chain does not allow buying', () => {
    const mockState: DeepPartial<RootState> = {
      swaps: { '0x1': { isLive: false }, hasOnboarded: false, isLive: true },
      fiatOrders: {
        networks: [
          {
            active: true,
            chainId: '1',
            chainName: 'Ethereum Mainnet',
            nativeTokenSupported: true,
          },
        ],
      },
      engine: {
        backgroundState: {
          ...backgroundState,
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
    };

    jest.mock('react-redux', () => ({
      ...jest.requireActual('react-redux'),
      useSelector: jest
        .fn()
        .mockImplementation((callback) => callback(mockState)),
    }));

    const { queryByTestId } = renderWithProvider(<WalletActions />, {
      state: mockState,
    });

    expect(
      queryByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON),
    ).toBeNull();
    expect(
      queryByTestId(WalletActionsBottomSheetSelectorsIDs.SWAP_BUTTON),
    ).toBeNull();
    expect(
      queryByTestId(WalletActionsBottomSheetSelectorsIDs.BRIDGE_BUTTON),
    ).toBeNull();
  });

  it('should call the onBuy function when the Buy button is pressed', () => {
    const { getByTestId } = renderWithProvider(<WalletActions />, {
      state: mockInitialState,
    });

    fireEvent.press(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON),
    );
    expect(mockNavigate).toHaveBeenCalled();
  });

  it('should call the onSend function when the Send button is pressed', () => {
    const { getByTestId } = renderWithProvider(<WalletActions />, {
      state: mockInitialState,
    });

    fireEvent.press(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.SEND_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalled();
  });
  it('should call the goToSwaps function when the Swap button is pressed', () => {
    const { getByTestId } = renderWithProvider(<WalletActions />, {
      state: mockInitialState,
    });

    fireEvent.press(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.SWAP_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalled();
  });
  it('should call the goToBridge function when the Bridge button is pressed', () => {
    const { getByTestId } = renderWithProvider(<WalletActions />, {
      state: mockInitialState,
    });

    fireEvent.press(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.BRIDGE_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalled();
  });
  it('should call the onEarn function when the Earn button is pressed', () => {
    (isStablecoinLendingFeatureEnabled as jest.Mock).mockReturnValue(true);
    const { getByTestId } = renderWithProvider(<WalletActions />, {
      state: mockInitialState,
    });

    fireEvent.press(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.EARN_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalled();
    expect(
      Engine.context.NetworkController.setActiveNetwork,
    ).not.toHaveBeenCalled();
  });

  it('should switch to mainnet when onEarn called on unsupported staking network', () => {
    (isStablecoinLendingFeatureEnabled as jest.Mock).mockReturnValue(true);
    (useStakingChain as jest.Mock).mockReturnValue({
      isStakingSupportedChain: false,
    });
    const { getByTestId } = renderWithProvider(<WalletActions />, {
      state: mockInitialState,
    });

    fireEvent.press(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.EARN_BUTTON),
    );
    expect(
      Engine.context.NetworkController.setActiveNetwork,
    ).toHaveBeenCalledWith('mainnet');
  });
  it('disables action buttons when the account cannot sign transactions', () => {
    const mockStateWithoutSigning: DeepPartial<RootState> = {
      ...mockInitialState,
      engine: {
        ...mockInitialState.engine,
        backgroundState: {
          ...mockInitialState.engine?.backgroundState,
          AccountsController: {
            ...MOCK_ACCOUNTS_CONTROLLER_STATE,
            internalAccounts: {
              ...MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts,
              accounts: {
                ...MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts.accounts,
                [expectedUuid2]: {
                  ...MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts.accounts[
                    expectedUuid2
                  ],
                  methods: [],
                },
              },
            },
          },
        },
      },
    };

    const { getByTestId } = renderWithProvider(<WalletActions />, {
      state: mockStateWithoutSigning,
    });

    const buyButton = getByTestId(
      WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON,
    );
    const sellButton = getByTestId(
      WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON,
    );
    const sendButton = getByTestId(
      WalletActionsBottomSheetSelectorsIDs.SEND_BUTTON,
    );
    const swapButton = getByTestId(
      WalletActionsBottomSheetSelectorsIDs.SWAP_BUTTON,
    );
    const bridgeButton = getByTestId(
      WalletActionsBottomSheetSelectorsIDs.BRIDGE_BUTTON,
    );
    const earnButton = getByTestId(
      WalletActionsBottomSheetSelectorsIDs.EARN_BUTTON,
    );

    expect(buyButton.props.disabled).toBe(true);
    expect(sellButton.props.disabled).toBe(true);
    expect(sendButton.props.disabled).toBe(true);
    expect(swapButton.props.disabled).toBe(true);
    expect(bridgeButton.props.disabled).toBe(true);
    expect(earnButton.props.disabled).toBe(true);
  });
});

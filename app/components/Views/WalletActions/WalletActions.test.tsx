import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { selectChainId } from '../../../selectors/networkController';
import {
  selectSelectedInternalAccount,
  selectCanSignTransactions,
} from '../../../selectors/accountsController';
import { isSwapsAllowed } from '../../../components/UI/Swaps/utils';
import isBridgeAllowed from '../../UI/Bridge/utils/isBridgeAllowed';
import {
  SolScope,
  EthAccountType,
  SolAccountType,
} from '@metamask/keyring-api';

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
import Engine from '../../../core/Engine';
import { sendMultichainTransaction } from '../../../core/SnapKeyring/utils/sendMultichainTransaction';
import { trace, TraceName } from '../../../util/trace';
import { RampType } from '../../../reducers/fiatOrders/types';
import { selectStablecoinLendingEnabledFlag } from '../../UI/Earn/selectors/featureFlags';

jest.mock('../../UI/Earn/selectors/featureFlags', () => ({
  selectStablecoinLendingEnabledFlag: jest.fn(),
}));

jest.mock('../../../core/SnapKeyring/utils/sendMultichainTransaction', () => ({
  sendMultichainTransaction: jest.fn(),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    NetworkController: {
      setActiveNetwork: jest.fn(),
    },
    MultichainNetworkController: {
      setActiveNetwork: jest.fn(),
    },
  },
}));

jest.mock('@metamask/bridge-controller', () => {
  const actual = jest.requireActual('@metamask/bridge-controller');
  return {
    ...actual,
    getNativeAssetForChainId: jest.fn((chainId) => {
      if (chainId === 'solana:mainnet') {
        return actual.getNativeAssetForChainId(
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        );
      }
      return actual.getNativeAssetForChainId(chainId);
    }),
  };
});

jest.mock('../../../selectors/networkController', () => ({
  selectChainId: jest.fn().mockReturnValue('0x1'),
  selectEvmChainId: jest.fn().mockReturnValue('0x1'),
  chainIdSelector: jest.fn().mockReturnValue('0x1'),
  selectProviderConfig: jest.fn().mockReturnValue({
    chainId: '0x1',
    type: 'mainnet',
    rpcUrl: 'https://mainnet.infura.io/v3/123',
    ticker: 'ETH',
    nickname: 'Ethereum Mainnet',
  }),
  selectEvmTicker: jest.fn().mockReturnValue('ETH'),
  selectNativeCurrencyByChainId: jest.fn(),
}));

jest.mock('../../../selectors/accountsController', () => {
  const {
    EthAccountType: MockEthAccountType,
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  } = require('@metamask/keyring-api');
  return {
    selectSelectedInternalAccount: jest.fn().mockReturnValue({
      id: 'mock-account-id',
      type: MockEthAccountType.Eoa,
      metadata: {},
    }),
    selectSelectedInternalAccountAddress: jest.fn().mockReturnValue('0x123'),
    selectCanSignTransactions: jest.fn().mockReturnValue(true),
  };
});

jest.mock('../../../selectors/tokensController', () => ({
  selectAllTokens: jest.fn().mockReturnValue([]),
  selectTokens: jest.fn().mockReturnValue([]),
}));

jest.mock('../../../selectors/tokenBalancesController', () => ({
  selectTokenBalancesControllerState: jest.fn().mockReturnValue({}),
}));

jest.mock('../../../reducers/swaps', () => ({
  swapsLivenessSelector: jest.fn().mockReturnValue(true),
  swapsTokensWithBalanceSelector: jest.fn().mockReturnValue([]),
  swapsControllerAndUserTokens: jest.fn().mockReturnValue([]),
}));

jest.mock('../../../core/redux/slices/bridge', () => ({
  selectAllBridgeableNetworks: jest.fn().mockReturnValue([]),
}));

jest.mock('../../../selectors/tokenListController', () => ({
  selectTokenList: jest.fn().mockReturnValue([]),
}));

jest.mock('../../../components/UI/Swaps/utils', () => ({
  isSwapsAllowed: jest.fn().mockReturnValue(true),
}));

jest.mock('../../UI/Bridge/utils/isBridgeAllowed', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue(true),
}));

jest.mock('../../UI/Ramp/hooks/useRampNetwork', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue([true]),
}));

jest.mock('../../../core/AppConstants', () => ({
  SWAPS: {
    ACTIVE: true,
  },
  BUNDLE_IDS: {
    ANDROID: 'io.metamask',
    IOS: '1438144202',
  },
  MM_UNIVERSAL_LINK_HOST: 'metamask.app.link',
  WALLET_CONNECT: {
    PROJECT_ID: 'test-project-id',
  },
  BRIDGE: {
    URL: 'https://bridge.metamask.io',
  },
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

jest.mock('../../../util/trace', () => ({
  trace: jest.fn(),
  TraceName: {
    LoadRampExperience: 'LoadRampExperience',
  },
}));

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
    const { getByTestId, queryByTestId } = renderWithProvider(
      <WalletActions />,
      {
        state: mockInitialState,
      },
    );

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
    // Feature flag is disabled by default
    expect(
      queryByTestId(WalletActionsBottomSheetSelectorsIDs.EARN_BUTTON),
    ).toBeNull();
  });

  it('should render earn button if the stablecoin lending feature is enabled', () => {
    (
      selectStablecoinLendingEnabledFlag as jest.MockedFunction<
        typeof selectStablecoinLendingEnabledFlag
      >
    ).mockReturnValue(true);

    const { getByTestId } = renderWithProvider(<WalletActions />, {
      state: mockInitialState,
    });

    expect(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.EARN_BUTTON),
    ).toBeDefined();
  });

  it('should not show the buy button and swap button if the chain does not allow buying', () => {
    (isSwapsAllowed as jest.Mock).mockReturnValue(false);
    (isBridgeAllowed as jest.Mock).mockReturnValue(false);
    jest
      .requireMock('../../UI/Ramp/hooks/useRampNetwork')
      .default.mockReturnValue([false]);

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
    jest
      .requireMock('../../UI/Ramp/hooks/useRampNetwork')
      .default.mockReturnValue([true]);
    const { getByTestId } = renderWithProvider(<WalletActions />, {
      state: mockInitialState,
    });

    fireEvent.press(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON),
    );
    expect(mockNavigate).toHaveBeenCalled();
    expect(trace).toHaveBeenCalledWith({
      name: TraceName.LoadRampExperience,
      tags: {
        rampType: RampType.BUY,
      },
    });
  });

  it('should call the onSell function when the Sell button is pressed', () => {
    jest
      .requireMock('../../UI/Ramp/hooks/useRampNetwork')
      .default.mockReturnValue([true]);
    const { getByTestId } = renderWithProvider(<WalletActions />, {
      state: mockInitialState,
    });

    fireEvent.press(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON),
    );
    expect(mockNavigate).toHaveBeenCalled();
    expect(trace).toHaveBeenCalledWith({
      name: TraceName.LoadRampExperience,
      tags: {
        rampType: RampType.SELL,
      },
    });
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
    (isSwapsAllowed as jest.Mock).mockReturnValue(true);
    (selectChainId as unknown as jest.Mock).mockReturnValue('0x1');
    (isBridgeAllowed as jest.Mock).mockReturnValue(true);

    const { getByTestId } = renderWithProvider(<WalletActions />, {
      state: mockInitialState,
    });

    fireEvent.press(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.SWAP_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalled();
  });

  it('should call the goToBridge function when the Swap button is pressed on Solana mainnet', () => {
    (isSwapsAllowed as jest.Mock).mockReturnValue(true);
    (selectChainId as unknown as jest.Mock).mockReturnValue(SolScope.Mainnet);

    const { getByTestId } = renderWithProvider(<WalletActions />, {
      state: mockInitialState,
    });

    fireEvent.press(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.SWAP_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalledWith('BrowserTabHome', {
      params: {
        newTabUrl:
          'https://bridge.metamask.io/?metamaskEntry=mobile&srcChain=1',
        timestamp: 123,
      },
      screen: 'BrowserView',
    });
  });

  it('should call the goToBridge function when the Bridge button is pressed', () => {
    (isBridgeAllowed as jest.Mock).mockReturnValue(true);
    const { getByTestId } = renderWithProvider(<WalletActions />, {
      state: mockInitialState,
    });

    fireEvent.press(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.BRIDGE_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalled();
  });

  it('should call the onEarn function when the Earn button is pressed', () => {
    (
      selectStablecoinLendingEnabledFlag as jest.MockedFunction<
        typeof selectStablecoinLendingEnabledFlag
      >
    ).mockReturnValue(true);

    const { getByTestId } = renderWithProvider(<WalletActions />, {
      state: mockInitialState,
    });

    fireEvent.press(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.EARN_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalled();
    expect(
      Engine.context.MultichainNetworkController.setActiveNetwork,
    ).not.toHaveBeenCalled();
  });

  it('disables action buttons when the account cannot sign transactions', () => {
    (selectCanSignTransactions as unknown as jest.Mock).mockReturnValue(false);
    (isSwapsAllowed as jest.Mock).mockReturnValue(true);
    (isBridgeAllowed as jest.Mock).mockReturnValue(true);
    jest
      .requireMock('../../UI/Ramp/hooks/useRampNetwork')
      .default.mockReturnValue([true]);

    const mockStateWithoutSigningAndStablecoinLendingEnabled: DeepPartial<RootState> =
      {
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
      state: mockStateWithoutSigningAndStablecoinLendingEnabled,
    });

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

    expect(sellButton.props.disabled).toBe(true);
    expect(sendButton.props.disabled).toBe(true);
    expect(swapButton.props.disabled).toBe(true);
    expect(bridgeButton.props.disabled).toBe(true);
    expect(earnButton.props.disabled).toBe(true);
  });

  describe('onSend', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('calls sendMultichainTransaction for a Solana snap account', async () => {
      (selectChainId as unknown as jest.Mock).mockReturnValue('solana:mainnet');
      (selectSelectedInternalAccount as unknown as jest.Mock).mockReturnValue({
        id: expectedUuid2,
        type: SolAccountType.DataAccount,
        metadata: {
          snap: {
            id: 'npm:@metamask/solana-wallet-snap',
            name: 'Solana Wallet Snap',
            enabled: true,
          },
        },
      });

      const { getByTestId } = renderWithProvider(<WalletActions />, {
        state: mockInitialState,
      });

      fireEvent.press(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.SEND_BUTTON),
      );

      expect(sendMultichainTransaction).toHaveBeenCalledWith(
        'npm:@metamask/solana-wallet-snap',
        {
          account: expectedUuid2,
          scope: 'solana:mainnet',
        },
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('calls native send flow for an EVM account', async () => {
      (selectSelectedInternalAccount as unknown as jest.Mock).mockReturnValue({
        id: expectedUuid2,
        type: EthAccountType.Eoa,
        metadata: {},
      });

      const { getByTestId } = renderWithProvider(<WalletActions />, {
        state: mockInitialState,
      });

      fireEvent.press(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.SEND_BUTTON),
      );

      expect(sendMultichainTransaction).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('SendFlowView');
    });

    it('handles errors in sendMultichainTransaction gracefully', async () => {
      (selectChainId as unknown as jest.Mock).mockReturnValue('solana:mainnet');
      (selectSelectedInternalAccount as unknown as jest.Mock).mockReturnValue({
        id: expectedUuid2,
        type: SolAccountType.DataAccount,
        metadata: {
          snap: {
            id: 'npm:@metamask/solana-wallet-snap',
            name: 'Solana Wallet Snap',
            enabled: true,
          },
        },
      });

      (sendMultichainTransaction as jest.Mock).mockRejectedValue(
        new Error('Test error'),
      );

      const { getByTestId } = renderWithProvider(<WalletActions />, {
        state: mockInitialState,
      });

      fireEvent.press(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.SEND_BUTTON),
      );

      expect(sendMultichainTransaction).toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});

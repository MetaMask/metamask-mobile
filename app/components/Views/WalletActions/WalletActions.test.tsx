import React from 'react';
import { SolScope } from '@metamask/keyring-api';
import { fireEvent } from '@testing-library/react-native';
import '../../UI/Bridge/_mocks_/initialState';
import { isSwapsAllowed } from '../../../components/UI/Swaps/utils';
import { selectCanSignTransactions } from '../../../selectors/accountsController';
import { selectChainId } from '../../../selectors/networkController';
import renderWithProvider, {
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { WalletActionsBottomSheetSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletActionsBottomSheet.selectors';
import { RootState } from '../../../reducers';
import { RampType } from '../../../reducers/fiatOrders/types';
import { earnSelectors } from '../../../selectors/earnController/earn';
import {
  expectedUuid2,
  MOCK_ACCOUNTS_CONTROLLER_STATE,
} from '../../../util/test/accountsControllerTestUtils';
import Engine from '../../../core/Engine';
import { backgroundState } from '../../../util/test/initial-root-state';
import { mockNetworkState } from '../../../util/test/network';
import { trace, TraceName } from '../../../util/trace';
import { isBridgeAllowed } from '../../UI/Bridge/utils';
import { ethers } from 'ethers';
import { useSendNonEvmAsset } from '../../hooks/useSendNonEvmAsset';
import {
  selectPooledStakingEnabledFlag,
  selectStablecoinLendingEnabledFlag,
} from '../../UI/Earn/selectors/featureFlags';
import { EarnTokenDetails } from '../../UI/Earn/types/lending.types';
import WalletActions from './WalletActions';
import Routes from '../../../constants/navigation/Routes';
import { selectPerpsEnabledFlag } from '../../UI/Perps';

jest.mock('../../UI/Perps', () => ({
  selectPerpsEnabledFlag: jest.fn(),
}));

jest.mock('../../UI/Earn/selectors/featureFlags', () => ({
  selectStablecoinLendingEnabledFlag: jest.fn(),
  selectPooledStakingEnabledFlag: jest.fn(),
}));

jest.mock('../../../selectors/earnController/earn', () => ({
  earnSelectors: {
    selectEarnTokens: jest.fn().mockReturnValue({
      earnTokens: [],
    }),
  },
}));

jest.mock('../../../core/SnapKeyring/utils/sendMultichainTransaction', () => ({
  sendMultichainTransaction: jest.fn(),
}));

const mockSendNonEvmAsset = jest.fn();
jest.mock('../../hooks/useSendNonEvmAsset', () => ({
  useSendNonEvmAsset: jest.fn(),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    NetworkController: {
      setActiveNetwork: jest.fn(),
      getNetworkConfigurationByChainId: jest.fn().mockReturnValue({
        rpcEndpoints: [
          {
            networkClientId: 'mockNetworkClientId',
          },
        ],
        defaultRpcEndpointIndex: 0,
      }),
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
  ...jest.requireActual('../../../selectors/networkController'),
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
  selectSelectedNetworkClientId: jest.fn().mockReturnValue('mainnet'),
  selectNetworkClientId: jest.fn().mockReturnValue('mainnet'),
  selectEvmNetworkConfigurationsByChainId: jest.fn().mockReturnValue({}),
  selectRpcUrl: jest.fn().mockReturnValue('https://mainnet.infura.io/v3/123'),
}));

jest.mock('../../../core/Multichain/utils', () => ({
  isNonEvmChainId: jest.fn().mockReturnValue(false),
}));

jest.mock('../../../selectors/accountsController', () => {
  const {
    EthAccountType: MockEthAccountType,
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  } = require('@metamask/keyring-api');
  return {
    ...jest.requireActual('../../../selectors/accountsController'),
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
  ...jest.requireActual('../../../selectors/tokenBalancesController'),
  selectTokenBalancesControllerState: jest.fn().mockReturnValue({}),
}));

jest.mock('../../../reducers/swaps', () => ({
  ...jest.requireActual('../../../reducers/swaps'),
  swapsLivenessSelector: jest.fn().mockReturnValue(true),
  swapsTokensWithBalanceSelector: jest.fn().mockReturnValue([]),
  swapsControllerAndUserTokens: jest.fn().mockReturnValue([]),
}));

jest.mock('../../../core/redux/slices/bridge', () => ({
  ...jest.requireActual('../../../core/redux/slices/bridge'),
  selectAllBridgeableNetworks: jest.fn().mockReturnValue([]),
  selectIsBridgeEnabledSource: jest.fn().mockReturnValue(true),
}));

jest.mock('../../../selectors/tokenListController', () => ({
  selectTokenList: jest.fn().mockReturnValue([]),
}));

jest.mock('../../../components/UI/Swaps/utils', () => ({
  isSwapsAllowed: jest.fn().mockReturnValue(true),
}));

jest.mock('../../UI/Bridge/utils', () => ({
  isBridgeAllowed: jest.fn().mockReturnValue(true),
}));

jest.mock('../../UI/Ramp/Aggregator/hooks/useRampNetwork', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue([true]),
}));

jest.mock('../../UI/Ramp/Deposit/hooks/useDepositEnabled', () =>
  jest.fn().mockReturnValue({ isDepositEnabled: true }),
);

jest.mock('../../../core/AppConstants', () => {
  const actual = jest.requireActual('../../../core/AppConstants');

  return {
    ...actual,
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
      ACTIVE: true,
      URL: 'https://bridge.metamask.io',
    },
  };
});

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
      RemoteFeatureFlagController: {
        ...backgroundState.RemoteFeatureFlagController,
        remoteFeatureFlags: {
          ...backgroundState.RemoteFeatureFlagController.remoteFeatureFlags,
          bridgeConfig: {
            refreshRate: 3,
            maxRefreshCount: 1,
            support: true,
            chains: {
              '1': {
                isActiveSrc: true,
                isActiveDest: true,
              },
              '10': {
                isActiveSrc: true,
                isActiveDest: true,
              },
              '59144': {
                isActiveSrc: true,
                isActiveDest: true,
              },
              '120': {
                isActiveSrc: true,
                isActiveDest: true,
              },
              '137': {
                isActiveSrc: true,
                isActiveDest: true,
              },
              '11111': {
                isActiveSrc: true,
                isActiveDest: true,
              },
              '1151111081099710': {
                isActiveSrc: true,
                isActiveDest: true,
              },
            },
          },
        },
      },
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
    LoadDepositExperience: 'LoadDepositExperience',
  },
}));

describe('WalletActions', () => {
  beforeEach(() => {
    // Set up default mock for useSendNonEvmAsset hook
    mockSendNonEvmAsset.mockResolvedValue(false); // Default to EVM flow
    (useSendNonEvmAsset as jest.Mock).mockReturnValue({
      sendNonEvmAsset: mockSendNonEvmAsset,
      isNonEvmAccount: false,
    });
  });

  afterEach(() => {
    mockNavigate.mockClear();
    jest.clearAllMocks();
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
    // Feature flag is disabled by default
    expect(
      queryByTestId(WalletActionsBottomSheetSelectorsIDs.PERPS_BUTTON),
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
      .requireMock('../../UI/Ramp/Aggregator/hooks/useRampNetwork')
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
      .requireMock('../../UI/Ramp/Aggregator/hooks/useRampNetwork')
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
      .requireMock('../../UI/Ramp/Aggregator/hooks/useRampNetwork')
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

  it('should call the onDeposit function when the Deposit button is pressed', () => {
    const { getByTestId } = renderWithProvider(<WalletActions />, {
      state: mockInitialState,
    });

    fireEvent.press(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.DEPOSIT_BUTTON),
    );
    expect(mockNavigate).toHaveBeenCalledWith(Routes.DEPOSIT.ID);
    expect(trace).toHaveBeenCalledWith({
      name: TraceName.LoadDepositExperience,
    });
  });

  it('should call the onSend function when the Send button is pressed', async () => {
    const { getByTestId } = renderWithProvider(<WalletActions />, {
      state: mockInitialState,
    });

    fireEvent.press(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.SEND_BUTTON),
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockNavigate).toHaveBeenCalled();
  });

  it('should call the goToSwaps function when the Swap button is pressed', () => {
    (isSwapsAllowed as jest.Mock).mockReturnValue(true);
    (selectChainId as unknown as jest.Mock).mockReturnValue('0x1');

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

    expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
      params: {
        sourcePage: 'MainView',
        sourceToken: {
          address: ethers.constants.AddressZero,
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          decimals: 9,
          image: '',
          name: 'Solana',
          symbol: 'SOL',
        },
        bridgeViewMode: 'Swap',
      },
      screen: 'BridgeView',
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

  it('should hide the earn button if there are no elements to show and pooled staking is disabled', () => {
    (
      selectStablecoinLendingEnabledFlag as jest.MockedFunction<
        typeof selectStablecoinLendingEnabledFlag
      >
    ).mockReturnValue(true);
    (
      selectPooledStakingEnabledFlag as jest.MockedFunction<
        typeof selectPooledStakingEnabledFlag
      >
    ).mockReturnValue(false);

    (
      earnSelectors.selectEarnTokens as jest.MockedFunction<
        typeof earnSelectors.selectEarnTokens
      >
    ).mockReturnValue({
      earnTokens: [
        {
          address: '0x0',
          chainId: '0x1',
          decimals: 18,
          image: '',
          name: 'ETH',
          isETH: true,
          isStaked: false,
        },
      ] as unknown as EarnTokenDetails[],
      earnOutputTokens: [],
      earnTokensByChainIdAndAddress: {},
      earnOutputTokensByChainIdAndAddress: {},
      earnTokenPairsByChainIdAndAddress: {},
      earnOutputTokenPairsByChainIdAndAddress: {},
      earnableTotalFiatNumber: 0,
      earnableTotalFiatFormatted: '$0',
    });

    const { queryByTestId } = renderWithProvider(<WalletActions />, {
      state: mockInitialState,
    });

    expect(
      queryByTestId(WalletActionsBottomSheetSelectorsIDs.EARN_BUTTON),
    ).toBeNull();
  });

  it('should render the Perpetuals button if the Perps feature flag is enabled', () => {
    (
      selectPerpsEnabledFlag as jest.MockedFunction<
        typeof selectPerpsEnabledFlag
      >
    ).mockReturnValue(true);

    const { getByTestId } = renderWithProvider(<WalletActions />, {
      state: mockInitialState,
    });

    expect(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.PERPS_BUTTON),
    ).toBeDefined();
  });

  it('should call the onPerps function when the Perpetuals button is pressed', () => {
    (
      selectPerpsEnabledFlag as jest.MockedFunction<
        typeof selectPerpsEnabledFlag
      >
    ).mockReturnValue(true);

    const { getByTestId } = renderWithProvider(<WalletActions />, {
      state: mockInitialState,
    });

    fireEvent.press(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.PERPS_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalledWith('Perps', {
      screen: 'PerpsMarketListView',
    });
  });

  it('disables action buttons when the account cannot sign transactions', () => {
    (
      selectStablecoinLendingEnabledFlag as jest.MockedFunction<
        typeof selectStablecoinLendingEnabledFlag
      >
    ).mockReturnValue(true);
    (
      selectPooledStakingEnabledFlag as jest.MockedFunction<
        typeof selectPooledStakingEnabledFlag
      >
    ).mockReturnValue(true);
    (selectCanSignTransactions as unknown as jest.Mock).mockReturnValue(false);
    (isSwapsAllowed as jest.Mock).mockReturnValue(true);
    (isBridgeAllowed as jest.Mock).mockReturnValue(true);
    jest
      .requireMock('../../UI/Ramp/Aggregator/hooks/useRampNetwork')
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
      // Reset to default mock setup (already configured in parent beforeEach)
      mockSendNonEvmAsset.mockResolvedValue(false);
      (useSendNonEvmAsset as jest.Mock).mockReturnValue({
        sendNonEvmAsset: mockSendNonEvmAsset,
        isNonEvmAccount: false,
      });
    });

    it('uses hook for non-EVM snap account and handles successful transaction', async () => {
      mockSendNonEvmAsset.mockResolvedValue(true); // Hook handled the transaction

      const { getByTestId } = renderWithProvider(<WalletActions />, {
        state: mockInitialState,
      });

      fireEvent.press(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.SEND_BUTTON),
      );

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockSendNonEvmAsset).toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalledWith('SendFlowView');
    });

    it('calls native send flow for EVM account', async () => {
      mockSendNonEvmAsset.mockResolvedValue(false); // Hook did not handle, continue with EVM

      const { getByTestId } = renderWithProvider(<WalletActions />, {
        state: mockInitialState,
      });

      fireEvent.press(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.SEND_BUTTON),
      );

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockSendNonEvmAsset).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('SendFlowView');
    });

    it('handles hook errors gracefully', async () => {
      // The hook handles errors internally and returns true (handled) even with errors
      mockSendNonEvmAsset.mockResolvedValue(true);

      const { getByTestId } = renderWithProvider(<WalletActions />, {
        state: mockInitialState,
      });

      fireEvent.press(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.SEND_BUTTON),
      );

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockSendNonEvmAsset).toHaveBeenCalled();
      // Should not navigate since hook handled it (even with internal error)
      expect(mockNavigate).not.toHaveBeenCalledWith('SendFlowView');
    });

    it('calls hook with correct asset parameters', async () => {
      const mockSelectedAsset = {
        address: '0x123',
        chainId: '0x1',
        symbol: 'TEST',
      };

      const stateWithSelectedAsset = {
        ...mockInitialState,
        transaction: {
          selectedAsset: mockSelectedAsset,
        },
      };

      const { getByTestId } = renderWithProvider(<WalletActions />, {
        state: stateWithSelectedAsset,
      });

      fireEvent.press(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.SEND_BUTTON),
      );

      expect(useSendNonEvmAsset).toHaveBeenCalledWith({
        asset: mockSelectedAsset,
        closeModal: expect.any(Function),
      });
    });
  });
});

import { fireEvent } from '@testing-library/react-native';
import { isSwapsAllowed } from '../../../components/UI/Swaps/utils';
import { selectCanSignTransactions } from '../../../selectors/accountsController';
import { selectChainId } from '../../../selectors/networkController';
import {
  DeepPartial,
  renderScreen,
} from '../../../util/test/renderWithProvider';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { WalletActionsBottomSheetSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletActionsBottomSheet.selectors';
import { RootState } from '../../../reducers';
import { earnSelectors } from '../../../selectors/earnController/earn';
import {
  expectedUuid2,
  MOCK_ACCOUNTS_CONTROLLER_STATE,
} from '../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../util/test/initial-root-state';
import { mockNetworkState } from '../../../util/test/network';
import {
  selectPooledStakingEnabledFlag,
  selectStablecoinLendingEnabledFlag,
} from '../../UI/Earn/selectors/featureFlags';
import { EarnTokenDetails } from '../../UI/Earn/types/lending.types';
import { selectPerpsEnabledFlag } from '../../UI/Perps';
import { selectIsFirstTimePerpsUser } from '../../UI/Perps/selectors/perpsController';
import { selectPredictEnabledFlag } from '../../UI/Predict';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';
import TradeWalletActions from './TradeWalletActions';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

jest.mock('../../UI/Perps', () => ({
  selectPerpsEnabledFlag: jest.fn(),
}));

jest.mock('../../UI/Perps/selectors/perpsController', () => ({
  selectIsFirstTimePerpsUser: jest.fn(),
}));

jest.mock('../../UI/Predict', () => ({
  selectPredictEnabledFlag: jest.fn(),
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

jest.mock('../../../selectors/multichainNetworkController', () => ({
  ...jest.requireActual('../../../selectors/multichainNetworkController'),
  selectIsEvmNetworkSelected: jest.fn().mockReturnValue(true),
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
  swapsTokensWithBalanceSelector: jest.fn().mockReturnValue([]),
  swapsControllerAndUserTokens: jest.fn().mockReturnValue([]),
}));

jest.mock('../../../core/redux/slices/bridge', () => ({
  ...jest.requireActual('../../../core/redux/slices/bridge'),
  selectAllBridgeableNetworks: jest.fn().mockReturnValue([]),
  selectIsBridgeEnabledSource: jest.fn().mockReturnValue(true),
  selectIsUnifiedSwapsEnabled: jest.fn().mockReturnValue(false),
  selectIsSwapsLive: jest.fn().mockReturnValue(true),
}));

jest.mock('../../../selectors/tokenListController', () => ({
  selectTokenList: jest.fn().mockReturnValue([]),
}));

jest.mock('../../../components/UI/Swaps/utils', () => ({
  isSwapsAllowed: jest.fn().mockReturnValue(true),
}));

const mockGoToSwaps = jest.fn();
jest.mock('../../UI/Bridge/hooks/useSwapBridgeNavigation', () => ({
  useSwapBridgeNavigation: () => ({
    goToSwaps: mockGoToSwaps,
  }),
  SwapBridgeNavigationLocation: {
    TabBar: 'TabBar',
    TokenDetails: 'TokenDetails',
    Swaps: 'Swaps',
  },
}));

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

const mockOnDismiss = jest.fn();
const mockUseParams = jest.fn();

jest.mock('../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../util/navigation/navUtils'),
  useParams: () => mockUseParams(),
}));

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

describe('TradeWalletActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({
      onDismiss: mockOnDismiss,
      buttonLayout: {
        height: 100,
        width: 100,
        x: 654,
        y: 321,
      },
    });
  });

  afterEach(() => {
    mockNavigate.mockClear();
    mockGoToSwaps.mockClear();
    jest.clearAllMocks();
  });

  it('should renderScreen correctly', () => {
    jest.mock('react-redux', () => ({
      ...jest.requireActual('react-redux'),
      useSelector: jest
        .fn()
        .mockImplementation((callback) => callback(mockInitialState)),
    }));
    const { getByTestId, queryByTestId } = renderScreen(
      TradeWalletActions,
      {
        name: 'TradeWalletActions',
      },
      {
        state: mockInitialState,
      },
    );

    expect(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.SWAP_BUTTON),
    ).toBeDefined();
    // Feature flag is disabled by default
    expect(
      queryByTestId(WalletActionsBottomSheetSelectorsIDs.EARN_BUTTON),
    ).toBeNull();
    // Feature flag is disabled by default
    expect(
      queryByTestId(WalletActionsBottomSheetSelectorsIDs.PERPS_BUTTON),
    ).toBeNull();
    // Feature flag is disabled by default
    expect(
      queryByTestId(WalletActionsBottomSheetSelectorsIDs.PREDICT_BUTTON),
    ).toBeNull();
  });

  it('should render earn button if the stablecoin lending feature is enabled', () => {
    (
      selectStablecoinLendingEnabledFlag as jest.MockedFunction<
        typeof selectStablecoinLendingEnabledFlag
      >
    ).mockReturnValue(true);

    const { getByTestId } = renderScreen(
      TradeWalletActions,
      {
        name: 'TradeWalletActions',
      },
      {
        state: mockInitialState,
      },
    );
    expect(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.EARN_BUTTON),
    ).toBeDefined();
  });

  it('should not show the swap button if the chain does not allow swaps', () => {
    (isSwapsAllowed as jest.Mock).mockReturnValue(false);

    const mockState: DeepPartial<RootState> = {
      swaps: { '0x1': { isLive: false }, hasOnboarded: false, isLive: true },
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

    const { queryByTestId } = renderScreen(
      TradeWalletActions,
      {
        name: 'TradeWalletActions',
      },
      {
        state: mockState,
      },
    );

    expect(
      queryByTestId(WalletActionsBottomSheetSelectorsIDs.SWAP_BUTTON),
    ).toBeNull();
  });

  it.skip('should call the goToSwaps function when the Swap button is pressed', async () => {
    (isSwapsAllowed as jest.Mock).mockReturnValue(true);
    (selectChainId as unknown as jest.Mock).mockReturnValue('0x1');

    const { getByTestId } = renderScreen(
      TradeWalletActions,
      {
        name: 'TradeWalletActions',
      },
      {
        state: mockInitialState,
      },
    );

    fireEvent.press(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.SWAP_BUTTON),
    );

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(mockOnDismiss).toHaveBeenCalled();
    expect(mockGoToSwaps).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalled();
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

    const { queryByTestId } = renderScreen(
      TradeWalletActions,
      {
        name: 'TradeWalletActions',
      },
      {
        state: mockInitialState,
      },
    );

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

    const { getByTestId } = renderScreen(
      TradeWalletActions,
      {
        name: 'TradeWalletActions',
      },
      {
        state: mockInitialState,
      },
    );

    expect(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.PERPS_BUTTON),
    ).toBeDefined();
  });

  it('should render the Predict button if the Predict feature flag is enabled', () => {
    (
      selectPredictEnabledFlag as jest.MockedFunction<
        typeof selectPredictEnabledFlag
      >
    ).mockReturnValue(true);

    const { getByTestId } = renderScreen(
      TradeWalletActions,
      {
        name: 'TradeWalletActions',
      },
      {
        state: mockInitialState,
      },
    );

    expect(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.PREDICT_BUTTON),
    ).toBeDefined();
  });

  it('should set up perps navigation to markets for returning users', () => {
    (
      selectPerpsEnabledFlag as jest.MockedFunction<
        typeof selectPerpsEnabledFlag
      >
    ).mockReturnValue(true);
    (
      selectIsFirstTimePerpsUser as jest.MockedFunction<
        typeof selectIsFirstTimePerpsUser
      >
    ).mockReturnValue(false);

    const { getByTestId } = renderScreen(
      TradeWalletActions,
      {
        name: 'TradeWalletActions',
      },
      {
        state: mockInitialState,
      },
    );

    const perpsButton = getByTestId(
      WalletActionsBottomSheetSelectorsIDs.PERPS_BUTTON,
    );

    // Verify button exists and is enabled for returning users
    expect(perpsButton).toBeDefined();
    expect(perpsButton.props.accessibilityState?.disabled).toBeFalsy();
  });

  it('should set up perps navigation to tutorial for first-time users', () => {
    (
      selectPerpsEnabledFlag as jest.MockedFunction<
        typeof selectPerpsEnabledFlag
      >
    ).mockReturnValue(true);
    (
      selectIsFirstTimePerpsUser as jest.MockedFunction<
        typeof selectIsFirstTimePerpsUser
      >
    ).mockReturnValue(true);

    const { getByTestId } = renderScreen(
      TradeWalletActions,
      {
        name: 'TradeWalletActions',
      },
      {
        state: mockInitialState,
      },
    );

    expect(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.PERPS_BUTTON),
    ).toBeDefined();
  });

  it.skip('should navigate to Predict markets when user presses Predict button', async () => {
    (
      selectPredictEnabledFlag as jest.MockedFunction<
        typeof selectPredictEnabledFlag
      >
    ).mockReturnValue(true);

    const { getByTestId } = renderScreen(
      TradeWalletActions,
      {
        name: 'TradeWalletActions',
      },
      {
        state: mockInitialState,
      },
    );

    fireEvent.press(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.PREDICT_BUTTON),
    );

    // Wait for the bottom sheet close callback to execute
    // closeBottomSheetAndNavigate wraps navigation in a callback
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockNavigate).toHaveBeenCalledWith('WalletView', {
      screen: 'WalletTabStackFlow',
      params: {
        screen: 'Predict',
        params: {
          screen: 'PredictMarketListView',
        },
      },
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
    (
      selectPerpsEnabledFlag as jest.MockedFunction<
        typeof selectPerpsEnabledFlag
      >
    ).mockReturnValue(true);
    (
      selectPredictEnabledFlag as jest.MockedFunction<
        typeof selectPredictEnabledFlag
      >
    ).mockReturnValue(true);
    (selectCanSignTransactions as unknown as jest.Mock).mockReturnValue(false);
    (isSwapsAllowed as jest.Mock).mockReturnValue(true);

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

    const { getByTestId } = renderScreen(
      TradeWalletActions,
      {
        name: 'TradeWalletActions',
      },
      {
        state: mockStateWithoutSigningAndStablecoinLendingEnabled,
      },
    );

    const swapButton = getByTestId(
      WalletActionsBottomSheetSelectorsIDs.SWAP_BUTTON,
    );
    const earnButton = getByTestId(
      WalletActionsBottomSheetSelectorsIDs.EARN_BUTTON,
    );
    const perpsButton = getByTestId(
      WalletActionsBottomSheetSelectorsIDs.PERPS_BUTTON,
    );
    const predictButton = getByTestId(
      WalletActionsBottomSheetSelectorsIDs.PREDICT_BUTTON,
    );

    // Test that disabled buttons don't execute their actions when pressed
    fireEvent.press(swapButton);
    fireEvent.press(earnButton);
    fireEvent.press(perpsButton);
    fireEvent.press(predictButton);

    // Since buttons are disabled, none of the mock functions should be called
    expect(mockOnDismiss).not.toHaveBeenCalled();
  });

  it('should not show Predict button on non-EVM networks', () => {
    (
      selectPredictEnabledFlag as jest.MockedFunction<
        typeof selectPredictEnabledFlag
      >
    ).mockReturnValue(true);
    (
      selectIsEvmNetworkSelected as jest.MockedFunction<
        typeof selectIsEvmNetworkSelected
      >
    ).mockReturnValue(false);

    const mockNonEvmState: DeepPartial<RootState> = {
      ...mockInitialState,
    };

    const { queryByTestId } = renderScreen(
      TradeWalletActions,
      {
        name: 'TradeWalletActions',
      },
      {
        state: mockNonEvmState,
      },
    );

    expect(
      queryByTestId(WalletActionsBottomSheetSelectorsIDs.PREDICT_BUTTON),
    ).toBeNull();
  });
});

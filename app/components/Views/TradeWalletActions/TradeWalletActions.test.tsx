import { act, fireEvent } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import Routes from '../../../constants/navigation/Routes';
import { BatchSellMetricsLocation } from '@metamask/bridge-controller';
import { PredictEventValues } from '../../UI/Predict/constants/eventNames';
import { selectCanSignTransactions } from '../../../selectors/accountsController';
import {
  DeepPartial,
  renderScreen,
} from '../../../util/test/renderWithProvider';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { PerpsMode } from '@metamask/perps-controller';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { WalletActionsBottomSheetSelectorsIDs } from '../WalletActions/WalletActionsBottomSheet.testIds';
import { RootState } from '../../../reducers';
import {
  expectedUuid2,
  MOCK_ACCOUNTS_CONTROLLER_STATE,
} from '../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../util/test/initial-root-state';
import { mockNetworkState } from '../../../util/test/network';
import { selectIsEarnSectionEligible } from '../../UI/Earn/selectors/eligibility';
import { selectPerpsEnabledFlag } from '../../UI/Perps';
import { selectPerpsProModeEnabledFlag } from '../../UI/Perps/selectors/featureFlags';
import {
  selectIsFirstTimePerpsUser,
  selectPerpsMode,
} from '../../UI/Perps/selectors/perpsController';
import { usePerpsMode } from '../../UI/Perps/hooks';
import { selectPredictEnabledFlag } from '../../UI/Predict';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';
import { isHardwareAccount } from '../../../util/address';
import { selectBatchSellEnabled } from '../../../selectors/featureFlagController/batchSell';
import useEarnHighestRate from '../../UI/Earn/hooks/useEarnHighestRate';
import TradeWalletActions from './TradeWalletActions';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

jest.mock('react-native-gesture-handler', () => {
  const RN = jest.requireActual('react-native');
  const React = jest.requireActual('react');
  return {
    ...jest.requireActual('react-native-gesture-handler'),
    GestureHandlerRootView: RN.View,
    GestureHandlerRootViewContext: React.createContext(true),
  };
});

jest.mock('react-native-reanimated', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const Reanimated = jest.requireActual('react-native-reanimated/mock');

  const AnimatedView = ({
    exiting,
    children,
    ...rest
  }: {
    exiting?: { __invokeExit?: () => void };
    children?: React.ReactNode;
  }) => {
    React.useLayoutEffect(
      () => () => {
        exiting?.__invokeExit?.();
      },
      [exiting],
    );

    return React.createElement(View, rest, children);
  };

  return {
    ...Reanimated,
    default: {
      ...Reanimated.default,
      View: AnimatedView,
    },
    FadeOutDown: {
      duration: () => ({
        withCallback: (callback: (finished: boolean) => void) => ({
          __invokeExit: () => {
            callback(true);
          },
        }),
      }),
    },
    FadeInDown: {
      duration: () => ({
        withInitialValues: () => ({}),
      }),
    },
    runOnJS: (fn: () => void) => fn,
  };
});

jest.mock('../../UI/Perps', () => ({
  selectPerpsEnabledFlag: jest.fn(),
}));

jest.mock('../../UI/Perps/selectors/perpsController', () => {
  const { PerpsMode: MockedPerpsMode } = jest.requireActual(
    '@metamask/perps-controller',
  );
  return {
    selectIsFirstTimePerpsUser: jest.fn(),
    selectPerpsMode: jest.fn(() => MockedPerpsMode.Lite),
    selectPerpsLastViewedMarketSymbol: jest.fn(() => 'BTC'),
  };
});

jest.mock('../../UI/Perps/selectors/featureFlags', () => ({
  selectPerpsProModeEnabledFlag: jest.fn(),
}));

jest.mock('../../UI/Perps/hooks', () => ({
  usePerpsMode: jest.fn(() => ({
    mode: 'lite',
  })),
}));

const mockHasCompletedPerpsModeSelection = jest.fn(() =>
  Promise.resolve(false),
);
jest.mock('../../UI/Perps/utils/perpsModeSelectionStorage', () => ({
  hasCompletedPerpsModeSelection: () => mockHasCompletedPerpsModeSelection(),
}));

jest.mock('../../UI/Predict', () => ({
  selectPredictEnabledFlag: jest.fn(),
}));

jest.mock('../../UI/Earn/selectors/eligibility', () => ({
  selectIsEarnSectionEligible: jest.fn(),
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
  selectEnabledSourceChains: jest.fn().mockReturnValue([]),
}));

jest.mock('../../UI/Earn/hooks/useEarnHighestRate', () => ({
  __esModule: true,
  default: jest.fn(),
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

jest.mock('../../../selectors/featureFlagController/batchSell', () => ({
  selectBatchSellEnabled: jest.fn().mockReturnValue(true),
}));

jest.mock('../../../util/address', () => ({
  ...jest.requireActual('../../../util/address'),
  isHardwareAccount: jest.fn(),
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
const mockParentGoBack = jest.fn();
let mockParentCanGoBack = true;

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      getParent: () => ({
        goBack: mockParentGoBack,
        canGoBack: () => mockParentCanGoBack,
      }),
    }),
  };
});

const mockSelectIsEarnSectionEligible = jest.mocked(
  selectIsEarnSectionEligible,
);
const mockUseEarnHighestRate = useEarnHighestRate as jest.MockedFunction<
  typeof useEarnHighestRate
>;

const pressActionButton = async (
  getByTestId: ReturnType<typeof renderScreen>['getByTestId'],
  testId: string,
) => {
  await act(async () => {
    fireEvent.press(getByTestId(testId));
    // Flush async post-dismiss callbacks (e.g. mode-selection storage check).
    await Promise.resolve();
  });
};

const mockOnDismiss = jest.fn();
const mockUseParams = jest.fn();

jest.mock('../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../util/navigation/navUtils'),
  useParams: () => mockUseParams(),
}));

describe('TradeWalletActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParentCanGoBack = true;
    mockHasCompletedPerpsModeSelection.mockResolvedValue(false);
    (
      selectPerpsProModeEnabledFlag as jest.MockedFunction<
        typeof selectPerpsProModeEnabledFlag
      >
    ).mockReturnValue(false);
    (
      selectPerpsMode as jest.MockedFunction<typeof selectPerpsMode>
    ).mockReturnValue(PerpsMode.Lite);
    jest
      .spyOn(global, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        callback(0);
        return 0;
      });
    jest.spyOn(BackHandler, 'addEventListener').mockReturnValue({
      remove: jest.fn(),
    });
    (selectCanSignTransactions as unknown as jest.Mock).mockReturnValue(true);
    jest.mocked(usePerpsMode).mockReturnValue({
      mode: PerpsMode.Lite,
      setMode: jest.fn(),
    });
    jest.mocked(isHardwareAccount).mockReturnValue(false);

    mockSelectIsEarnSectionEligible.mockReturnValue(false);
    mockUseEarnHighestRate.mockReturnValue({
      highestRate: {
        type: 'APY',
        percentage: 6.2,
        status: 'ready',
      },
    });

    mockUseParams.mockReturnValue({
      onDismiss: mockOnDismiss,
      buttonLayout: {
        height: 100,
        width: 100,
        x: 654,
        y: 321,
      },
    });

    jest.mocked(selectBatchSellEnabled).mockReturnValue(true);
  });

  afterEach(() => {
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockParentGoBack.mockClear();
    mockGoToSwaps.mockClear();
    jest.restoreAllMocks();
  });

  it('should renderScreen correctly', () => {
    const { getByTestId, getByText, queryByTestId } = renderScreen(
      TradeWalletActions,
      {
        name: 'TradeWalletActions',
      },
      {
        state: mockInitialState,
      },
    );

    expect(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.BATCH_SELL_BUTTON),
    ).toBeDefined();
    expect(getByText('New')).toBeOnTheScreen();
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

  it('renders Earn button when Earn section is eligible', () => {
    mockSelectIsEarnSectionEligible.mockReturnValue(true);
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

  it.each([
    [
      { type: 'APY' as const, percentage: 6.2, status: 'ready' as const },
      '6.2% APY',
    ],
    [
      { type: 'APR' as const, percentage: 4.2, status: 'ready' as const },
      '4.2% APR',
    ],
  ])('renders a ready APR or APY rate in the Earn tag', (highestRate, copy) => {
    mockSelectIsEarnSectionEligible.mockReturnValue(true);
    mockUseEarnHighestRate.mockReturnValue({ highestRate });

    const { getByTestId } = renderScreen(
      TradeWalletActions,
      { name: 'TradeWalletActions' },
      { state: mockInitialState },
    );

    expect(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.EARN_RATE_TAG),
    ).toHaveTextContent(copy);
  });

  it('omits the Earn rate tag when no ready rate is available', () => {
    mockSelectIsEarnSectionEligible.mockReturnValue(true);
    mockUseEarnHighestRate.mockReturnValue({ highestRate: undefined });

    const { queryByTestId } = renderScreen(
      TradeWalletActions,
      { name: 'TradeWalletActions' },
      { state: mockInitialState },
    );

    expect(
      queryByTestId(WalletActionsBottomSheetSelectorsIDs.EARN_RATE_TAG),
    ).toBeNull();
  });

  it('does not render Batch Sell for hardware wallets', () => {
    jest.mocked(isHardwareAccount).mockReturnValue(true);

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
      queryByTestId(WalletActionsBottomSheetSelectorsIDs.BATCH_SELL_BUTTON),
    ).toBeNull();
    expect(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.SWAP_BUTTON),
    ).toBeDefined();
  });

  it('does not render Batch Sell when feature flag is disabled', () => {
    jest.mocked(selectBatchSellEnabled).mockReturnValue(false);

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
      queryByTestId(WalletActionsBottomSheetSelectorsIDs.BATCH_SELL_BUTTON),
    ).toBeNull();
  });

  it('does not render Earn button when Earn section is ineligible', () => {
    mockSelectIsEarnSectionEligible.mockReturnValue(false);
    const { queryByTestId } = renderScreen(
      TradeWalletActions,
      { name: 'TradeWalletActions' },
      { state: mockInitialState },
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

  it('renders the Lite badge on the Perps row when Lite mode is active', () => {
    (
      selectPerpsEnabledFlag as jest.MockedFunction<
        typeof selectPerpsEnabledFlag
      >
    ).mockReturnValue(true);
    (
      selectPerpsProModeEnabledFlag as jest.MockedFunction<
        typeof selectPerpsProModeEnabledFlag
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
      getByTestId(WalletActionsBottomSheetSelectorsIDs.PERPS_MODE_BADGE),
    ).toHaveTextContent('Lite');
  });

  it('renders the Pro badge on the Perps row when Pro mode is active', () => {
    (
      selectPerpsEnabledFlag as jest.MockedFunction<
        typeof selectPerpsEnabledFlag
      >
    ).mockReturnValue(true);
    (
      selectPerpsProModeEnabledFlag as jest.MockedFunction<
        typeof selectPerpsProModeEnabledFlag
      >
    ).mockReturnValue(true);
    jest.mocked(usePerpsMode).mockReturnValue({
      mode: PerpsMode.Pro,
      setMode: jest.fn(),
    });

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
      getByTestId(WalletActionsBottomSheetSelectorsIDs.PERPS_MODE_BADGE),
    ).toHaveTextContent('Pro');
  });

  it('hides the mode badge when the Pro mode flag is disabled', () => {
    (
      selectPerpsEnabledFlag as jest.MockedFunction<
        typeof selectPerpsEnabledFlag
      >
    ).mockReturnValue(true);
    (
      selectPerpsProModeEnabledFlag as jest.MockedFunction<
        typeof selectPerpsProModeEnabledFlag
      >
    ).mockReturnValue(false);

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
      getByTestId(WalletActionsBottomSheetSelectorsIDs.PERPS_BUTTON),
    ).toBeDefined();
    expect(
      queryByTestId(WalletActionsBottomSheetSelectorsIDs.PERPS_MODE_BADGE),
    ).not.toBeOnTheScreen();
  });

  it('keeps the mode badge visible when the Perps action is disabled', () => {
    (
      selectPerpsEnabledFlag as jest.MockedFunction<
        typeof selectPerpsEnabledFlag
      >
    ).mockReturnValue(true);
    (
      selectPerpsProModeEnabledFlag as jest.MockedFunction<
        typeof selectPerpsProModeEnabledFlag
      >
    ).mockReturnValue(true);
    (selectCanSignTransactions as unknown as jest.Mock).mockReturnValue(false);

    const { getByTestId } = renderScreen(
      TradeWalletActions,
      { name: 'TradeWalletActions' },
      { state: mockInitialState },
    );

    expect(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.PERPS_MODE_BADGE),
    ).toHaveTextContent('Lite');
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
    expect(perpsButton).toBeEnabled();
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

  it('registers a hardware back handler that dismisses the sheet', () => {
    mockSelectIsEarnSectionEligible.mockReturnValue(true);
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
    const batchSellButton = getByTestId(
      WalletActionsBottomSheetSelectorsIDs.BATCH_SELL_BUTTON,
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
    fireEvent.press(batchSellButton);
    fireEvent.press(earnButton);
    fireEvent.press(perpsButton);
    fireEvent.press(predictButton);

    // Since buttons are disabled, none of the mock functions should be called
    expect(mockOnDismiss).not.toHaveBeenCalled();
  });

  it('should show Predict button on non-EVM networks', () => {
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

    const { getByTestId } = renderScreen(
      TradeWalletActions,
      {
        name: 'TradeWalletActions',
      },
      {
        state: mockNonEvmState,
      },
    );

    expect(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.PREDICT_BUTTON),
    ).toBeOnTheScreen();
  });

  describe('action navigation', () => {
    it('calls goToSwaps after dismissing RootModalFlow when Swap is pressed', async () => {
      const { getByTestId } = renderScreen(
        TradeWalletActions,
        { name: 'TradeWalletActions' },
        { state: mockInitialState },
      );

      await pressActionButton(
        getByTestId,
        WalletActionsBottomSheetSelectorsIDs.SWAP_BUTTON,
      );

      expect(mockOnDismiss).toHaveBeenCalled();
      expect(mockParentGoBack).toHaveBeenCalled();
      expect(mockGoToSwaps).toHaveBeenCalled();
    });

    it('navigates to batch sell token select after dismissing RootModalFlow', async () => {
      const { getByTestId } = renderScreen(
        TradeWalletActions,
        { name: 'TradeWalletActions' },
        { state: mockInitialState },
      );

      await pressActionButton(
        getByTestId,
        WalletActionsBottomSheetSelectorsIDs.BATCH_SELL_BUTTON,
      );

      expect(mockParentGoBack).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.ROOT, {
        screen: Routes.BRIDGE.BATCH_SELL_TOKEN_SELECT,
        params: {
          batchSellLocation: BatchSellMetricsLocation.TradeMenu,
        },
      });
    });

    it('navigates to Perps home after dismissing RootModalFlow for returning users', async () => {
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
        { name: 'TradeWalletActions' },
        { state: mockInitialState },
      );

      await pressActionButton(
        getByTestId,
        WalletActionsBottomSheetSelectorsIDs.PERPS_BUTTON,
      );

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.PERPS_HOME,
        params: {},
      });
    });

    it('navigates to the default Pro market instead of Perps home when Pro mode is already active', async () => {
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
      (
        selectPerpsProModeEnabledFlag as jest.MockedFunction<
          typeof selectPerpsProModeEnabledFlag
        >
      ).mockReturnValue(true);
      (
        selectPerpsMode as jest.MockedFunction<typeof selectPerpsMode>
      ).mockReturnValue(PerpsMode.Pro);
      mockHasCompletedPerpsModeSelection.mockResolvedValue(true);

      const { getByTestId } = renderScreen(
        TradeWalletActions,
        { name: 'TradeWalletActions' },
        { state: mockInitialState },
      );

      await pressActionButton(
        getByTestId,
        WalletActionsBottomSheetSelectorsIDs.PERPS_BUTTON,
      );

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: expect.objectContaining({
          market: expect.objectContaining({ symbol: 'BTC' }),
        }),
      });
    });

    it('navigates to Perps tutorial after dismissing RootModalFlow for first-time users', async () => {
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
      (
        selectPerpsProModeEnabledFlag as jest.MockedFunction<
          typeof selectPerpsProModeEnabledFlag
        >
      ).mockReturnValue(false);

      const { getByTestId } = renderScreen(
        TradeWalletActions,
        { name: 'TradeWalletActions' },
        { state: mockInitialState },
      );

      await pressActionButton(
        getByTestId,
        WalletActionsBottomSheetSelectorsIDs.PERPS_BUTTON,
      );

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.TUTORIAL);
    });

    it('opens the mode selection sheet when Pro mode is enabled and mode has not been chosen', async () => {
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
      (
        selectPerpsProModeEnabledFlag as jest.MockedFunction<
          typeof selectPerpsProModeEnabledFlag
        >
      ).mockReturnValue(true);
      mockHasCompletedPerpsModeSelection.mockResolvedValue(false);

      const { getByTestId } = renderScreen(
        TradeWalletActions,
        { name: 'TradeWalletActions' },
        { state: mockInitialState },
      );

      await pressActionButton(
        getByTestId,
        WalletActionsBottomSheetSelectorsIDs.PERPS_BUTTON,
      );

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.MODALS.ROOT, {
        screen: Routes.PERPS.MODALS.MODE_SELECTION,
        params: {
          entry: 'trade',
          source: 'trade_menu_action',
        },
      });
    });

    it('skips the mode selection sheet when the user has already chosen a mode', async () => {
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
      (
        selectPerpsProModeEnabledFlag as jest.MockedFunction<
          typeof selectPerpsProModeEnabledFlag
        >
      ).mockReturnValue(true);
      mockHasCompletedPerpsModeSelection.mockResolvedValue(true);

      const { getByTestId } = renderScreen(
        TradeWalletActions,
        { name: 'TradeWalletActions' },
        { state: mockInitialState },
      );

      await pressActionButton(
        getByTestId,
        WalletActionsBottomSheetSelectorsIDs.PERPS_BUTTON,
      );

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.PERPS_HOME,
        params: {},
      });
      expect(mockNavigate).not.toHaveBeenCalledWith(Routes.PERPS.MODALS.ROOT, {
        screen: Routes.PERPS.MODALS.MODE_SELECTION,
        params: {
          entry: 'trade',
          source: 'trade_menu_action',
        },
      });
    });

    it('navigates to Predict markets after dismissing RootModalFlow', async () => {
      (
        selectPredictEnabledFlag as jest.MockedFunction<
          typeof selectPredictEnabledFlag
        >
      ).mockReturnValue(true);

      const { getByTestId } = renderScreen(
        TradeWalletActions,
        { name: 'TradeWalletActions' },
        { state: mockInitialState },
      );

      await pressActionButton(
        getByTestId,
        WalletActionsBottomSheetSelectorsIDs.PREDICT_BUTTON,
      );

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_LIST,
        params: {
          entryPoint: PredictEventValues.ENTRY_POINT.MAIN_TRADE_BUTTON,
        },
      });
    });

    it('navigates to EarnSectionListView after dismissing RootModalFlow', async () => {
      mockSelectIsEarnSectionEligible.mockReturnValue(true);
      const { getByTestId } = renderScreen(
        TradeWalletActions,
        { name: 'TradeWalletActions' },
        { state: mockInitialState },
      );

      await pressActionButton(
        getByTestId,
        WalletActionsBottomSheetSelectorsIDs.EARN_BUTTON,
      );

      expect(mockNavigate).toHaveBeenCalledWith(Routes.EARN.ROOT, {
        screen: Routes.EARN.SEARCH_LIST,
      });
    });

    it('calls navigation goBack when parent navigator cannot go back', async () => {
      mockParentCanGoBack = false;

      const { getByTestId } = renderScreen(
        TradeWalletActions,
        { name: 'TradeWalletActions' },
        { state: mockInitialState },
      );

      await pressActionButton(
        getByTestId,
        WalletActionsBottomSheetSelectorsIDs.SWAP_BUTTON,
      );

      expect(mockGoBack).toHaveBeenCalled();
      expect(mockParentGoBack).not.toHaveBeenCalled();
      expect(mockGoToSwaps).toHaveBeenCalled();
    });
  });

  describe('dismiss interactions', () => {
    it('registers a hardware back handler that dismisses the sheet', () => {
      renderScreen(
        TradeWalletActions,
        { name: 'TradeWalletActions' },
        { state: mockInitialState },
      );

      const backHandlerCallback = jest.mocked(BackHandler.addEventListener).mock
        .calls[0][1];

      expect(BackHandler.addEventListener).toHaveBeenCalledWith(
        'hardwareBackPress',
        expect.any(Function),
      );
      expect(backHandlerCallback()).toBe(true);
      expect(mockOnDismiss).toHaveBeenCalled();
    });
  });
});

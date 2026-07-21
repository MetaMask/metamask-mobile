import { act, fireEvent } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import Routes from '../../../constants/navigation/Routes';
import { BatchSellMetricsLocation } from '@metamask/bridge-controller';
import { PredictEventValues } from '../../UI/Predict/constants/eventNames';
import { EARN_INPUT_VIEW_ACTIONS } from '../../UI/Earn/Views/EarnInputView/EarnInputView.types';
import { selectCanSignTransactions } from '../../../selectors/accountsController';
import {
  DeepPartial,
  renderScreen,
} from '../../../util/test/renderWithProvider';
import { CHAIN_IDS } from '@metamask/transaction-controller';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { WalletActionsBottomSheetSelectorsIDs } from '../WalletActions/WalletActionsBottomSheet.testIds';
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
import useStakingEligibility from '../../UI/Stake/hooks/useStakingEligibility';
import { selectPerpsEnabledFlag } from '../../UI/Perps';
import { selectPerpsProModeEnabledFlag } from '../../UI/Perps/selectors/featureFlags';
import { selectIsFirstTimePerpsUser } from '../../UI/Perps/selectors/perpsController';
import { selectPredictEnabledFlag } from '../../UI/Predict';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';
import { isHardwareAccount } from '../../../util/address';
import { selectBatchSellEnabled } from '../../../selectors/featureFlagController/batchSell';
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

jest.mock('../../UI/Perps/selectors/perpsController', () => ({
  selectIsFirstTimePerpsUser: jest.fn(),
}));

jest.mock('../../UI/Perps/selectors/featureFlags', () => ({
  selectPerpsProModeEnabledFlag: jest.fn(),
}));

const mockSetPerpsMode = jest.fn();
jest.mock('../../UI/Perps/hooks', () => ({
  usePerpsMode: jest.fn(() => ({
    mode: 'lite',
    setMode: mockSetPerpsMode,
  })),
}));

jest.mock('../../UI/Perps/components/PerpsModeToggle', () => {
  const ReactActual = jest.requireActual('react');
  const { TouchableOpacity } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ onChange }: { onChange?: (mode: string) => void }) =>
      ReactActual.createElement(TouchableOpacity, {
        testID: 'perps-mode-toggle',
        // Simulate the user switching to Pro from the stubbed toggle.
        onPress: () => onChange?.('pro'),
      }),
    PerpsMode: { Lite: 'lite', Pro: 'pro' },
  };
});

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
  selectEnabledSourceChains: jest.fn().mockReturnValue([]),
}));

jest.mock('../../UI/Stake/hooks/useStakingEligibility', () => ({
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

const mockUseStakingEligibility = useStakingEligibility as jest.MockedFunction<
  typeof useStakingEligibility
>;

const pressActionButton = async (
  getByTestId: ReturnType<typeof renderScreen>['getByTestId'],
  testId: string,
) => {
  await act(async () => {
    fireEvent.press(getByTestId(testId));
  });
};

const mockOnDismiss = jest.fn();
const mockUseParams = jest.fn();

jest.mock('../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../util/navigation/navUtils'),
  useParams: () => mockUseParams(),
}));

let mockIsPureBlack = false;

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  ...jest.requireActual('@metamask/design-system-twrnc-preset'),
  usePureBlack: () => mockIsPureBlack,
}));

describe('TradeWalletActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPureBlack = false;
    mockParentCanGoBack = true;
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
    jest.mocked(isHardwareAccount).mockReturnValue(false);

    mockUseStakingEligibility.mockReturnValue({
      isEligible: true,
      isLoadingEligibility: false,
      error: null,
      refreshPooledStakingEligibility: jest.fn(),
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

  it('renders a bottom cutout stroke when pure black is enabled', () => {
    mockIsPureBlack = true;

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
      getByTestId(WalletActionsBottomSheetSelectorsIDs.MENU_BOTTOM_STROKE),
    ).toBeTruthy();
  });

  it('does not render the bottom cutout stroke when pure black is disabled', () => {
    mockIsPureBlack = false;

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
      queryByTestId(WalletActionsBottomSheetSelectorsIDs.MENU_BOTTOM_STROKE),
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

  it('does not render earn button when user is not eligible', () => {
    (
      selectStablecoinLendingEnabledFlag as jest.MockedFunction<
        typeof selectStablecoinLendingEnabledFlag
      >
    ).mockReturnValue(true);

    mockUseStakingEligibility.mockReturnValue({
      isEligible: false,
      isLoadingEligibility: false,
      error: null,
      refreshPooledStakingEligibility: jest.fn(),
    });

    const { queryByTestId } = renderScreen(
      TradeWalletActions,
      { name: 'TradeWalletActions' },
      { state: mockInitialState },
    );

    expect(
      queryByTestId(WalletActionsBottomSheetSelectorsIDs.EARN_BUTTON),
    ).toBeNull();
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

  it('should render the Lite/Pro toggle on the Perps row when the Pro mode flag is enabled', () => {
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

    expect(getByTestId('perps-mode-toggle')).toBeOnTheScreen();
  });

  it('should not render the Lite/Pro toggle when the Pro mode flag is disabled', () => {
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
    expect(queryByTestId('perps-mode-toggle')).toBeNull();
  });

  it('shows the mode-transition screen after dismissing the sheet when the toggle switches mode', async () => {
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
      { name: 'TradeWalletActions' },
      { state: mockInitialState },
    );

    await pressActionButton(getByTestId, 'perps-mode-toggle');

    expect(mockSetPerpsMode).toHaveBeenCalledWith('pro');
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MODE_TRANSITION,
      params: { mode: 'pro' },
    });
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

    it('navigates to Earn token list after dismissing RootModalFlow', async () => {
      (
        selectStablecoinLendingEnabledFlag as jest.MockedFunction<
          typeof selectStablecoinLendingEnabledFlag
        >
      ).mockReturnValue(true);

      const { getByTestId } = renderScreen(
        TradeWalletActions,
        { name: 'TradeWalletActions' },
        { state: mockInitialState },
      );

      await pressActionButton(
        getByTestId,
        WalletActionsBottomSheetSelectorsIDs.EARN_BUTTON,
      );

      expect(mockNavigate).toHaveBeenCalledWith('StakeModals', {
        screen: Routes.STAKING.MODALS.EARN_TOKEN_LIST,
        params: {
          tokenFilter: {
            includeNativeTokens: true,
            includeStakingTokens: false,
            includeLendingTokens: true,
            includeReceiptTokens: false,
          },
          onItemPressScreen: EARN_INPUT_VIEW_ACTIONS.DEPOSIT,
        },
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

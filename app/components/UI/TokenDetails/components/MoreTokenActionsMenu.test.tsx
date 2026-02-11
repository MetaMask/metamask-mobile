import React from 'react';
import { userEvent } from '@testing-library/react-native';
import MoreTokenActionsMenu, {
  MoreTokenActionsMenuParams,
} from './MoreTokenActionsMenu';
import { TokenI } from '../../Tokens/types';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { WalletActionsBottomSheetSelectorsIDs } from '../../../Views/WalletActions/WalletActionsBottomSheet.testIds';
import { selectAsset } from '../../../../selectors/assets/assets-list';
import { MUSD_TOKEN_ADDRESS } from '../../Earn/constants/musd';
import Routes from '../../../../constants/navigation/Routes';
import Engine from '../../../../core/Engine';
import NotificationManager from '../../../../core/NotificationManager';

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { width: 390, height: 844, x: 0, y: 0 };

  return {
    ...jest.requireActual('react-native-safe-area-context'),
    SafeAreaProvider: jest.fn(({ children }) => children),
    SafeAreaConsumer: jest.fn(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn(() => inset),
    useSafeAreaFrame: jest.fn(() => frame),
  };
});

// Mock BottomSheet so that onCloseBottomSheet(callback) immediately invokes the callback.
// This allows testing the action handlers (Buy, Receive, View explorer, Remove token).
jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const RN = jest.requireActual<typeof import('react')>('react');
    return {
      __esModule: true,
      default: RN.forwardRef(
        (
          props: { children: React.ReactNode },
          ref: React.Ref<{
            onCloseBottomSheet: (cb?: () => void) => void;
            onOpenBottomSheet: (cb?: () => void) => void;
          }>,
        ) => {
          RN.useImperativeHandle(ref, () => ({
            onCloseBottomSheet: (callback?: () => void | Promise<void>) => {
              // eslint-disable-next-line no-void, no-empty-function
              void Promise.resolve(callback?.()).then(() => {});
            },
            onOpenBottomSheet: () => undefined,
          }));
          return RN.createElement(RN.Fragment, null, props.children);
        },
      ),
    };
  },
);

const mockNavigate = jest.fn();
const mockRouteParams: MoreTokenActionsMenuParams = {
  hasPerpsMarket: false,
  hasBalance: false,
  isBuyable: false,
  isNativeCurrency: false,
  asset: {
    address: '0x123',
    chainId: '0x1',
    symbol: 'TEST',
    name: 'Test Token',
    decimals: 18,
    balance: '100',
    balanceFiat: '$100',
    logo: '',
    image: '',
    isETH: false,
    hasBalanceError: false,
    aggregators: [],
  } as TokenI,
  onBuy: jest.fn(),
  onReceive: jest.fn(),
};

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      addListener: jest.fn(() => jest.fn()),
    }),
    useRoute: () => ({
      params: mockRouteParams,
    }),
  };
});

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn(() => ({ build: jest.fn() })),
}));
jest.mock('../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('../../Ramp/hooks/useRampNavigation', () => ({
  useRampNavigation: () => ({
    goToBuy: jest.fn(),
    goToAggregator: jest.fn(),
  }),
}));

jest.mock('../../Ramp/hooks/useRampsUnifiedV1Enabled', () => ({
  __esModule: true,
  default: () => false,
}));

jest.mock('../../Ramp/hooks/useRampsButtonClickData', () => ({
  useRampsButtonClickData: () => ({
    ramp_routing: 'test',
    is_authenticated: true,
    preferred_provider: 'test',
    order_count: 0,
  }),
}));

const mockGetBlockExplorerName = jest.fn(() => 'Etherscan');
const mockGetBlockExplorerUrl = jest.fn(
  () => 'https://etherscan.io/token/0x123',
);
const mockGetBlockExplorerBaseUrl = jest.fn(() => 'https://etherscan.io');

jest.mock('../../../hooks/useBlockExplorer', () => ({
  __esModule: true,
  default: () => ({
    getBlockExplorerName: mockGetBlockExplorerName,
    getBlockExplorerUrl: mockGetBlockExplorerUrl,
    getBlockExplorerBaseUrl: mockGetBlockExplorerBaseUrl,
  }),
}));

const mockInAppBrowserIsAvailable = jest.fn(() => Promise.resolve(false));
const mockInAppBrowserOpen = jest.fn();
jest.mock('react-native-inappbrowser-reborn', () => ({
  __esModule: true,
  default: {
    get isAvailable() {
      return mockInAppBrowserIsAvailable;
    },
    get open() {
      return mockInAppBrowserOpen;
    },
  },
}));

jest.mock('../../../../selectors/assets/assets-list', () => {
  const actual = jest.requireActual('../../../../selectors/assets/assets-list');
  return {
    ...actual,
    selectAsset: jest.fn((...args: unknown[]) =>
      (actual.selectAsset as (...a: unknown[]) => unknown)(...args),
    ),
  };
});

jest.mock('../../../../core/Engine', () => ({
  resetState: jest.fn(),
  context: {
    TokensController: {
      ignoreTokens: jest.fn(),
    },
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(),
    },
  },
}));

jest.mock('../../../../core/NotificationManager', () => ({
  showSimpleNotification: jest.fn(),
}));

const mockLoggerLog = jest.fn();
jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    get log() {
      return mockLoggerLog;
    },
  },
}));

const mockSelectTokenList = jest.fn();
jest.mock('../../../../selectors/tokenListController', () => ({
  selectTokenList: (state: unknown) => mockSelectTokenList(state),
}));

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
};

const updateRouteParams = (params: Partial<MoreTokenActionsMenuParams>) => {
  Object.assign(mockRouteParams, params);
};

describe('MoreTokenActionsMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (selectAsset as unknown as jest.Mock).mockReturnValue({});
    mockSelectTokenList.mockReturnValue({});
    Object.assign(mockRouteParams, {
      hasPerpsMarket: false,
      hasBalance: false,
      isBuyable: false,
      isNativeCurrency: false,
      asset: {
        address: '0x123',
        chainId: '0x1',
        symbol: 'TEST',
        name: 'Test Token',
        decimals: 18,
        balance: '100',
        balanceFiat: '$100',
        logo: '',
        image: '',
        isETH: false,
        hasBalanceError: false,
        aggregators: [],
      },
      onBuy: jest.fn(),
      onReceive: jest.fn(),
    });
  });

  describe('action layout with perps market and balance', () => {
    it('renders Receive, View on explorer, Remove token when hasPerpsMarket and hasBalance are true', () => {
      updateRouteParams({
        hasPerpsMarket: true,
        hasBalance: true,
        isBuyable: false,
        isNativeCurrency: false,
      });

      const { getByTestId, queryByTestId } = renderWithProvider(
        <MoreTokenActionsMenu />,
        { state: mockInitialState },
      );

      expect(getByTestId('more-actions-receive')).toBeOnTheScreen();
      expect(getByTestId('more-actions-view-explorer')).toBeOnTheScreen();
      expect(getByTestId('more-actions-remove-token')).toBeOnTheScreen();
      expect(
        queryByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON),
      ).not.toBeOnTheScreen();
    });
  });

  describe('action layout with perps market and buyable', () => {
    it('renders Cash Buy, View on explorer, Remove token when hasPerpsMarket and isBuyable are true', () => {
      updateRouteParams({
        hasPerpsMarket: true,
        hasBalance: false,
        isBuyable: true,
        isNativeCurrency: false,
      });

      const { getByTestId, queryByTestId } = renderWithProvider(
        <MoreTokenActionsMenu />,
        { state: mockInitialState },
      );

      expect(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON),
      ).toBeOnTheScreen();
      expect(getByTestId('more-actions-view-explorer')).toBeOnTheScreen();
      expect(getByTestId('more-actions-remove-token')).toBeOnTheScreen();
      expect(queryByTestId('more-actions-receive')).not.toBeOnTheScreen();
    });
  });

  describe('action layout with perps market, balance, and buyable', () => {
    it('renders Receive, Cash Buy, View on explorer, Remove token when all perps conditions are true', () => {
      updateRouteParams({
        hasPerpsMarket: true,
        hasBalance: true,
        isBuyable: true,
        isNativeCurrency: false,
      });

      const { getByTestId } = renderWithProvider(<MoreTokenActionsMenu />, {
        state: mockInitialState,
      });

      expect(getByTestId('more-actions-receive')).toBeOnTheScreen();
      expect(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON),
      ).toBeOnTheScreen();
      expect(getByTestId('more-actions-view-explorer')).toBeOnTheScreen();
      expect(getByTestId('more-actions-remove-token')).toBeOnTheScreen();
    });
  });

  describe('action layout without perps market', () => {
    it('renders View on explorer, Remove token when hasPerpsMarket is false', () => {
      updateRouteParams({
        hasPerpsMarket: false,
        hasBalance: true,
        isBuyable: true,
        isNativeCurrency: false,
      });

      const { getByTestId, queryByTestId } = renderWithProvider(
        <MoreTokenActionsMenu />,
        { state: mockInitialState },
      );

      expect(getByTestId('more-actions-view-explorer')).toBeOnTheScreen();
      expect(getByTestId('more-actions-remove-token')).toBeOnTheScreen();
      expect(queryByTestId('more-actions-receive')).not.toBeOnTheScreen();
      expect(
        queryByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON),
      ).not.toBeOnTheScreen();
    });
  });

  describe('action layout for native currency', () => {
    it('renders View on explorer but not Remove token when isNativeCurrency is true', () => {
      updateRouteParams({
        hasPerpsMarket: false,
        hasBalance: true,
        isBuyable: true,
        isNativeCurrency: true,
      });

      const { getByTestId, queryByTestId } = renderWithProvider(
        <MoreTokenActionsMenu />,
        { state: mockInitialState },
      );

      expect(getByTestId('more-actions-view-explorer')).toBeOnTheScreen();
      expect(queryByTestId('more-actions-remove-token')).not.toBeOnTheScreen();
    });
  });

  describe('action layout for native currency with perps market', () => {
    it('renders Receive, Cash Buy, View on explorer but not Remove token when native with perps', () => {
      updateRouteParams({
        hasPerpsMarket: true,
        hasBalance: true,
        isBuyable: true,
        isNativeCurrency: true,
      });

      const { getByTestId, queryByTestId } = renderWithProvider(
        <MoreTokenActionsMenu />,
        { state: mockInitialState },
      );

      expect(getByTestId('more-actions-receive')).toBeOnTheScreen();
      expect(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON),
      ).toBeOnTheScreen();
      expect(getByTestId('more-actions-view-explorer')).toBeOnTheScreen();
      expect(queryByTestId('more-actions-remove-token')).not.toBeOnTheScreen();
    });
  });

  describe('remove token visibility', () => {
    it('does not render Remove token when tokenIsInAccount is false', () => {
      updateRouteParams({
        hasPerpsMarket: false,
        hasBalance: true,
        isBuyable: false,
        isNativeCurrency: false,
      });
      (selectAsset as unknown as jest.Mock).mockReturnValue(null);

      const { getByTestId, queryByTestId } = renderWithProvider(
        <MoreTokenActionsMenu />,
        { state: mockInitialState },
      );

      expect(getByTestId('more-actions-view-explorer')).toBeOnTheScreen();
      expect(queryByTestId('more-actions-remove-token')).not.toBeOnTheScreen();
    });

    it('does not render Remove token when asset address is MUSD', () => {
      updateRouteParams({
        hasPerpsMarket: false,
        hasBalance: true,
        isBuyable: false,
        isNativeCurrency: false,
        asset: {
          ...mockRouteParams.asset,
          address: MUSD_TOKEN_ADDRESS,
        },
      });

      const { getByTestId, queryByTestId } = renderWithProvider(
        <MoreTokenActionsMenu />,
        { state: mockInitialState },
      );

      expect(getByTestId('more-actions-view-explorer')).toBeOnTheScreen();
      expect(queryByTestId('more-actions-remove-token')).not.toBeOnTheScreen();
    });
  });

  describe('action handlers', () => {
    it('calls onBuy when Buy is pressed', async () => {
      updateRouteParams({
        hasPerpsMarket: true,
        hasBalance: false,
        isBuyable: true,
        isNativeCurrency: false,
      });
      const onBuy = jest.fn();
      mockRouteParams.onBuy = onBuy;

      const { getByTestId } = renderWithProvider(<MoreTokenActionsMenu />, {
        state: mockInitialState,
      });

      await userEvent.press(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON),
      );

      expect(onBuy).toHaveBeenCalled();
    });

    it('calls onReceive when Receive is pressed', async () => {
      updateRouteParams({
        hasPerpsMarket: true,
        hasBalance: true,
        isBuyable: false,
        isNativeCurrency: false,
      });
      const onReceive = jest.fn();
      mockRouteParams.onReceive = onReceive;

      const { getByTestId } = renderWithProvider(<MoreTokenActionsMenu />, {
        state: mockInitialState,
      });

      await userEvent.press(getByTestId('more-actions-receive'));

      expect(onReceive).toHaveBeenCalled();
    });

    it('navigates to Webview when View on block explorer is pressed and InAppBrowser is not available', async () => {
      mockInAppBrowserIsAvailable.mockResolvedValue(false);
      updateRouteParams({
        hasPerpsMarket: false,
        hasBalance: true,
        isBuyable: false,
        isNativeCurrency: false,
      });

      const { getByTestId } = renderWithProvider(<MoreTokenActionsMenu />, {
        state: mockInitialState,
      });

      await userEvent.press(getByTestId('more-actions-view-explorer'));

      await Promise.resolve();

      expect(mockNavigate).toHaveBeenCalledWith('Webview', {
        screen: 'SimpleWebview',
        params: {
          url: 'https://etherscan.io/token/0x123',
          title: 'Etherscan',
        },
      });
    });

    it('opens InAppBrowser when View on block explorer is pressed and InAppBrowser is available', async () => {
      mockInAppBrowserIsAvailable.mockResolvedValue(true);
      mockInAppBrowserOpen.mockResolvedValue(undefined);
      updateRouteParams({
        hasPerpsMarket: false,
        hasBalance: true,
        isBuyable: false,
        isNativeCurrency: false,
      });

      const { getByTestId } = renderWithProvider(<MoreTokenActionsMenu />, {
        state: mockInitialState,
      });

      await userEvent.press(getByTestId('more-actions-view-explorer'));

      await Promise.resolve();

      expect(mockInAppBrowserOpen).toHaveBeenCalledWith(
        'https://etherscan.io/token/0x123',
      );
    });

    it('uses block explorer base URL for native currency when View on block explorer is pressed', async () => {
      updateRouteParams({
        hasPerpsMarket: false,
        hasBalance: true,
        isBuyable: false,
        isNativeCurrency: true,
      });

      const { getByTestId } = renderWithProvider(<MoreTokenActionsMenu />, {
        state: mockInitialState,
      });

      await userEvent.press(getByTestId('more-actions-view-explorer'));

      expect(mockGetBlockExplorerBaseUrl).toHaveBeenCalledWith('0x1');
      expect(mockGetBlockExplorerName).toHaveBeenCalledWith('0x1');
    });

    it('navigates to AssetHideConfirmation when Remove token is pressed', async () => {
      updateRouteParams({
        hasPerpsMarket: false,
        hasBalance: true,
        isBuyable: false,
        isNativeCurrency: false,
      });

      const { getByTestId } = renderWithProvider(<MoreTokenActionsMenu />, {
        state: mockInitialState,
      });

      await userEvent.press(getByTestId('more-actions-remove-token'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: 'AssetHideConfirmation',
        params: expect.objectContaining({
          onConfirm: expect.any(Function),
        }),
      });
    });

    it('hides token, shows notification and tracks event when onConfirm is called', async () => {
      updateRouteParams({
        hasPerpsMarket: false,
        hasBalance: true,
        isBuyable: false,
        isNativeCurrency: false,
      });
      mockSelectTokenList.mockReturnValue({
        '0x123': { symbol: 'TEST' },
      });
      (
        Engine.context.NetworkController
          .findNetworkClientIdByChainId as jest.Mock
      ).mockReturnValue('mainnet');

      const { getByTestId } = renderWithProvider(<MoreTokenActionsMenu />, {
        state: mockInitialState,
      });

      await userEvent.press(getByTestId('more-actions-remove-token'));

      const hideConfirmationCall = mockNavigate.mock.calls.find(
        (call: unknown[]) => {
          const arg1 = call[1] as {
            screen?: string;
            params?: { onConfirm?: () => void };
          };
          return (
            call[0] === Routes.MODAL.ROOT_MODAL_FLOW &&
            arg1?.screen === 'AssetHideConfirmation'
          );
        },
      );
      expect(hideConfirmationCall).toBeDefined();
      const routeParams = (hideConfirmationCall as unknown[])[1] as {
        params?: { onConfirm?: () => void };
      };
      const onConfirm = routeParams?.params?.onConfirm;
      expect(onConfirm).toBeDefined();

      onConfirm?.();

      expect(mockNavigate).toHaveBeenCalledWith('WalletView');
      expect(
        Engine.context.NetworkController.findNetworkClientIdByChainId,
      ).toHaveBeenCalledWith('0x1');
      expect(Engine.context.TokensController.ignoreTokens).toHaveBeenCalledWith(
        ['0x123'],
        'mainnet',
      );
      expect(NotificationManager.showSimpleNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'simple_notification',
          duration: 5000,
          title: expect.any(String),
          description: expect.any(String),
        }),
      );
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('logs error when hide token fails', async () => {
      (
        Engine.context.TokensController.ignoreTokens as jest.Mock
      ).mockImplementation(() => {
        throw new Error('Controller error');
      });
      updateRouteParams({
        hasPerpsMarket: false,
        hasBalance: true,
        isBuyable: false,
        isNativeCurrency: false,
      });

      const { getByTestId } = renderWithProvider(<MoreTokenActionsMenu />, {
        state: mockInitialState,
      });

      await userEvent.press(getByTestId('more-actions-remove-token'));

      const navigateCall = mockNavigate.mock.calls.find(
        (call: unknown[]) =>
          call[0] === Routes.MODAL.ROOT_MODAL_FLOW &&
          (call[1] as { screen?: string; params?: { onConfirm?: () => void } })
            ?.screen === 'AssetHideConfirmation',
      );
      const onConfirm = (
        navigateCall?.[1] as {
          params?: { onConfirm?: () => void };
        }
      )?.params?.onConfirm;
      onConfirm?.();

      expect(mockLoggerLog).toHaveBeenCalledWith(
        expect.any(Error),
        'MoreTokenActionsMenu: Failed to hide token!',
      );
    });
  });
});

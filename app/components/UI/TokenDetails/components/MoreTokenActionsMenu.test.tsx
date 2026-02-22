import React from 'react';
import MoreTokenActionsMenu, {
  MoreTokenActionsMenuParams,
} from './MoreTokenActionsMenu';
import { TokenI } from '../../Tokens/types';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { WalletActionsBottomSheetSelectorsIDs } from '../../../Views/WalletActions/WalletActionsBottomSheet.testIds';

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

jest.mock('../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn(() => ({ build: jest.fn() })),
    })),
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

jest.mock('react-native-inappbrowser-reborn', () => ({
  isAvailable: jest.fn(() => Promise.resolve(false)),
  open: jest.fn(),
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
    // Reset route params to defaults
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
});

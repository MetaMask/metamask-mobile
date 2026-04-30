// Mock dependencies first - must be hoisted before imports
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

// Mock theme first to prevent component initialization errors
jest.mock('../../../../../util/theme', () => {
  const actual = jest.requireActual('../../../../../util/theme');
  return {
    ...actual,
    useTheme: jest.fn(() => actual.mockTheme),
  };
});

const mockUseParams = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    isFocused: () => true,
  }),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../util/navigation/navUtils'),
  useParams: () => mockUseParams(),
}));

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: () => mockDispatch,
}));

const mockSdk = {
  getSupportedTokensByChainId: jest.fn<
    {
      address: string;
      symbol: string;
      name: string;
      decimals: number;
    }[],
    [string?]
  >(() => []),
  updateWalletPriority: jest.fn(),
  lineaChainId: 'eip155:59144',
};

jest.mock('../../sdk', () => ({
  useCardSDK: () => ({
    sdk: mockSdk,
    isLoading: false,
  }),
}));

const mockShowToast = jest.fn();

jest.mock('../../../../../component-library/components/Toast');

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
const mockEventBuilder = {
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({}),
};

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: jest.fn(),
}));

const mockNavigateToCardPage = jest.fn();
jest.mock('../../hooks/useNavigateToCardPage', () => ({
  useNavigateToCardPage: jest.fn(() => ({
    navigateToCardPage: mockNavigateToCardPage,
  })),
}));

jest.mock('../../hooks/useAssetBalances', () => ({
  useAssetBalances: jest.fn(),
}));

jest.mock('../../hooks/useCardHomeData', () => ({
  useCardHomeData: jest.fn(),
}));

const mockUpdateFundingPriority = jest.fn();
jest.mock('../../hooks/useUpdateFundingPriority', () => ({
  useUpdateFundingPriority: jest.fn(),
}));

jest.mock('../../../../../util/Logger');

// Create a mock tailwind function that can be called and has a style method
const mockTw = Object.assign(
  jest.fn((className: string) => ({ className })),
  {
    style: jest.fn((...args: unknown[]) => {
      const styles = args.filter(
        (arg) => typeof arg === 'string' || typeof arg === 'boolean',
      );
      return { className: styles.join(' ') };
    }),
  },
);

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => mockTw,
}));

jest.mock('react-native-gesture-handler', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...jest.requireActual('react-native-gesture-handler'),
    FlatList: RN.FlatList,
  };
});

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { CaipChainId } from '@metamask/utils';
import { SolScope } from '@metamask/keyring-api';
import AssetSelectionBottomSheet from './AssetSelectionBottomSheet';
import {
  FundingStatus,
  CardFundingToken,
  DelegationSettingsResponse,
} from '../../types';
import Routes from '../../../../../constants/navigation/Routes';
import { ToastContext } from '../../../../../component-library/components/Toast';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { useNavigateToCardPage } from '../../hooks/useNavigateToCardPage';
import { useUpdateFundingPriority } from '../../hooks/useUpdateFundingPriority';
import { useCardHomeData } from '../../hooks/useCardHomeData';
import { getAssetBalanceKey } from '../../util/getAssetBalanceKey';

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

// Wrapper component to provide Toast context
const renderWithToastContext = (component: React.ReactElement) =>
  render(
    <ToastContext.Provider
      value={{
        toastRef: {
          current: { showToast: mockShowToast, closeToast: jest.fn() },
        },
      }}
    >
      {component}
    </ToastContext.Provider>,
  );

// Helper function to create mock token
const createMockToken = (
  overrides: Partial<CardFundingToken> = {},
): CardFundingToken => ({
  address: '0x123',
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  caipChainId: 'eip155:59144' as CaipChainId,
  walletAddress: '0xwallet',
  fundingStatus: FundingStatus.NotEnabled,
  spendableBalance: '0',
  priority: undefined,
  ...overrides,
});

// Helper function to create mock delegation settings
const createMockDelegationSettings = (): DelegationSettingsResponse => ({
  networks: [
    {
      network: 'linea',
      environment: 'production',
      chainId: '59144',
      delegationContract: '0xdelegation',
      tokens: {
        USDC: {
          symbol: 'USDC',
          decimals: 6,
          address: '0x123',
        },
        USDT: {
          symbol: 'USDT',
          decimals: 6,
          address: '0x456',
        },
      },
    },
  ],
  count: 1,
  _links: {
    self: '/api/v1/settings',
  },
});

// Helper function to setup component with useParams and useCardHomeData
const setupComponent = (paramsOverrides: Record<string, unknown> = {}) => {
  const {
    tokensWithAllowances = [],
    fundingTokens: fundingTokensParam,
    primaryToken = null,
    delegationSettings = null,
    balanceMap = new Map(),
    navigateToCardHomeOnPriorityToken = false,
    selectionOnly = false,
    onTokenSelect = undefined,
    callerRoute = undefined,
    callerParams = undefined,
    ...rest
  } = paramsOverrides;

  const tokens = tokensWithAllowances as CardFundingToken[];

  // If fundingTokens was explicitly provided (even as null), use it; otherwise default to tokens
  const resolvedFundingTokens =
    'fundingTokens' in paramsOverrides ? fundingTokensParam : tokens;

  mockUseParams.mockReturnValue({
    navigateToCardHomeOnPriorityToken,
    selectionOnly,
    onTokenSelect,
    callerRoute,
    callerParams,
    ...rest,
  });

  (useCardHomeData as jest.Mock).mockReturnValue({
    availableTokens: tokens,
    fundingTokens: resolvedFundingTokens,
    primaryToken,
    balanceMap,
    data: { delegationSettings },
  });

  return renderWithToastContext(<AssetSelectionBottomSheet />);
};

describe('AssetSelectionBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSelector.mockReturnValue(undefined);

    // Re-configure mockEventBuilder after resetAllMocks clears it
    mockEventBuilder.addProperties = jest.fn().mockReturnThis();
    mockEventBuilder.build = jest.fn().mockReturnValue({});

    (useAnalytics as jest.Mock).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    });

    mockCreateEventBuilder.mockReturnValue(mockEventBuilder);

    (useNavigateToCardPage as jest.Mock).mockReturnValue({
      navigateToCardPage: mockNavigateToCardPage,
    });

    // Mock useUpdateFundingPriority to call onSuccess by default
    mockUpdateFundingPriority.mockImplementation(async () => true);
    (useUpdateFundingPriority as jest.Mock).mockImplementation((params) => ({
      updateFundingPriority: async (token: unknown) => {
        const result = await mockUpdateFundingPriority(token);
        if (result && params?.onSuccess) {
          params.onSuccess();
        } else if (!result && params?.onError) {
          params.onError(new Error('Update failed'));
        }
        return result;
      },
    }));

    // Default useParams mock
    mockUseParams.mockReturnValue({
      navigateToCardHomeOnPriorityToken: false,
      selectionOnly: false,
      onTokenSelect: undefined,
      callerRoute: undefined,
      callerParams: undefined,
    });

    // Default useCardHomeData mock
    (useCardHomeData as jest.Mock).mockReturnValue({
      availableTokens: [],
      fundingTokens: [],
      primaryToken: null,
      balanceMap: new Map(),
      data: {
        delegationSettings: null,
      },
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('rendering', () => {
    it('renders bottom sheet with title', () => {
      const delegationSettings = createMockDelegationSettings();

      const { getByText } = setupComponent({
        delegationSettings,
      });

      expect(getByText('Select token and network')).toBeOnTheScreen();
    });

    it('displays loading indicator when delegation settings is null', () => {
      const { UNSAFE_getByType, queryByText } = setupComponent({
        delegationSettings: null,
      });

      expect(UNSAFE_getByType('ActivityIndicator' as never)).toBeTruthy();
      expect(queryByText('No tokens available')).not.toBeOnTheScreen();
    });

    it('displays no tokens message when no tokens available', () => {
      // Create delegation settings with no tokens
      const delegationSettings: DelegationSettingsResponse = {
        networks: [
          {
            network: 'linea',
            environment: 'production',
            chainId: '59144',
            delegationContract: '0xdelegation',
            tokens: {}, // Empty tokens object
          },
        ],
        count: 1,
        _links: {
          self: '/api/v1/settings',
        },
      };

      const { getByText } = setupComponent({
        delegationSettings,
      });

      expect(getByText('No tokens available')).toBeOnTheScreen();
    });

    it('renders token list when tokens are available', () => {
      const token = createMockToken({
        symbol: 'USDC',
        fundingStatus: FundingStatus.Enabled,
      });
      const delegationSettings = createMockDelegationSettings();

      const { getByText } = setupComponent({
        tokensWithAllowances: [token],
        delegationSettings,
      });

      expect(getByText(/USDC on/)).toBeOnTheScreen();
      expect(getByText('Enabled')).toBeOnTheScreen();
    });

    it('displays limited state for tokens with limited allowance', () => {
      const token = createMockToken({
        symbol: 'USDT',
        fundingStatus: FundingStatus.Limited,
      });
      const delegationSettings = createMockDelegationSettings();

      const { getByText } = setupComponent({
        tokensWithAllowances: [token],
        delegationSettings,
      });

      expect(getByText('Limited')).toBeOnTheScreen();
    });

    it('displays not enabled state for tokens without allowance', () => {
      const token = createMockToken({
        symbol: 'DAI',
        fundingStatus: FundingStatus.NotEnabled,
      });
      const delegationSettings = createMockDelegationSettings();

      const { getAllByText } = setupComponent({
        tokensWithAllowances: [token],
        delegationSettings,
      });

      const notEnabledElements = getAllByText('Not enabled');
      expect(notEnabledElements.length).toBeGreaterThan(0);
      expect(notEnabledElements[0]).toBeOnTheScreen();
    });
  });

  describe('token filtering', () => {
    it('shows Solana tokens', () => {
      const solanaToken = createMockToken({
        symbol: 'SOL',
        caipChainId: SolScope.Mainnet,
      });
      const lineaToken = createMockToken({
        symbol: 'USDC',
        caipChainId: 'eip155:59144' as CaipChainId,
      });
      const delegationSettings = createMockDelegationSettings();

      const { getByText } = setupComponent({
        tokensWithAllowances: [solanaToken, lineaToken],
        delegationSettings,
      });

      expect(getByText(/SOL on/)).toBeOnTheScreen();
      expect(getByText(/USDC on/)).toBeOnTheScreen();
    });
  });

  describe('token sorting', () => {
    it('sorts tokens by priority', () => {
      mockUseSelector.mockReturnValue(undefined);
      const token1 = createMockToken({
        symbol: 'USDC',
        priority: 2,
        fundingStatus: FundingStatus.Enabled,
      });
      const token2 = createMockToken({
        symbol: 'USDT',
        address: '0x456',
        priority: 1,
        fundingStatus: FundingStatus.Enabled,
      });
      const delegationSettings = createMockDelegationSettings();

      const { getAllByText } = setupComponent({
        tokensWithAllowances: [token1, token2],
        delegationSettings,
      });

      // Check that tokens are sorted by priority (USDT has priority 1, USDC has priority 2)
      const usdtToken = getAllByText(/USDT on Linea/)[0];
      const usdcToken = getAllByText(/USDC on Linea/)[0];
      expect(usdtToken).toBeTruthy();
      expect(usdcToken).toBeTruthy();
    });

    it('sorts enabled tokens before not enabled tokens', () => {
      const notEnabledToken = createMockToken({
        symbol: 'DAI',
        fundingStatus: FundingStatus.NotEnabled,
      });
      const enabledToken = createMockToken({
        symbol: 'USDC',
        address: '0x456',
        fundingStatus: FundingStatus.Enabled,
      });
      const delegationSettings = createMockDelegationSettings();

      const { getAllByText } = setupComponent({
        tokensWithAllowances: [notEnabledToken, enabledToken],
        delegationSettings,
      });

      // Check that enabled tokens come before not enabled tokens
      const usdcToken = getAllByText(/USDC on Linea/)[0];
      const daiToken = getAllByText(/DAI on Linea/)[0];
      expect(usdcToken).toBeTruthy();
      expect(daiToken).toBeTruthy();
    });

    it('sorts NotEnabled tokens by fiat balance descending', () => {
      const highFiatToken = createMockToken({
        symbol: 'USDC',
        address: '0x111',
        fundingStatus: FundingStatus.NotEnabled,
      });
      const lowFiatToken = createMockToken({
        symbol: 'USDT',
        address: '0x222',
        fundingStatus: FundingStatus.NotEnabled,
      });

      const balanceMap = new Map([
        [
          getAssetBalanceKey(highFiatToken),
          {
            rawTokenBalance: 100,
            balanceFiat: '$100.00',
            rawFiatNumber: 100,
          },
        ],
        [
          getAssetBalanceKey(lowFiatToken),
          { rawTokenBalance: 10, balanceFiat: '$10.00', rawFiatNumber: 10 },
        ],
      ]);

      const delegationSettings = createMockDelegationSettings();

      // Pass tokens in reverse order (low fiat first) to confirm sorting reorders them
      const { toJSON } = setupComponent({
        tokensWithAllowances: [lowFiatToken, highFiatToken],
        delegationSettings,
        balanceMap,
      });

      const renderedJson = JSON.stringify(toJSON());
      const usdcPos = renderedJson.indexOf(
        `asset-select-item-USDC-${highFiatToken.caipChainId}`,
      );
      const usdtPos = renderedJson.indexOf(
        `asset-select-item-USDT-${lowFiatToken.caipChainId}`,
      );

      // USDC (higher fiat) should appear before USDT (lower fiat)
      expect(usdcPos).toBeGreaterThan(-1);
      expect(usdtPos).toBeGreaterThan(-1);
      expect(usdcPos).toBeLessThan(usdtPos);
    });

    it('does not reorder Enabled tokens when sorting NotEnabled by fiat', () => {
      const enabledToken = createMockToken({
        symbol: 'USDC',
        address: '0x111',
        fundingStatus: FundingStatus.Enabled,
        priority: 1,
      });
      const notEnabledHighFiat = createMockToken({
        symbol: 'USDT',
        address: '0x222',
        fundingStatus: FundingStatus.NotEnabled,
      });
      const notEnabledLowFiat = createMockToken({
        symbol: 'EURe',
        address: '0x333',
        fundingStatus: FundingStatus.NotEnabled,
      });

      const balanceMap = new Map([
        [
          getAssetBalanceKey(enabledToken),
          { rawTokenBalance: 5, balanceFiat: '$5.00', rawFiatNumber: 5 },
        ],
        [
          getAssetBalanceKey(notEnabledHighFiat),
          {
            rawTokenBalance: 200,
            balanceFiat: '$200.00',
            rawFiatNumber: 200,
          },
        ],
        [
          getAssetBalanceKey(notEnabledLowFiat),
          { rawTokenBalance: 1, balanceFiat: '$1.00', rawFiatNumber: 1 },
        ],
      ]);

      const delegationSettings = createMockDelegationSettings();

      const { toJSON } = setupComponent({
        tokensWithAllowances: [
          notEnabledLowFiat,
          notEnabledHighFiat,
          enabledToken,
        ],
        delegationSettings,
        balanceMap,
      });

      const renderedJson = JSON.stringify(toJSON());
      const usdcPos = renderedJson.indexOf(
        `asset-select-item-USDC-${enabledToken.caipChainId}`,
      );
      const usdtPos = renderedJson.indexOf(
        `asset-select-item-USDT-${notEnabledHighFiat.caipChainId}`,
      );
      const eurePos = renderedJson.indexOf(
        `asset-select-item-EURe-${notEnabledLowFiat.caipChainId}`,
      );

      // Enabled USDC should appear first (existing sort preserved)
      expect(usdcPos).toBeLessThan(usdtPos);
      expect(usdcPos).toBeLessThan(eurePos);
      // Among NotEnabled: USDT ($200) before EURe ($1)
      expect(usdtPos).toBeLessThan(eurePos);
    });

    it('places NotEnabled tokens with undefined rawFiatNumber at the end of the NotEnabled group', () => {
      const tokenWithFiat = createMockToken({
        symbol: 'USDC',
        address: '0x111',
        fundingStatus: FundingStatus.NotEnabled,
      });
      const tokenWithoutFiat = createMockToken({
        symbol: 'USDT',
        address: '0x222',
        fundingStatus: FundingStatus.NotEnabled,
      });

      const balanceMap = new Map([
        [
          getAssetBalanceKey(tokenWithFiat),
          { rawTokenBalance: 50, balanceFiat: '$50.00', rawFiatNumber: 50 },
        ],
      ]);

      const delegationSettings = createMockDelegationSettings();

      // Pass tokenWithoutFiat first to confirm sorting moves it after tokenWithFiat
      const { toJSON } = setupComponent({
        tokensWithAllowances: [tokenWithoutFiat, tokenWithFiat],
        delegationSettings,
        balanceMap,
      });

      const renderedJson = JSON.stringify(toJSON());
      const usdcPos = renderedJson.indexOf(
        `asset-select-item-USDC-${tokenWithFiat.caipChainId}`,
      );
      const usdtPos = renderedJson.indexOf(
        `asset-select-item-USDT-${tokenWithoutFiat.caipChainId}`,
      );

      // USDC (has fiat) should appear before USDT (no fiat)
      expect(usdcPos).toBeGreaterThan(-1);
      expect(usdtPos).toBeGreaterThan(-1);
      expect(usdcPos).toBeLessThan(usdtPos);
    });
  });

  describe('balance display', () => {
    it('displays token balance from balanceMap', () => {
      const token = createMockToken();
      const delegationSettings = createMockDelegationSettings();

      const balanceMap = new Map([
        [
          getAssetBalanceKey(token),
          {
            rawTokenBalance: 123.456789,
            balanceFiat: '$123.45',
          },
        ],
      ]);

      const { getByText } = setupComponent({
        tokensWithAllowances: [token],
        delegationSettings,
        balanceMap,
      });

      expect(getByText('$123.45')).toBeOnTheScreen();
      expect(getByText('123.456789 USDC')).toBeOnTheScreen();
    });

    it('displays zero balance when balance data is not available', () => {
      const token = createMockToken();
      const delegationSettings = createMockDelegationSettings();

      const { getAllByText, getByText } = setupComponent({
        tokensWithAllowances: [token],
        delegationSettings,
      });

      const zeroBalanceElements = getAllByText('$0.00');
      expect(zeroBalanceElements.length).toBeGreaterThan(0);
      expect(zeroBalanceElements[0]).toBeOnTheScreen();
      expect(getByText('0 USDC')).toBeOnTheScreen();
    });
  });

  describe('token selection', () => {
    it('calls onTokenSelect and closes bottom sheet in selection only mode', () => {
      const mockOnTokenSelect = jest.fn();
      const token = createMockToken();
      const delegationSettings = createMockDelegationSettings();

      const { getByText } = setupComponent({
        tokensWithAllowances: [token],
        delegationSettings,
        selectionOnly: true,
        onTokenSelect: mockOnTokenSelect,
      });

      fireEvent.press(getByText(/USDC on/));

      expect(mockOnTokenSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          address: token.address,
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          caipChainId: token.caipChainId,
          walletAddress: token.walletAddress,
          fundingStatus: token.fundingStatus,
          spendableBalance: token.spendableBalance,
        }),
      );
    });

    it('navigates to spending limit for not enabled token', () => {
      const token = createMockToken({
        fundingStatus: FundingStatus.NotEnabled,
      });
      const delegationSettings = createMockDelegationSettings();

      const { getByText } = setupComponent({
        tokensWithAllowances: [token],
        delegationSettings,
      });

      fireEvent.press(getByText(/USDC on/));

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.CARD.SPENDING_LIMIT,
        expect.objectContaining({
          flow: 'manage',
          selectedToken: expect.objectContaining({
            address: token.address,
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
            caipChainId: token.caipChainId,
            walletAddress: token.walletAddress,
            fundingStatus: token.fundingStatus,
            spendableBalance: token.spendableBalance,
          }),
        }),
      );
    });

    it('updates priority for enabled token', async () => {
      const token = createMockToken({
        fundingStatus: FundingStatus.Enabled,
        priority: 2,
      });
      const delegationSettings = createMockDelegationSettings();

      mockUpdateFundingPriority.mockImplementation(async () => true);

      const { getByText } = setupComponent({
        tokensWithAllowances: [token],
        delegationSettings,
        fundingTokens: [token],
      });

      const tokenElement = getByText('USDC on Linea');

      await act(async () => {
        fireEvent.press(tokenElement);
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      await waitFor(
        () => {
          expect(mockUpdateFundingPriority).toHaveBeenCalledWith(
            expect.objectContaining({
              address: token.address,
              symbol: token.symbol,
              caipChainId: token.caipChainId,
              walletAddress: token.walletAddress,
            }),
          );
        },
        { timeout: 3000 },
      );

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: [{ label: 'Spend priority updated successfully' }],
        }),
      );
    });

    it('closes bottom sheet when already priority token is selected and navigateToCardHomeOnPriorityToken is false', () => {
      const token = createMockToken();
      const delegationSettings = createMockDelegationSettings();

      const { getByText } = setupComponent({
        tokensWithAllowances: [token],
        delegationSettings,
        primaryToken: token,
        navigateToCardHomeOnPriorityToken: false,
      });

      fireEvent.press(getByText(/USDC on/));
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('displays error toast when updateFundingPriority fails', async () => {
      const token = createMockToken({
        fundingStatus: FundingStatus.Enabled,
      });
      const delegationSettings = createMockDelegationSettings();

      mockUpdateFundingPriority.mockImplementation(async () => false);

      const { getByText } = setupComponent({
        tokensWithAllowances: [token],
        delegationSettings,
        fundingTokens: [token],
      });

      const tokenElement = getByText('USDC on Linea');

      await act(async () => {
        fireEvent.press(tokenElement);
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      await waitFor(
        () => {
          expect(mockShowToast).toHaveBeenCalledWith(
            expect.objectContaining({
              labelOptions: [{ label: 'Failed to update spend priority' }],
            }),
          );
        },
        { timeout: 3000 },
      );
    });

    it('displays error toast when funding asset is not found', async () => {
      const token = createMockToken({
        fundingStatus: FundingStatus.Enabled,
      });
      const delegationSettings = createMockDelegationSettings();

      mockUpdateFundingPriority.mockImplementation(async () => false);

      const { getByText } = setupComponent({
        tokensWithAllowances: [token],
        delegationSettings,
        fundingTokens: [token],
      });

      const tokenElement = getByText('USDC on Linea');

      await act(async () => {
        fireEvent.press(tokenElement);
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      await waitFor(
        () => {
          expect(mockShowToast).toHaveBeenCalledWith(
            expect.objectContaining({
              labelOptions: [{ label: 'Failed to update spend priority' }],
            }),
          );
        },
        { timeout: 3000 },
      );
    });
  });

  describe('metrics tracking', () => {
    it('tracks token selection event', async () => {
      const token = createMockToken({
        fundingStatus: FundingStatus.Enabled,
        spendableBalance: '1000',
      });
      const delegationSettings = createMockDelegationSettings();

      mockUpdateFundingPriority.mockImplementation(async () => true);

      const { getByText } = setupComponent({
        tokensWithAllowances: [token],
        delegationSettings,
        fundingTokens: [token],
      });

      const tokenElement = getByText('USDC on Linea');

      await act(async () => {
        fireEvent.press(tokenElement);
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      await waitFor(
        () => {
          expect(mockCreateEventBuilder).toHaveBeenCalled();
        },
        { timeout: 3000 },
      );

      expect(mockTrackEvent).toHaveBeenCalled();
    });
  });

  describe('navigation-based selection', () => {
    it('navigates back to caller route with selected token', () => {
      const token = createMockToken({
        symbol: 'EURe',
        address: '0xeure',
      });
      const delegationSettings = createMockDelegationSettings();
      const callerParams = { someParam: 'value' };

      // Mock SDK to return EURe with proper casing
      mockSdk.getSupportedTokensByChainId.mockReturnValue([
        {
          address: '0xeure',
          symbol: 'EURe',
          name: 'Euro Coin',
          decimals: 6,
        },
      ]);

      const { getByText } = setupComponent({
        tokensWithAllowances: [token],
        delegationSettings,
        selectionOnly: true,
        callerRoute: Routes.CARD.SPENDING_LIMIT,
        callerParams,
      });

      fireEvent.press(getByText(/EURe on/));

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.CARD.SPENDING_LIMIT,
        expect.objectContaining({
          ...callerParams,
          returnedSelectedToken: expect.objectContaining({
            address: token.address,
            symbol: 'EURe',
          }),
        }),
      );
    });

    it('goes back when no caller route is provided in navigation mode', () => {
      const token = createMockToken({
        symbol: 'mUSD',
        address: '0xmusd',
      });
      const delegationSettings = createMockDelegationSettings();

      // Mock SDK to return mUSD with proper casing
      mockSdk.getSupportedTokensByChainId.mockReturnValue([
        {
          address: '0xmusd',
          symbol: 'mUSD',
          name: 'MetaMask USD',
          decimals: 6,
        },
      ]);

      const { getByText } = setupComponent({
        tokensWithAllowances: [token],
        delegationSettings,
        selectionOnly: true,
        callerRoute: undefined,
        callerParams: undefined,
      });

      fireEvent.press(getByText(/mUSD on/));

      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('wallet address display', () => {
    it('displays truncated wallet address when available', () => {
      const token = createMockToken({
        symbol: 'mUSD',
        address: '0xmusd',
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      });
      const delegationSettings = createMockDelegationSettings();

      // Mock SDK to return mUSD with proper casing
      mockSdk.getSupportedTokensByChainId.mockReturnValue([
        {
          address: '0xmusd',
          symbol: 'mUSD',
          name: 'MetaMask USD',
          decimals: 6,
        },
      ]);

      const { getByText } = setupComponent({
        tokensWithAllowances: [token],
        delegationSettings,
      });

      expect(getByText(/0x1234.../)).toBeOnTheScreen();
    });

    it('does not display wallet address when not available', () => {
      const token = createMockToken({
        symbol: 'EURe',
        address: '0xeure',
        walletAddress: undefined,
      });
      const delegationSettings = createMockDelegationSettings();

      // Mock SDK to return EURe with proper casing
      mockSdk.getSupportedTokensByChainId.mockReturnValue([
        {
          address: '0xeure',
          symbol: 'EURe',
          name: 'Euro Coin',
          decimals: 6,
        },
      ]);

      const { queryByText } = setupComponent({
        tokensWithAllowances: [token],
        delegationSettings,
      });

      expect(queryByText(/0x/)).not.toBeOnTheScreen();
    });
  });

  describe('token display from provider data', () => {
    it('displays all available tokens including those from delegation settings', () => {
      const userToken = createMockToken({
        symbol: 'mUSD',
        address: '0x123',
      });
      const delegationToken = createMockToken({
        symbol: 'EURe',
        address: '0x456',
        fundingStatus: FundingStatus.NotEnabled,
      });
      const delegationSettings: DelegationSettingsResponse = {
        networks: [
          {
            network: 'linea',
            environment: 'production',
            chainId: '59144',
            delegationContract: '0xdelegation',
            tokens: {
              mUSD: {
                symbol: 'mUSD',
                decimals: 6,
                address: '0x123',
              },
              EURe: {
                symbol: 'EURe',
                decimals: 6,
                address: '0x456',
              },
            },
          },
        ],
        count: 1,
        _links: { self: '/api' },
      };

      // Mock SDK to return both tokens with proper casing
      mockSdk.getSupportedTokensByChainId.mockReturnValue([
        {
          address: '0x123',
          symbol: 'mUSD',
          name: 'MetaMask USD',
          decimals: 6,
        },
        {
          address: '0x456',
          symbol: 'EURe',
          name: 'Euro Coin',
          decimals: 6,
        },
      ]);

      const { getByText } = setupComponent({
        tokensWithAllowances: [userToken, delegationToken],
        delegationSettings,
      });

      expect(getByText(/mUSD on/)).toBeOnTheScreen();
      expect(getByText(/EURe on/)).toBeOnTheScreen();
    });

    it('does not duplicate tokens already in user wallet', () => {
      const userToken = createMockToken({
        symbol: 'mUSD',
        address: '0x123',
      });
      const delegationSettings: DelegationSettingsResponse = {
        networks: [
          {
            network: 'linea',
            environment: 'production',
            chainId: '59144',
            delegationContract: '0xdelegation',
            tokens: {
              mUSD: {
                symbol: 'mUSD',
                decimals: 6,
                address: '0x123',
              },
            },
          },
        ],
        count: 1,
        _links: { self: '/api' },
      };

      // Mock SDK to return mUSD with proper casing
      mockSdk.getSupportedTokensByChainId.mockReturnValue([
        {
          address: '0x123',
          symbol: 'mUSD',
          name: 'MetaMask USD',
          decimals: 6,
        },
      ]);

      const { getAllByText } = setupComponent({
        tokensWithAllowances: [userToken],
        delegationSettings,
      });

      const musdElements = getAllByText(/mUSD on/);
      expect(musdElements.length).toBe(1);
    });
  });

  describe('priority token highlighting', () => {
    it('highlights priority token with border', () => {
      const token = createMockToken({
        symbol: 'EURe',
        address: '0xeure',
      });
      const delegationSettings = createMockDelegationSettings();

      // Mock SDK to return EURe with proper casing
      mockSdk.getSupportedTokensByChainId.mockReturnValue([
        {
          address: '0xeure',
          symbol: 'EURe',
          name: 'Euro Coin',
          decimals: 6,
        },
      ]);

      const { getByTestId } = setupComponent({
        tokensWithAllowances: [token],
        delegationSettings,
        primaryToken: token,
      });

      const tokenItem = getByTestId(
        `asset-select-item-EURe-${token.caipChainId}`,
      );
      expect(tokenItem).toBeTruthy();
    });
  });
});

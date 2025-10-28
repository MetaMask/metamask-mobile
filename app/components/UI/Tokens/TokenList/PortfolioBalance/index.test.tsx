import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider, {
  DeepPartial,
} from '../../../../../util/test/renderWithProvider';
import initialRootState from '../../../../../util/test/initial-root-state';
import { WalletViewSelectorsIDs } from '../../../../../../e2e/selectors/wallet/WalletView.selectors';
import { PortfolioBalance } from '.';
import Engine from '../../../../../core/Engine';
import { useSelectedAccountMultichainBalances } from '../../../../hooks/useMultichainBalances';
import type { RootState } from '../../../../../reducers';

const { PreferencesController } = Engine.context;

// Mock the useMultichainBalances hook
const mockSelectedAccountMultichainBalance = {
  displayBalance: '$123.45',
  displayCurrency: 'USD',
  totalFiatBalance: 123.45,
  totalNativeTokenBalance: '0.1',
  nativeTokenUnit: 'ETH',
  shouldShowAggregatedPercentage: true,
  isPortfolioViewEnabled: false,
  aggregatedBalance: {
    ethFiat: 123.45,
    tokenFiat: 0,
    tokenFiat1dAgo: 0,
    ethFiat1dAgo: 100.0,
  },
  isLoadingAccount: false,
  tokenFiatBalancesCrossChains: [],
};

jest.mock('../../../../hooks/useMultichainBalances', () => ({
  useSelectedAccountMultichainBalances: jest.fn(() => ({
    selectedAccountMultichainBalance: mockSelectedAccountMultichainBalance,
  })),
}));

jest.mock('../../../../../selectors/featureFlagController/homepage', () => ({
  selectHomepageRedesignV1Enabled: jest.fn(() => false),
}));

jest.mock('../../../../../core/Engine', () => ({
  getTotalEvmFiatAccountBalance: jest.fn(),
  context: {
    TokensController: {
      ignoreTokens: jest.fn(() => Promise.resolve()),
    },
    PreferencesController: {
      setPrivacyMode: jest.fn(),
    },
    NetworkController: {
      getNetworkClientById: () => ({
        configuration: {
          chainId: '0x1',
          rpcUrl: 'https://mainnet.infura.io/v3',
          ticker: 'ETH',
          type: 'custom',
        },
      }),
      state: {
        selectedNetworkClientId: 'mainnet',
      },
    },
  },
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

jest.mock('../../../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn(),
    })),
  }),
  MetaMetricsEvents: {
    CARD_ADD_FUNDS_DEPOSIT_CLICKED: 'CARD_ADD_FUNDS_DEPOSIT_CLICKED',
    RAMPS_BUTTON_CLICKED: 'RAMPS_BUTTON_CLICKED',
  },
}));

// Helper functions for creating state variations
const createStateWithPrivacyMode = (
  privacyMode: boolean,
): DeepPartial<RootState> => ({
  ...initialRootState,
  engine: {
    backgroundState: {
      ...initialRootState.engine.backgroundState,
      PreferencesController: {
        privacyMode,
      },
    },
  },
});

const createStateWithFeatureFlag = (
  enabled: boolean,
): DeepPartial<RootState> => {
  // Mock the feature flag selector
  const { selectHomepageRedesignV1Enabled } = jest.requireMock(
    '../../../../../selectors/featureFlagController/homepage',
  );
  (selectHomepageRedesignV1Enabled as jest.Mock).mockReturnValue(enabled);

  return initialRootState;
};

const renderPortfolioBalance = (
  state: DeepPartial<RootState> = initialRootState,
) => renderWithProvider(<PortfolioBalance />, { state });

describe('PortfolioBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to default mock before each test
    const mockedHook = jest.mocked(useSelectedAccountMultichainBalances);
    mockedHook.mockReturnValue({
      selectedAccountMultichainBalance: mockSelectedAccountMultichainBalance,
    });
  });

  it('fiat balance must be defined', () => {
    const { getByTestId } = renderPortfolioBalance();
    expect(
      getByTestId(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT),
    ).toBeDefined();
  });

  it('renders sensitive text when privacy mode is off', () => {
    const { getByTestId } = renderPortfolioBalance(
      createStateWithPrivacyMode(false),
    );
    const sensitiveText = getByTestId(
      WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT,
    );
    expect(sensitiveText.props.isHidden).toBeFalsy();
  });

  it('hides sensitive text when privacy mode is on', () => {
    const { getByTestId } = renderPortfolioBalance(
      createStateWithPrivacyMode(true),
    );
    const sensitiveText = getByTestId(
      WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT,
    );
    expect(sensitiveText.props.children).toEqual('••••••••••••');
  });

  it('toggles privacy mode when balance container is pressed', () => {
    const { getByTestId } = renderPortfolioBalance(
      createStateWithPrivacyMode(false),
    );

    const balanceContainer = getByTestId('balance-container');
    fireEvent.press(balanceContainer);

    expect(PreferencesController.setPrivacyMode).toHaveBeenCalledWith(true);
  });

  it('displays BalanceEmptyState when balance is zero and feature flag is enabled', () => {
    // Mock zero balance
    const mockSelectedAccountMultichainBalanceZero = {
      displayBalance: '$0.00',
      displayCurrency: 'USD',
      totalFiatBalance: 0,
      totalNativeTokenBalance: '0',
      nativeTokenUnit: 'ETH',
      shouldShowAggregatedPercentage: false,
      isPortfolioViewEnabled: false,
      aggregatedBalance: {
        ethFiat: 123.45,
        tokenFiat: 0,
        tokenFiat1dAgo: 0,
        ethFiat1dAgo: 100.0,
      },
      isLoadingAccount: false,
      tokenFiatBalancesCrossChains: [],
    };

    const mockedHook = jest.mocked(useSelectedAccountMultichainBalances);
    mockedHook.mockReturnValue({
      selectedAccountMultichainBalance:
        mockSelectedAccountMultichainBalanceZero,
    });

    const { getByTestId, queryByTestId } = renderPortfolioBalance(
      createStateWithFeatureFlag(true),
    );

    // Should render BalanceEmptyState instead of balance text
    expect(getByTestId('portfolio-balance-empty-state')).toBeDefined();
    expect(queryByTestId(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT)).toBeNull();
  });

  it('does not display BalanceEmptyState when balance is zero but feature flag is disabled', () => {
    // Mock zero balance
    const mockSelectedAccountMultichainBalanceZero = {
      displayBalance: '$0.00',
      displayCurrency: 'USD',
      totalFiatBalance: 0,
      totalNativeTokenBalance: '0',
      nativeTokenUnit: 'ETH',
      shouldShowAggregatedPercentage: false,
      isPortfolioViewEnabled: false,
      aggregatedBalance: {
        ethFiat: 123.45,
        tokenFiat: 0,
        tokenFiat1dAgo: 0,
        ethFiat1dAgo: 100.0,
      },
      isLoadingAccount: false,
      tokenFiatBalancesCrossChains: [],
    };

    const mockedHook = jest.mocked(useSelectedAccountMultichainBalances);
    mockedHook.mockReturnValue({
      selectedAccountMultichainBalance:
        mockSelectedAccountMultichainBalanceZero,
    });

    const { getByTestId, queryByTestId } = renderPortfolioBalance(
      createStateWithFeatureFlag(false),
    );

    // Should render balance text, not empty state
    expect(getByTestId(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT)).toBeTruthy();
    expect(queryByTestId('portfolio-balance-empty-state')).toBeNull();
  });

  it('displays loader when balance is not available', () => {
    // Mock undefined balance
    const mockedHook = jest.mocked(useSelectedAccountMultichainBalances);
    mockedHook.mockReturnValue({
      selectedAccountMultichainBalance: undefined,
    });

    const { queryByTestId } = renderPortfolioBalance();

    // Should not render balance text or empty state
    expect(queryByTestId(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT)).toBeNull();
    expect(queryByTestId('portfolio-balance-empty-state')).toBeNull();
  });
});

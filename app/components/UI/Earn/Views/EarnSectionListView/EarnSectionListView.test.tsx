import React from 'react';
import { EthAccountType } from '@metamask/keyring-api';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import {
  Pressable as MockPressable,
  Text as MockText,
  View as MockView,
} from 'react-native';
import type { Asset } from '@metamask/assets-controllers';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type EarnMoneyAccountRow from '../../../../Views/TrendingView/feeds/earn/EarnMoneyAccountRow';
import type EarnSearchAssetRow from '../../../../Views/TrendingView/feeds/earn/EarnSearchAssetRow';
import type PotentialEarningsTokenRow from '../../../Money/components/MoneyPotentialEarnings/PotentialEarningsTokenRow';
import type { MoneyDepositAsset } from '../../../Money/selectors/depositTokens';
import type {
  EarnAsset,
  EarnAssetId,
  EarnExperience,
} from '../../types/earnAssets';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import useEarnAssetCatalogue from '../../hooks/useEarnAssetCatalogue';
import useMoneyAccountBalance from '../../../Money/hooks/useMoneyAccountBalance';
import { useProjectedEarnings } from '../../../Money/hooks/useProjectedEarnings';
import { selectIsMoneyAccountVisible } from '../../../Money/selectors/visibility';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { MoneyPostOnboardingRedirectType } from '../../../Money/types/navigation';
import { EARN_SECTION_LIST_TEST_IDS } from './EarnSectionListView.testIds';
import EarnSectionListView from './EarnSectionListView';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockNavigateToMoneyHome = jest.fn();
const mockRedirectToOnboardingIfNeeded = jest.fn();
const mockInitiateDeposit = jest.fn();
const mockLoggerError = jest.fn();
const mockRefresh = jest.fn();
const mockRefetchMoneyAccountBalance = jest.fn();
const mockUseSelector = jest.mocked(useSelector);
const mockUseEarnAssetCatalogue = jest.mocked(useEarnAssetCatalogue);
const mockUseMoneyAccountBalance = jest.mocked(useMoneyAccountBalance);
const mockUseProjectedEarnings = jest.mocked(useProjectedEarnings);
const mockNavigateToEarnOpportunity = jest.fn();
const mockEarnMoneyAccountRow = jest.fn(
  ({
    item,
    onPress,
    privacyMode,
  }: React.ComponentProps<typeof EarnMoneyAccountRow>) => (
    <MockPressable
      testID="mock-earn-money-account-row"
      onPress={() => onPress(item)}
    >
      <MockText>{String(privacyMode)}</MockText>
    </MockPressable>
  ),
);
const mockEarnSearchAssetRow = jest.fn(
  ({
    item,
    onPress,
    privacyMode,
  }: React.ComponentProps<typeof EarnSearchAssetRow>) => (
    <MockPressable
      testID={`mock-earn-search-asset-row-${item.id}`}
      onPress={() => onPress(item)}
    >
      <MockText>{String(privacyMode)}</MockText>
    </MockPressable>
  ),
);
const mockPotentialEarningsTokenRow = jest.fn(
  ({
    token,
    onCardPress,
    onButtonPress,
    testID,
    privacyMode,
  }: React.ComponentProps<typeof PotentialEarningsTokenRow>) => (
    <MockView testID={testID}>
      <MockText>{token.symbol}</MockText>
      <MockText>{String(privacyMode)}</MockText>
      <MockPressable testID={`${testID}-card`} onPress={onCardPress} />
      <MockPressable testID={`${testID}-add`} onPress={onButtonPress} />
    </MockView>
  ),
);

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  })),
}));

jest.mock('../../hooks/useEarnAssetCatalogue', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../Money/hooks/useMoneyAccountBalance', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../Money/hooks/useMoneyAccount', () => ({
  useMoneyAccountDeposit: jest.fn(() => ({
    initiateDeposit: (...args: Parameters<typeof mockInitiateDeposit>) =>
      mockInitiateDeposit(...args),
  })),
}));

jest.mock('../../../Money/hooks/useProjectedEarnings', () => ({
  useProjectedEarnings: jest.fn(),
}));

jest.mock('../../hooks/useEarnOpportunityNavigation', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    navigateToEarnOpportunity: mockNavigateToEarnOpportunity,
  })),
}));

jest.mock('../../../Money/hooks/useMoneyNavigation', () => ({
  useMoneyNavigation: jest.fn(() => ({
    navigateToMoneyHome: (
      ...args: Parameters<typeof mockNavigateToMoneyHome>
    ) => mockNavigateToMoneyHome(...args),
  })),
  useMoneyOnboardingNavigation: jest.fn(() => ({
    redirectToOnboardingIfNeeded: (
      ...args: Parameters<typeof mockRedirectToOnboardingIfNeeded>
    ) => mockRedirectToOnboardingIfNeeded(...args),
  })),
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: (...args: Parameters<typeof mockLoggerError>) =>
      mockLoggerError(...args),
  },
}));

jest.mock(
  '../../../../Views/TrendingView/feeds/earn/EarnMoneyAccountRow',
  () => ({
    __esModule: true,
    default: (props: React.ComponentProps<typeof EarnMoneyAccountRow>) =>
      mockEarnMoneyAccountRow(props),
  }),
);

jest.mock(
  '../../../../Views/TrendingView/feeds/earn/EarnSearchAssetRow',
  () => ({
    __esModule: true,
    default: (props: React.ComponentProps<typeof EarnSearchAssetRow>) =>
      mockEarnSearchAssetRow(props),
  }),
);

jest.mock(
  '../../../Money/components/MoneyPotentialEarnings/PotentialEarningsTokenRow',
  () => ({
    __esModule: true,
    default: (props: React.ComponentProps<typeof PotentialEarningsTokenRow>) =>
      mockPotentialEarningsTokenRow(props),
  }),
);

jest.mock('@shopify/flash-list', () => ({
  FlashList: ({
    data,
    renderItem,
    ListEmptyComponent,
    ListHeaderComponent,
    testID,
  }: {
    data: readonly React.ComponentProps<typeof EarnSearchAssetRow>['item'][];
    renderItem: (info: {
      item: React.ComponentProps<typeof EarnSearchAssetRow>['item'];
      index: number;
    }) => React.ReactNode;
    ListEmptyComponent?: React.ReactNode;
    ListHeaderComponent?: React.ReactNode;
    testID?: string;
  }) => (
    <MockView testID={testID}>
      {ListHeaderComponent}
      {data.length === 0
        ? ListEmptyComponent
        : data.map((item, index) => (
            <MockView key={item.id}>{renderItem({ item, index })}</MockView>
          ))}
    </MockView>
  ),
}));

const createExperience = (
  type: EarnExperience['type'],
  percentage = 4.2,
): EarnExperience => ({
  id: `earn:${type}`,
  type,
  role: type === 'MONEY_ACCOUNT_DEPOSIT' ? 'funding' : 'underlying',
  rate: {
    type: 'APY',
    status: 'ready',
    percentage,
  },
  isFeeSubsidized: false,
});

const createHeldAsset = (
  symbol: string,
  index: number,
  experiences: readonly EarnExperience[],
  balance = 1,
): EarnAsset => {
  const address = `0x${index.toString(16).padStart(40, '0')}`;
  const asset = {
    accountType: EthAccountType.Eoa,
    accountId: 'account-id',
    assetId: address,
    address,
    chainId: '0x1',
    decimals: 6,
    image: `${symbol}.png`,
    name: `${symbol} Coin`,
    symbol,
    balance: String(balance),
    rawBalance: balance > 0 ? '0x1' : '0x0',
    fiat: {
      balance,
      currency: 'USD',
      conversionRate: 1,
    },
    isNative: false,
  } as Asset;

  return {
    kind: 'held',
    assetId: `eip155:1/erc20:${address}` as EarnAssetId,
    asset,
    experiences,
  };
};

const createDiscoveryAsset = (
  symbol: string,
  index: number,
  experienceType: EarnExperience['type'],
): EarnAsset => ({
  kind: 'discovery',
  assetId:
    `eip155:1/erc20:0x${index.toString(16).padStart(40, '0')}` as EarnAssetId,
  metadata: {
    address: `0x${index.toString(16).padStart(40, '0')}`,
    chainId: '0x1',
    decimals: 6,
    image: `${symbol}.png`,
    name: `${symbol} Coin`,
    symbol,
    logo: `${symbol}.png`,
    isETH: false,
  },
  experiences: [createExperience(experienceType)],
});

const createMoneyAssets = (count: number): EarnAsset[] =>
  Array.from({ length: count }, (_, index) =>
    createHeldAsset(
      `M${index + 1}`,
      index + 1,
      [createExperience('MONEY_ACCOUNT_DEPOSIT')],
      index % 2 === 0 ? index + 1 : count * 10 - index,
    ),
  );

const createCatalogueResult = (
  overrides: Partial<ReturnType<typeof useEarnAssetCatalogue>> = {},
) =>
  ({
    assets: [],
    assetsById: {},
    errors: [],
    hasError: false,
    isLoading: false,
    moneyApyPercent: 4.2,
    moneyRateStatus: 'ready',
    refresh: mockRefresh,
    ...overrides,
  }) as ReturnType<typeof useEarnAssetCatalogue>;

const createBalanceResult = (
  overrides: Partial<ReturnType<typeof useMoneyAccountBalance>> = {},
) =>
  ({
    totalFiatRaw: '0',
    totalFiatFormatted: '$0.00',
    isBalanceLoading: false,
    refetchBalance: mockRefetchMoneyAccountBalance,
    ...overrides,
  }) as ReturnType<typeof useMoneyAccountBalance>;

const createProjectionResult = (
  overrides: Partial<ReturnType<typeof useProjectedEarnings>> = {},
) =>
  ({
    eligibleTokens: [],
    totalAssetsFiat: 0,
    projectedAmount: 0,
    currency: 'USD',
    ...overrides,
  }) as ReturnType<typeof useProjectedEarnings>;

describe('EarnSectionListView', () => {
  let isMoneyAccountVisible = true;
  let privacyMode = false;

  beforeEach(() => {
    jest.clearAllMocks();
    isMoneyAccountVisible = true;
    privacyMode = false;
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectIsMoneyAccountVisible) {
        return isMoneyAccountVisible;
      }
      if (selector === selectPrivacyMode) {
        return privacyMode;
      }
      return undefined;
    });
    jest.mocked(useNavigation).mockReturnValue({
      goBack: mockGoBack,
      navigate: mockNavigate,
    } as ReturnType<typeof useNavigation>);
    mockUseEarnAssetCatalogue.mockReturnValue(createCatalogueResult());
    mockUseMoneyAccountBalance.mockReturnValue(createBalanceResult());
    mockUseProjectedEarnings.mockReturnValue(createProjectionResult());
    mockInitiateDeposit.mockResolvedValue(undefined);
    mockRedirectToOnboardingIfNeeded.mockReturnValue(false);
  });

  it('renders the header and shared subtitle in Money-hidden mode', () => {
    isMoneyAccountVisible = false;

    render(<EarnSectionListView />);

    expect(
      screen.getByTestId(EARN_SECTION_LIST_TEST_IDS.HEADER),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(EARN_SECTION_LIST_TEST_IDS.HEADER_BACK_BUTTON),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('earn_module.stake_or_lend_description')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(EARN_SECTION_LIST_TEST_IDS.MONEY_PROJECTION),
    ).toBeNull();
    expect(
      screen.queryByTestId(EARN_SECTION_LIST_TEST_IDS.MORE_WAYS_TITLE),
    ).toBeNull();
  });

  it('renders positive projection and More Ways content in Money-visible mode', () => {
    const moneyAsset = createHeldAsset('USDC', 1, [
      createExperience('MONEY_ACCOUNT_DEPOSIT'),
      createExperience(EARN_EXPERIENCES.STABLECOIN_LENDING),
    ]);
    mockUseEarnAssetCatalogue.mockReturnValue(
      createCatalogueResult({ assets: [moneyAsset] }),
    );
    mockUseProjectedEarnings.mockReturnValue(
      createProjectionResult({ totalAssetsFiat: 100, projectedAmount: 4.2 }),
    );

    render(<EarnSectionListView />);

    expect(
      screen.getByTestId(EARN_SECTION_LIST_TEST_IDS.MONEY_PROJECTION),
    ).toHaveTextContent(/\$100\.00/);
    expect(
      screen.getByTestId(EARN_SECTION_LIST_TEST_IDS.MONEY_PROJECTION),
    ).toHaveTextContent(/\+\$4\.20/);
    expect(
      screen.getByTestId(EARN_SECTION_LIST_TEST_IDS.MORE_WAYS_TITLE),
    ).toHaveTextContent(strings('earn_module.more_ways_to_earn'));
    expect(
      screen.getByTestId(EARN_SECTION_LIST_TEST_IDS.MORE_WAYS_SUBTITLE),
    ).toHaveTextContent(strings('earn_module.stake_or_lend_description'));
    expect(
      screen.getByTestId(EARN_SECTION_LIST_TEST_IDS.DIVIDER),
    ).toBeOnTheScreen();
  });

  it('caps Money rows at five and projects all derived Money assets in ranked order', () => {
    const moneyAssets = createMoneyAssets(6);
    const catalogueSymbols = moneyAssets.map((asset) =>
      asset.kind === 'held' ? asset.asset.symbol : '',
    );
    const rankedSymbols = ['M2', 'M4', 'M6', 'M5', 'M3', 'M1'];
    mockUseEarnAssetCatalogue.mockReturnValue(
      createCatalogueResult({ assets: moneyAssets }),
    );

    render(<EarnSectionListView />);

    const projectionCall =
      mockUseProjectedEarnings.mock.calls[
        mockUseProjectedEarnings.mock.calls.length - 1
      ];
    if (!projectionCall) {
      throw new Error('Expected useProjectedEarnings to be called');
    }
    const projectedAssets = projectionCall[0];
    if (!projectedAssets) {
      throw new Error('Expected Money assets to be projected');
    }
    expect(projectedAssets).toHaveLength(6);
    expect(catalogueSymbols).toEqual(['M1', 'M2', 'M3', 'M4', 'M5', 'M6']);
    expect(projectedAssets.map((asset) => asset.symbol)).toEqual(rankedSymbols);
    expect(projectionCall[1]).toBe(0.042);
    expect(mockPotentialEarningsTokenRow).toHaveBeenCalledTimes(5);
    expect(
      mockPotentialEarningsTokenRow.mock.calls.map(
        ([props]) => props.token.symbol,
      ),
    ).toEqual(rankedSymbols.slice(0, 5));
    expect(
      screen.getByTestId(EARN_SECTION_LIST_TEST_IDS.MONEY_VIEW_ALL),
    ).toBeOnTheScreen();
  });

  it('filters hidden-mode rows to supported non-Money experiences', () => {
    isMoneyAccountVisible = false;
    const stablecoin = createHeldAsset('USDC', 1, [
      createExperience(EARN_EXPERIENCES.STABLECOIN_LENDING),
    ]);
    const pooled = createDiscoveryAsset(
      'ETH',
      2,
      EARN_EXPERIENCES.POOLED_STAKING,
    );
    const trx = createDiscoveryAsset('TRX', 3, EARN_EXPERIENCES.TRX_STAKING);
    const moneyOnly = createHeldAsset('MUSD', 4, [
      createExperience('MONEY_ACCOUNT_DEPOSIT'),
    ]);
    const unsupported = createDiscoveryAsset(
      'OTHER',
      5,
      'UNSUPPORTED' as EARN_EXPERIENCES,
    );
    mockUseEarnAssetCatalogue.mockReturnValue(
      createCatalogueResult({
        assets: [unsupported, moneyOnly, trx, pooled, stablecoin],
      }),
    );

    render(<EarnSectionListView />);

    expect(mockEarnSearchAssetRow).toHaveBeenCalledTimes(3);
    expect(
      mockEarnSearchAssetRow.mock.calls.map(([props]) => props.item.id),
    ).toEqual(
      expect.arrayContaining([stablecoin.assetId, pooled.assetId, trx.assetId]),
    );
    expect(
      mockEarnSearchAssetRow.mock.calls.map(([props]) => props.item.id),
    ).not.toEqual(
      expect.arrayContaining([moneyOnly.assetId, unsupported.assetId]),
    );
  });

  it('passes privacy mode to Money, projection, token, and More Ways children', () => {
    privacyMode = true;
    const moneyAsset = createHeldAsset('USDC', 1, [
      createExperience('MONEY_ACCOUNT_DEPOSIT'),
      createExperience(EARN_EXPERIENCES.STABLECOIN_LENDING),
    ]);
    mockUseEarnAssetCatalogue.mockReturnValue(
      createCatalogueResult({ assets: [moneyAsset] }),
    );
    mockUseProjectedEarnings.mockReturnValue(
      createProjectionResult({ totalAssetsFiat: 100, projectedAmount: 4.2 }),
    );

    render(<EarnSectionListView />);

    expect(mockEarnMoneyAccountRow.mock.calls[0][0].privacyMode).toBe(true);
    expect(mockEarnSearchAssetRow.mock.calls[0][0].privacyMode).toBe(true);
    expect(mockPotentialEarningsTokenRow.mock.calls[0][0].privacyMode).toBe(
      true,
    );
    expect(
      screen.getByTestId(EARN_SECTION_LIST_TEST_IDS.MONEY_PROJECTION_TOTAL),
    ).toHaveTextContent('•'.repeat(9));
    expect(
      screen.getByTestId(EARN_SECTION_LIST_TEST_IDS.MONEY_PROJECTION_PROJECTED),
    ).toHaveTextContent('•'.repeat(6));
  });

  it('keeps navigation visible and delays More Ways content while loading', () => {
    mockUseEarnAssetCatalogue.mockReturnValue(
      createCatalogueResult({ isLoading: true, moneyRateStatus: 'loading' }),
    );

    render(<EarnSectionListView />);

    expect(
      screen.getByTestId(EARN_SECTION_LIST_TEST_IDS.HEADER),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(EARN_SECTION_LIST_TEST_IDS.LIST_LOADING),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(EARN_SECTION_LIST_TEST_IDS.MONEY_PROJECTION_SKELTON),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(EARN_SECTION_LIST_TEST_IDS.MORE_WAYS_TITLE),
    ).toBeNull();
    expect(mockEarnSearchAssetRow).not.toHaveBeenCalled();
  });

  it('renders a warning with partial rows and guards duplicate retries', async () => {
    const partialAsset = createDiscoveryAsset(
      'USDC',
      1,
      EARN_EXPERIENCES.STABLECOIN_LENDING,
    );
    mockUseEarnAssetCatalogue.mockReturnValue(
      createCatalogueResult({ assets: [partialAsset], hasError: true }),
    );
    mockRefresh.mockResolvedValue(undefined);
    mockRefetchMoneyAccountBalance.mockResolvedValue(undefined);

    render(<EarnSectionListView />);

    expect(
      screen.getByTestId(EARN_SECTION_LIST_TEST_IDS.ERROR),
    ).toBeOnTheScreen();
    expect(mockEarnSearchAssetRow).toHaveBeenCalledTimes(1);

    const retryButton = screen.getByTestId(
      EARN_SECTION_LIST_TEST_IDS.ERROR_RETRY,
    );
    await act(async () => {
      fireEvent.press(retryButton);
      fireEvent.press(retryButton);
      await Promise.resolve();
    });

    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(mockRefetchMoneyAccountBalance).toHaveBeenCalledTimes(1);
  });

  it('renders the genuine empty-state copy when no eligible assets exist', () => {
    isMoneyAccountVisible = false;

    render(<EarnSectionListView />);

    expect(
      screen.getByTestId(EARN_SECTION_LIST_TEST_IDS.EMPTY),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('earn_module.empty_state_description')),
    ).toBeOnTheScreen();
  });

  it('navigates back, to Money, and to View all', () => {
    const moneyAssets = createMoneyAssets(6);
    mockUseEarnAssetCatalogue.mockReturnValue(
      createCatalogueResult({ assets: moneyAssets }),
    );

    render(<EarnSectionListView />);

    fireEvent.press(
      screen.getByTestId(EARN_SECTION_LIST_TEST_IDS.HEADER_BACK_BUTTON),
    );
    fireEvent.press(screen.getByTestId('mock-earn-money-account-row'));
    fireEvent.press(
      screen.getByTestId(EARN_SECTION_LIST_TEST_IDS.MONEY_VIEW_ALL),
    );

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockNavigateToMoneyHome).toHaveBeenCalledWith({ pop: false });
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.POTENTIAL_EARNINGS);
  });

  it('initiates deposits from both token card and Add callbacks', async () => {
    const [moneyAsset] = createMoneyAssets(1);
    mockUseEarnAssetCatalogue.mockReturnValue(
      createCatalogueResult({ assets: [moneyAsset] }),
    );
    const token =
      moneyAsset.kind === 'held'
        ? (moneyAsset.asset as MoneyDepositAsset)
        : undefined;
    if (!token) {
      throw new Error('Expected held Money asset fixture');
    }

    render(<EarnSectionListView />);

    await fireEvent.press(
      screen.getByTestId(
        `${EARN_SECTION_LIST_TEST_IDS.MONEY_TOKEN_ROW(0)}-card`,
      ),
    );
    await fireEvent.press(
      screen.getByTestId(
        `${EARN_SECTION_LIST_TEST_IDS.MONEY_TOKEN_ROW(0)}-add`,
      ),
    );

    const expectedOptions = {
      preferredPaymentToken: {
        address: token.address,
        chainId: token.chainId,
      },
    };
    expect(mockInitiateDeposit).toHaveBeenNthCalledWith(1, expectedOptions);
    expect(mockInitiateDeposit).toHaveBeenNthCalledWith(2, expectedOptions);
  });

  it('redirects to Money onboarding without initiating a deposit', async () => {
    const [moneyAsset] = createMoneyAssets(1);
    mockUseEarnAssetCatalogue.mockReturnValue(
      createCatalogueResult({ assets: [moneyAsset] }),
    );
    mockRedirectToOnboardingIfNeeded.mockReturnValue(true);

    render(<EarnSectionListView />);

    await fireEvent.press(
      screen.getByTestId(
        `${EARN_SECTION_LIST_TEST_IDS.MONEY_TOKEN_ROW(0)}-add`,
      ),
    );

    expect(mockRedirectToOnboardingIfNeeded).toHaveBeenCalledWith({
      postOnboardingRedirect: {
        type: MoneyPostOnboardingRedirectType.DEPOSIT,
        preferredPaymentToken: expect.objectContaining({
          chainId: '0x1',
        }),
      },
    });
    expect(mockInitiateDeposit).not.toHaveBeenCalled();
  });

  it('logs deposit initiation failures', async () => {
    const [moneyAsset] = createMoneyAssets(1);
    mockUseEarnAssetCatalogue.mockReturnValue(
      createCatalogueResult({ assets: [moneyAsset] }),
    );
    mockInitiateDeposit.mockRejectedValueOnce(new Error('deposit failed'));

    render(<EarnSectionListView />);

    await fireEvent.press(
      screen.getByTestId(
        `${EARN_SECTION_LIST_TEST_IDS.MONEY_TOKEN_ROW(0)}-add`,
      ),
    );

    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.any(Error),
      '[EarnSectionListView] Failed to initiate deposit',
    );
  });

  it('routes Earn asset presses through opportunity navigation', () => {
    isMoneyAccountVisible = false;
    const asset = createDiscoveryAsset(
      'USDC',
      1,
      EARN_EXPERIENCES.STABLECOIN_LENDING,
    );
    mockUseEarnAssetCatalogue.mockReturnValue(
      createCatalogueResult({ assets: [asset] }),
    );

    render(<EarnSectionListView />);

    fireEvent.press(
      screen.getByTestId(`mock-earn-search-asset-row-${asset.assetId}`),
    );

    expect(mockNavigateToEarnOpportunity).toHaveBeenCalledWith(
      expect.objectContaining({ assetId: asset.assetId }),
    );
  });

  it('uses the existing back handler from the replacement header', () => {
    render(<EarnSectionListView />);

    fireEvent.press(
      screen.getByTestId(EARN_SECTION_LIST_TEST_IDS.HEADER_BACK_BUTTON),
    );

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('renders fallback projection copy when projection data is unavailable', () => {
    render(<EarnSectionListView />);

    expect(
      screen.getByText(strings('earn_module.money_fallback_description')),
    ).toBeOnTheScreen();
  });
});

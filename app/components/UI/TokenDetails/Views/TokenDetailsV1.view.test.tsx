import '../../../../../tests/component-view/mocks';
import type { QuoteTokensResponse } from '@metamask/social-controllers';
import type { CaipAssetType } from '@metamask/utils';
// eslint-disable-next-line import-x/no-extraneous-dependencies
import nock from 'nock';
import { Linking } from 'react-native';
import {
  __resetMockNetInfo,
  __setMockNetInfo,
} from '../../../../__mocks__/@react-native-community/netinfo';
import {
  act,
  fireEvent,
  userEvent,
  waitFor,
  within,
} from '@testing-library/react-native';

import { renderTokenDetailsV1View } from '../../../../../tests/component-view/renderers/tokenDetailsV1';
import { installDefaultApiMocks } from '../../../../../tests/component-view/api-mocking/defaults';
import { TOKEN_API_BASE_URL } from '../../Assets/watchlist/utils/getTokens';
import { createStateFixture } from '../../../../../tests/component-view/stateFixture';
import { CV_SOCIAL_PROFILE } from '../../../../../tests/component-view/presets/socialLeaderboard';
import {
  clearQuickBuyApiMocks,
  setupQuickBuyApiMock,
} from '../../../../../tests/component-view/api-mocking/quickBuy';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
import {
  buildTokenDetailsV1RouteParams,
  clearTokenDetailsV1ApiMocks,
  tokenDetailsV1SecurityData,
  setupTokenDetailsV1ApiMocks,
  TOKEN_DETAILS_V1_ADDRESS,
  TOKEN_DETAILS_V1_ASSET_ID,
  TOKEN_DETAILS_V1_AGE_LABEL,
  TOKEN_DETAILS_V1_DESCRIPTION,
  TOKEN_DETAILS_V1_HOLDER_NAMES,
  tokenDetailsV1ClosedHolder,
  tokenDetailsV1OpenHolders,
} from '../../../../../tests/component-view/api-mocking/tokenDetailsV1';
import { strings } from '../../../../../locales/i18n';
import {
  clearLeaderboardApiMock,
  setupLeaderboardApiMock,
} from '../../../../../tests/component-view/api-mocking/socialLeaderboard';
import ClipboardManager from '../../../../core/ClipboardManager';
import { TokenOverviewSelectorsIDs } from '../../AssetOverview/TokenOverview.testIds';
import { TokenDetailsIds } from '../testIds';
import { ActivitiesViewSelectorsIDs } from '../../../Views/ActivityView/ActivitiesView.testIds';
import { StatBarSelectors } from '../components/V1/StatBar/StatBar.testIds';
import { STAT_EXPLAINER_KEYS, TokenStatKey } from '../constants/tokenStats';
import { EXPLAINER_KEYS_BY_ROW } from '../components/V1/SecurityTab/SecurityTab.constants';
import { SecurityPillSelectors } from '../components/V1/SecurityPill/SecurityPill.testIds';
import { SecuritySocialSectionSelectors } from '../components/V1/SecuritySocialSection/SecuritySocialSection.testIds';
import { SecurityTabSelectors } from '../components/V1/SecurityTab/SecurityTab.testIds';
import { ContractCheckKey } from '../components/V1/SecurityTab/SecurityTab.types';
import { TokenExplainerSheetSelectors } from '../components/V1/TokenExplainerSheet/TokenExplainerSheet.testIds';
import { ContractSecuritySelectors } from '../components/V1/ContractSecurityScreen/ContractSecurityScreen.testIds';
import {
  formatAbbreviatedUsd,
  formatFollowerCountLabel,
  formatPercent,
} from '../../SocialFeed/utils/formatters';
import { mockSpotFeedItem } from '../../SocialFeed/mocks/coreFeed.mock';
import { QuickBuySheetSelectorsIDs } from '../../QuickBuy/QuickBuySheet.testIds';
import {
  acceptSocialTerms,
  resetSocialTermsAcceptance,
} from '../../../Views/SocialLeaderboard/terms/socialTermsAcceptance';
import { formatAddress, toChecksumAddress } from '../../../../util/address';

const SOLANA_MAINNET = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
const USDC = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const WETH = 'eip155:1/erc20:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
const QUOTE_TOKENS: QuoteTokensResponse = {
  natives: ['eip155:1/slip44:60', WETH, `${SOLANA_MAINNET}/slip44:501`],
  stablecoins: [USDC],
};

const serveQuoteTokens = (
  response: Promise<QuoteTokensResponse>,
  options?: Parameters<typeof setupLeaderboardApiMock>[0],
): jest.SpyInstance => {
  const messenger = setupLeaderboardApiMock(options);
  const delegate = messenger.getMockImplementation();
  messenger.mockImplementation((action: string, ...args: unknown[]) =>
    action === 'SocialService:fetchQuoteTokens'
      ? response
      : delegate?.(action, ...args),
  );
  return messenger;
};

const FIND_TIMEOUT = { timeout: 15000 };
const OVERVIEW_TAB_DESCRIPTION_TEST_ID = TokenDetailsIds.overview.description;
const OVERVIEW_TAB_PERFORMANCE_TEST_ID = TokenDetailsIds.overview.performance;
const TokenHolderRowSelectorsIDs = TokenDetailsIds.holderRow;
const getTokenDetailsV1TabTestId = TokenDetailsIds.tab;
const TOKEN_DETAILS_V1_AGE_CHIP_TEST_ID = TokenDetailsIds.ageChip;
const TOKEN_DETAILS_V1_TEST_ID = TokenDetailsIds.v1;
const tokenDetailsV1TabPageTestId = TokenDetailsIds.tabPage;
const TOKEN_DETAILS_PAGE_PENDING_TEST_ID = TokenDetailsIds.pending;

const STAT_VALUES: [TokenStatKey, string][] = [
  [TokenStatKey.MarketCap, '$12.4M'],
  [TokenStatKey.Liquidity, '$1.2M'],
  [TokenStatKey.Volume24h, '$3.2M'],
  [TokenStatKey.Holders, '8.4K'],
  [TokenStatKey.Top10, '18.4%'],
  [TokenStatKey.LiquidityToMarketCap, '10.00%'],
  [TokenStatKey.Tax, '1% / 2%'],
  [TokenStatKey.HighLow24h, '$2.50 / $1.10'],
  [TokenStatKey.CirculatingSupply, '420.0M'],
];

const CHECK_VALUES: [ContractCheckKey, 'pass' | 'fail'][] = [
  [ContractCheckKey.NoHoneypot, 'pass'],
  [ContractCheckKey.ContractVerified, 'pass'],
  [ContractCheckKey.Renounced, 'pass'],
  [ContractCheckKey.NoBlacklist, 'fail'],
  [ContractCheckKey.IsMintable, 'pass'],
];

const expectCheckValues = (
  getByTestId: (testId: string) => unknown,
  rowValue: (key: ContractCheckKey) => string,
) => {
  CHECK_VALUES.forEach(([key, outcome]) => {
    expect(getByTestId(rowValue(key))).toHaveTextContent(
      strings(`token_details_v1.security_tab.check_values.${key}.${outcome}`),
    );
  });
};

describeForPlatforms('TokenDetailsV1', () => {
  let clipboardSpy: jest.SpiedFunction<typeof ClipboardManager.setString>;
  let openUrlSpy: jest.SpiedFunction<typeof Linking.openURL>;

  beforeEach(() => {
    setupTokenDetailsV1ApiMocks();
    clipboardSpy = jest
      .spyOn(ClipboardManager, 'setString')
      .mockResolvedValue(undefined);
    openUrlSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  afterEach(() => {
    clipboardSpy.mockRestore();
    openUrlSpy.mockRestore();
    clearLeaderboardApiMock();
    clearTokenDetailsV1ApiMocks();
  });

  it('fills the launchpad page from the asset, security and price APIs', async () => {
    const { findByTestId, getByTestId } = renderTokenDetailsV1View();

    expect(
      await findByTestId(
        StatBarSelectors.value(TokenStatKey.MarketCap),
        {},
        FIND_TIMEOUT,
      ),
    ).toHaveTextContent('$12.4M');

    expect(getByTestId(TOKEN_DETAILS_V1_TEST_ID)).toBeOnTheScreen();
    expect(
      within(getByTestId(TOKEN_DETAILS_V1_AGE_CHIP_TEST_ID)).getByText(
        TOKEN_DETAILS_V1_AGE_LABEL,
      ),
    ).toBeOnTheScreen();
    expect(getByTestId(SecurityPillSelectors.VERDICT)).toHaveTextContent(
      strings('token_details_v1.security_pill.screened'),
    );
    STAT_VALUES.forEach(([key, text]) => {
      expect(getByTestId(StatBarSelectors.value(key))).toHaveTextContent(text);
    });
    expect(
      getByTestId(SecuritySocialSectionSelectors.LINK_X),
    ).toBeOnTheScreen();
    expect(
      getByTestId(SecuritySocialSectionSelectors.LINK_WEBSITE),
    ).toBeOnTheScreen();
    expect(
      getByTestId(SecuritySocialSectionSelectors.LINK_TELEGRAM),
    ).toBeOnTheScreen();
    expect(
      getByTestId(SecuritySocialSectionSelectors.COPY_ADDRESS),
    ).toHaveTextContent(
      formatAddress(toChecksumAddress(TOKEN_DETAILS_V1_ADDRESS), 'short'),
    );
    expect(
      within(getByTestId(OVERVIEW_TAB_DESCRIPTION_TEST_ID)).getByText(
        TOKEN_DETAILS_V1_DESCRIPTION,
      ),
    ).toBeOnTheScreen();
    const performance = within(getByTestId(OVERVIEW_TAB_PERFORMANCE_TEST_ID));
    expect(performance.getByText('+1.25%')).toBeOnTheScreen();
    expect(performance.getByText('-0.50%')).toBeOnTheScreen();
    expect(performance.getByText('+3.00%')).toBeOnTheScreen();
    expect(performance.getByText('+12.50%')).toBeOnTheScreen();
  });

  it('opens Security from the verdict and shows Blockaid checks, ignoring pool holders', async () => {
    const { findByTestId, getByTestId, queryByTestId } =
      renderTokenDetailsV1View();

    await userEvent.press(
      await findByTestId(SecurityPillSelectors.PILL, {}, FIND_TIMEOUT),
    );

    expect(
      await findByTestId(SecurityTabSelectors.TAB, {}, FIND_TIMEOUT),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(tokenDetailsV1TabPageTestId('overview')),
    ).not.toBeOnTheScreen();
    expectCheckValues(getByTestId, SecurityTabSelectors.rowValue);
    expect(getByTestId(SecurityTabSelectors.RISK_BANNER)).toHaveTextContent(
      strings('token_details_v1.security_tab.risk_banner', { count: 1 }),
    );
    expect(getByTestId(SecurityTabSelectors.LEGEND_TOP_TEN)).toHaveTextContent(
      `${strings('token_details_v1.security_tab.holders.top_ten')} 18.4%`,
    );
    expect(
      getByTestId(SecurityTabSelectors.LEGEND_REMAINING),
    ).toHaveTextContent(
      `${strings('token_details_v1.security_tab.holders.remaining')} 81.6%`,
    );
    expect(
      getByTestId(SecurityTabSelectors.rowValue(TokenStatKey.PrimaryPool)),
    ).toHaveTextContent('Uniswap · PEPE/WETH');
    expect(
      getByTestId(SecurityTabSelectors.rowValue(TokenStatKey.VolumeFlags)),
    ).toHaveTextContent(
      strings('token_details_v1.security_tab.values.none_detected'),
    );
    expect(
      getByTestId(SecurityTabSelectors.rowValue(TokenStatKey.ListedOnExchange)),
    ).toHaveTextContent(strings('token_details_v1.security_tab.values.yes'));
    expect(
      getByTestId(SecurityTabSelectors.rowValue(TokenStatKey.LpBurnedLocked)),
    ).toHaveTextContent('40.0%');
    expect(
      getByTestId(SecurityTabSelectors.rowValue(TokenStatKey.Created)),
    ).toHaveTextContent('Sep 26, 2026');
    expect(
      getByTestId(SecurityTabSelectors.rowValue(TokenStatKey.Holders)),
    ).toHaveTextContent('8.4K');

    await userEvent.press(
      getByTestId(SecurityTabSelectors.rowLabel(ContractCheckKey.NoHoneypot)),
    );

    expect(
      await findByTestId(TokenExplainerSheetSelectors.TITLE),
    ).toHaveTextContent(
      strings(EXPLAINER_KEYS_BY_ROW[ContractCheckKey.NoHoneypot].title),
    );
    expect(
      getByTestId(TokenExplainerSheetSelectors.DESCRIPTION),
    ).toHaveTextContent(
      strings(EXPLAINER_KEYS_BY_ROW[ContractCheckKey.NoHoneypot].description),
    );

    await userEvent.press(
      getByTestId(TokenExplainerSheetSelectors.GOT_IT_BUTTON),
    );

    await waitFor(() => {
      expect(
        queryByTestId(TokenExplainerSheetSelectors.SHEET),
      ).not.toBeOnTheScreen();
    });
  });

  it('opens the age and market-cap explainers and dismisses each one', async () => {
    const { findByTestId, getByTestId, queryByTestId } =
      renderTokenDetailsV1View();

    await userEvent.press(
      await findByTestId(TOKEN_DETAILS_V1_AGE_CHIP_TEST_ID, {}, FIND_TIMEOUT),
    );

    expect(
      await findByTestId(TokenExplainerSheetSelectors.TITLE),
    ).toHaveTextContent(strings('token_details_v1.age.explainer.title'));
    expect(
      getByTestId(TokenExplainerSheetSelectors.DESCRIPTION),
    ).toHaveTextContent(strings('token_details_v1.age.explainer.description'));

    await userEvent.press(
      getByTestId(TokenExplainerSheetSelectors.GOT_IT_BUTTON),
    );

    await waitFor(() => {
      expect(
        queryByTestId(TokenExplainerSheetSelectors.SHEET),
      ).not.toBeOnTheScreen();
    });

    await userEvent.press(
      getByTestId(StatBarSelectors.label(TokenStatKey.MarketCap)),
    );

    expect(
      await findByTestId(TokenExplainerSheetSelectors.TITLE),
    ).toHaveTextContent(
      strings(STAT_EXPLAINER_KEYS[TokenStatKey.MarketCap].title),
    );

    await userEvent.press(
      getByTestId(TokenExplainerSheetSelectors.GOT_IT_BUTTON),
    );

    await waitFor(() => {
      expect(
        queryByTestId(TokenExplainerSheetSelectors.SHEET),
      ).not.toBeOnTheScreen();
    });
  });

  it('opens contract security from the Contract heading and returns', async () => {
    const { findByTestId, getByTestId, queryByTestId } =
      renderTokenDetailsV1View();

    await userEvent.press(
      await findByTestId(SecurityPillSelectors.PILL, {}, FIND_TIMEOUT),
    );
    await userEvent.press(
      await findByTestId(SecurityTabSelectors.CONTRACT_DETAILS_LINK),
    );

    expect(
      await findByTestId(ContractSecuritySelectors.SCREEN, {}, FIND_TIMEOUT),
    ).toBeOnTheScreen();
    expect(getByTestId(ContractSecuritySelectors.TITLE)).toHaveTextContent(
      strings('token_details_v1.contract_security.title'),
    );
    expectCheckValues(getByTestId, ContractSecuritySelectors.rowValue);
    expect(
      getByTestId(ContractSecuritySelectors.riskTitle('low_liquidity_risk')),
    ).toHaveTextContent(
      strings('token_details_v1.security_tab.risks.low_liquidity_risk.title'),
    );

    await userEvent.press(getByTestId(ContractSecuritySelectors.BACK_BUTTON));

    await waitFor(() => {
      expect(
        queryByTestId(ContractSecuritySelectors.SCREEN),
      ).not.toBeOnTheScreen();
    });
    expect(getByTestId(SecurityTabSelectors.TAB)).toBeOnTheScreen();
  });

  it('copies the full contract address and opens the X profile', async () => {
    const { findByTestId, getByTestId } = renderTokenDetailsV1View();

    await userEvent.press(
      await findByTestId(
        SecuritySocialSectionSelectors.COPY_ADDRESS,
        {},
        FIND_TIMEOUT,
      ),
    );

    await waitFor(() => {
      expect(clipboardSpy).toHaveBeenCalledWith(
        toChecksumAddress(TOKEN_DETAILS_V1_ADDRESS),
      );
    });
    expect(
      await findByTestId(SecuritySocialSectionSelectors.COPY_ADDRESS),
    ).toBeOnTheScreen();

    await userEvent.press(getByTestId(SecuritySocialSectionSelectors.LINK_X));

    await waitFor(() => {
      expect(openUrlSpy).toHaveBeenCalledWith('https://x.com/pepecoin');
    });
  });

  it('leaves the verdict as text when Security is not in the tab config', async () => {
    const { getByTestId, queryByTestId } = renderTokenDetailsV1View({
      tabConfigOrder: ['overview'],
    });

    await waitFor(() => {
      expect(getByTestId(SecurityPillSelectors.VERDICT)).toHaveTextContent(
        strings('token_details_v1.security_pill.screened'),
      );
    }, FIND_TIMEOUT);

    await userEvent.press(getByTestId(SecurityPillSelectors.VERDICT));

    expect(queryByTestId(SecurityPillSelectors.PILL)).not.toBeOnTheScreen();
    expect(
      queryByTestId(getTokenDetailsV1TabTestId('security')),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(getTokenDetailsV1TabTestId('feed')),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(getTokenDetailsV1TabTestId('holders')),
    ).not.toBeOnTheScreen();
    expect(
      getByTestId(getTokenDetailsV1TabTestId('overview')),
    ).toBeOnTheScreen();
    expect(
      getByTestId(tokenDetailsV1TabPageTestId('overview')),
    ).toBeOnTheScreen();
  });

  it('hides the contract address from the header while showing it in the security row', async () => {
    const { findByTestId, queryByTestId } = renderTokenDetailsV1View();

    // Wait for the security row address to appear — proves the page has loaded.
    const copyButton = await findByTestId(
      SecuritySocialSectionSelectors.COPY_ADDRESS,
      {},
      FIND_TIMEOUT,
    );

    expect(copyButton).toHaveTextContent(
      formatAddress(toChecksumAddress(TOKEN_DETAILS_V1_ADDRESS), 'short'),
    );

    // The header subtitle must NOT contain the address or copy button — it was
    // deduplicated so the address only appears in the security row above the
    // stat bar.
    expect(queryByTestId(TokenDetailsIds.header.address)).toBeNull();
    expect(queryByTestId(TokenDetailsIds.header.copyAddressButton)).toBeNull();
  });

  it('shows price and chart skeletons, not a grey box, while the page variant is pending', async () => {
    const { getByTestId, findByTestId } = renderTokenDetailsV1View();

    const pending = within(getByTestId(TOKEN_DETAILS_PAGE_PENDING_TEST_ID));

    expect(pending.getByTestId('loading-price-diff')).toBeOnTheScreen();
    expect(pending.getByTestId('chart-line-skeleton')).toBeOnTheScreen();
    expect(pending.getByText('1D')).toBeOnTheScreen();
    expect(
      pending.getByTestId('token-details-pending-body-skeleton'),
    ).toBeOnTheScreen();
    expect(
      await findByTestId(TOKEN_DETAILS_V1_TEST_ID, {}, FIND_TIMEOUT),
    ).toBeOnTheScreen();
  });

  it('stays on the legacy page when the asset has no launchpad data', async () => {
    setupTokenDetailsV1ApiMocks({ launchpad: false });
    const { findByTestId, queryByTestId } = renderTokenDetailsV1View();

    expect(
      await findByTestId(TokenOverviewSelectorsIDs.CONTAINER, {}, FIND_TIMEOUT),
    ).toBeOnTheScreen();

    expect(queryByTestId(TOKEN_DETAILS_V1_TEST_ID)).not.toBeOnTheScreen();
    expect(
      queryByTestId(TOKEN_DETAILS_PAGE_PENDING_TEST_ID),
    ).not.toBeOnTheScreen();
  });

  it('switches standard tabs from the pinned bar using prefetched security data', async () => {
    setupTokenDetailsV1ApiMocks({ launchpad: false, security: false });
    const { findByTestId, getByTestId, queryByTestId } =
      renderTokenDetailsV1View({
        tabConfigOrder: ['overview'],
        token: {
          ...buildTokenDetailsV1RouteParams(),
          securityData: tokenDetailsV1SecurityData,
        },
      });

    const slot = await findByTestId(
      TokenDetailsIds.tabBarSlot,
      {},
      FIND_TIMEOUT,
    );
    expect(getByTestId(TokenDetailsIds.tabPage('overview'))).toBeOnTheScreen();
    expect(queryByTestId(TokenDetailsIds.tab('feed'))).not.toBeOnTheScreen();
    expect(queryByTestId(TokenDetailsIds.tab('holders'))).not.toBeOnTheScreen();
    expect(queryByTestId(StatBarSelectors.BAR)).not.toBeOnTheScreen();

    fireEvent(slot, 'layout', {
      nativeEvent: { layout: { x: 0, y: 420, width: 390, height: 48 } },
    });
    fireEvent.scroll(getByTestId(ActivitiesViewSelectorsIDs.CONTAINER), {
      nativeEvent: { contentOffset: { y: 420 } },
    });
    await userEvent.press(getByTestId(TokenDetailsIds.pinnedTab('security')));

    expect(getByTestId(SecurityTabSelectors.TAB)).toBeOnTheScreen();
    expect(
      queryByTestId(TokenDetailsIds.tabPage('overview')),
    ).not.toBeOnTheScreen();
    expectCheckValues(getByTestId, SecurityTabSelectors.rowValue);

    await userEvent.press(
      getByTestId(SecurityTabSelectors.CONTRACT_DETAILS_LINK),
    );
    expect(
      await findByTestId(ContractSecuritySelectors.SCREEN),
    ).toBeOnTheScreen();
    expectCheckValues(getByTestId, ContractSecuritySelectors.rowValue);
  });

  it('keeps the configured order of the standard tabs', async () => {
    setupTokenDetailsV1ApiMocks({ launchpad: false });
    const { findByTestId } = renderTokenDetailsV1View({
      tabConfigOrder: ['holders', 'security'],
    });

    expect(
      await findByTestId(SecurityTabSelectors.TAB, {}, FIND_TIMEOUT),
    ).toBeOnTheScreen();
    expect(
      await findByTestId(TokenDetailsIds.tab('overview')),
    ).toBeOnTheScreen();
  });

  it('keeps the standard social tabs hidden when Social V1 is off', async () => {
    setupTokenDetailsV1ApiMocks({ launchpad: false });
    const { findByTestId, getByTestId, queryByTestId } =
      renderTokenDetailsV1View({
        tabConfigOrder: ['feed', 'holders'],
        token: {
          ...buildTokenDetailsV1RouteParams(),
          securityData: tokenDetailsV1SecurityData,
        },
      });

    const security = await findByTestId(TokenDetailsIds.tab('security'));
    await userEvent.press(security);

    expect(queryByTestId(TokenDetailsIds.tab('feed'))).not.toBeOnTheScreen();
    expect(queryByTestId(TokenDetailsIds.tab('holders'))).not.toBeOnTheScreen();
    expect(getByTestId(TokenDetailsIds.tab('overview'))).toBeOnTheScreen();
    expect(getByTestId(SecurityTabSelectors.TAB)).toBeOnTheScreen();
  });

  it('lands on configured Holders and shows the same Top 10 as Security', async () => {
    setupTokenDetailsV1ApiMocks({ launchpad: false });
    const { findByTestId, getByTestId, getAllByTestId, queryByTestId } =
      renderTokenDetailsV1View({
        socialEnabled: true,
        tabConfigOrder: ['holders'],
        token: {
          ...buildTokenDetailsV1RouteParams(),
          securityData: tokenDetailsV1SecurityData,
        },
      });
    const concentration = await findByTestId(
      TokenDetailsIds.securityHolders.topTen,
    );
    const rows = getAllByTestId(TokenDetailsIds.securityHolders.row);

    expect(concentration).toHaveTextContent('18.4%');
    expect(
      getByTestId(TokenDetailsIds.securityHolders.count),
    ).toHaveTextContent('100');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('12.50%')).toBeOnTheScreen();
    expect(within(rows[1]).getByText('5.90%')).toBeOnTheScreen();
    expect(queryByTestId(TokenDetailsIds.tab('feed'))).not.toBeOnTheScreen();
    expect(getByTestId(TokenDetailsIds.tab('overview'))).toBeOnTheScreen();

    await userEvent.press(getByTestId(TokenDetailsIds.tab('security')));

    expect(
      getByTestId(SecurityTabSelectors.rowValue(TokenStatKey.Top10)),
    ).toHaveTextContent('18.4%');
  });

  it('queries Feed on first activation and keeps its empty state without showing Holders', async () => {
    setupTokenDetailsV1ApiMocks({ launchpad: false, security: false });
    __setMockNetInfo({ type: 'wifi', isInternetReachable: true });
    const messenger = serveQuoteTokens(Promise.resolve(QUOTE_TOKENS));

    try {
      const { findByTestId, getByTestId, queryByTestId } =
        renderTokenDetailsV1View({
          socialEnabled: true,
          tabConfigOrder: ['overview', 'feed', 'holders'],
        });
      await findByTestId(TokenDetailsIds.tab('feed'));
      expect(messenger).not.toHaveBeenCalledWith(
        'SocialService:fetchFeed',
        expect.anything(),
      );

      fireEvent.press(getByTestId(TokenDetailsIds.tab('feed')));

      expect(await findByTestId(TokenDetailsIds.feed.empty)).toBeOnTheScreen();
      expect(messenger).toHaveBeenCalledWith(
        'SocialService:fetchFeed',
        expect.objectContaining({
          scope: 'all',
          chains: ['eip155:1'],
          assetIds: [TOKEN_DETAILS_V1_ASSET_ID],
        }),
      );
      expect(
        queryByTestId(TokenDetailsIds.tab('holders')),
      ).not.toBeOnTheScreen();
      expect(getByTestId(TokenDetailsIds.tab('security'))).toBeOnTheScreen();
    } finally {
      __resetMockNetInfo();
    }
  });

  it('opens Quick Buy from Copy trade on a populated standard Feed', async () => {
    setupTokenDetailsV1ApiMocks({ launchpad: false, security: false });
    setupQuickBuyApiMock();
    __setMockNetInfo({ type: 'wifi', isInternetReachable: true });
    await acceptSocialTerms();
    serveQuoteTokens(Promise.resolve(QUOTE_TOKENS), {
      feedItems: [
        mockSpotFeedItem({
          tokenAddress: TOKEN_DETAILS_V1_ADDRESS,
          authorComment: {
            uid: 'standard-spot-post',
            text: 'Holding this position',
            timestamp: 1_700_000_000,
            engagement: { reactions: [], userReaction: null },
          },
        }),
      ],
    });

    try {
      const { findByTestId, findByText, getByText } = renderTokenDetailsV1View({
        socialEnabled: true,
        tabConfigOrder: ['feed', 'overview', 'security'],
        overrides: createStateFixture()
          .withMinimalBridgeController()
          .withPreferences({
            tokenSortConfig: {
              key: 'tokenFiatAmount',
              order: 'dsc',
              sortCallback: 'stringNumeric',
            },
          })
          .withOverrides({
            engine: {
              backgroundState: {
                GeolocationController: { location: 'FR', status: 'complete' },
                ProfileController: { profile: CV_SOCIAL_PROFILE },
              },
            },
          })
          .build(),
      });
      const copyTradeLabel = strings(
        'social_leaderboard.feed.position_card.copy_trade',
      );
      await findByText(copyTradeLabel);
      fireEvent.press(getByText(copyTradeLabel));

      expect(
        await findByTestId(QuickBuySheetSelectorsIDs.CONTENT_CONTAINER),
      ).toBeOnTheScreen();
    } finally {
      clearQuickBuyApiMocks();
      __resetMockNetInfo();
      await resetSocialTermsAcceptance();
    }
  });

  it('keeps an explicit Overview pick when higher-priority Feed and Holders arrive', async () => {
    let releaseSecurity: () => void = () => undefined;
    const securityReady = new Promise<void>((resolve) => {
      releaseSecurity = resolve;
    });
    setupTokenDetailsV1ApiMocks({ launchpad: false });
    const assetsInterceptor = {
      proto: 'https',
      host: new URL(TOKEN_API_BASE_URL).host,
      method: 'GET',
      path: '/assets',
    };
    nock.removeInterceptor({ ...assetsInterceptor });
    nock.removeInterceptor({ ...assetsInterceptor });
    nock(TOKEN_API_BASE_URL)
      .persist()
      .get('/assets')
      .query((query) => query.includeTokenSecurityData === 'true')
      .reply(200, async () => {
        await securityReady;
        return [
          {
            assetId: TOKEN_DETAILS_V1_ASSET_ID,
            securityData: tokenDetailsV1SecurityData,
          },
        ];
      });
    installDefaultApiMocks();
    let resolveQuoteTokens: (value: QuoteTokensResponse) => void = () =>
      undefined;
    serveQuoteTokens(
      new Promise((resolve) => {
        resolveQuoteTokens = resolve;
      }),
    );
    const { findByTestId, getByTestId, queryByTestId } =
      renderTokenDetailsV1View({
        socialEnabled: true,
        tabConfigOrder: ['feed', 'holders', 'overview', 'security'],
      });

    await findByTestId(TokenDetailsIds.tabPage('overview'));
    expect(queryByTestId(TokenDetailsIds.tab('holders'))).not.toBeOnTheScreen();
    expect(queryByTestId(TokenDetailsIds.tab('feed'))).not.toBeOnTheScreen();
    fireEvent.press(getByTestId(TokenDetailsIds.tab('overview')));
    await act(async () => {
      releaseSecurity();
    });

    expect(
      await findByTestId(TokenDetailsIds.tab('holders')),
    ).toBeOnTheScreen();
    expect(getByTestId(TokenDetailsIds.tabPage('overview'))).toBeOnTheScreen();

    await act(async () => {
      resolveQuoteTokens(QUOTE_TOKENS);
    });

    expect(await findByTestId(TokenDetailsIds.tab('feed'))).toBeOnTheScreen();
    expect(getByTestId(TokenDetailsIds.tabPage('overview'))).toBeOnTheScreen();
    expect(
      queryByTestId(TokenDetailsIds.tabPage('feed')),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(TokenDetailsIds.tabPage('holders')),
    ).not.toBeOnTheScreen();
  });

  it.each([
    ['USDC', 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'],
    ['WETH', WETH],
    [
      'wrapped SOL',
      `${SOLANA_MAINNET}/token:So11111111111111111111111111111111111111112`,
    ],
  ] as const)(
    'hides Feed but keeps Holders for %s',
    async (symbol, caipAssetId) => {
      setupTokenDetailsV1ApiMocks({ launchpad: false });
      const messenger = serveQuoteTokens(Promise.resolve(QUOTE_TOKENS));
      const { findByTestId, getByTestId, queryByTestId } =
        renderTokenDetailsV1View({
          socialEnabled: true,
          tabConfigOrder: ['feed', 'holders', 'overview', 'security'],
          token: {
            ...buildTokenDetailsV1RouteParams(),
            caipAssetId,
            symbol,
            securityData: tokenDetailsV1SecurityData,
          },
        });

      await findByTestId(TokenDetailsIds.securityHolders.topTen);
      await userEvent.press(getByTestId(TokenDetailsIds.tab('security')));

      expect(messenger).toHaveBeenCalledWith('SocialService:fetchQuoteTokens');
      expect(queryByTestId(TokenDetailsIds.tab('feed'))).not.toBeOnTheScreen();
      expect(getByTestId(TokenDetailsIds.tab('holders'))).toBeOnTheScreen();
      expect(getByTestId(SecurityTabSelectors.TAB)).toBeOnTheScreen();
    },
  );

  it.each<[string, CaipAssetType]>([
    [
      'JUP',
      `${SOLANA_MAINNET}/token:JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN`,
    ],
    [
      'TSLAx',
      `${SOLANA_MAINNET}/token:XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB`,
    ],
  ])(
    'reveals Feed for %s only after the quote-token list loads',
    async (symbol, caipAssetId) => {
      setupTokenDetailsV1ApiMocks({ launchpad: false, security: false });
      let resolveQuoteTokens: (value: QuoteTokensResponse) => void = () =>
        undefined;
      serveQuoteTokens(
        new Promise((resolve) => {
          resolveQuoteTokens = resolve;
        }),
      );
      const { findByTestId, getByTestId, queryByTestId } =
        renderTokenDetailsV1View({
          socialEnabled: true,
          tabConfigOrder: ['feed', 'overview', 'security'],
          token: {
            ...buildTokenDetailsV1RouteParams(),
            address: caipAssetId,
            chainId: SOLANA_MAINNET,
            caipAssetId,
            symbol,
          },
        });
      expect(
        await findByTestId(TokenDetailsIds.tabPage('overview')),
      ).toBeOnTheScreen();
      expect(queryByTestId(TokenDetailsIds.tab('feed'))).not.toBeOnTheScreen();

      await act(async () => {
        resolveQuoteTokens(QUOTE_TOKENS);
      });

      expect(
        await findByTestId(TokenDetailsIds.tabPage('feed')),
      ).toBeOnTheScreen();
      expect(getByTestId(TokenDetailsIds.tab('security'))).toBeOnTheScreen();
    },
  );

  it('keeps Feed hidden when the quote-token list fails', async () => {
    setupTokenDetailsV1ApiMocks({ launchpad: false, security: false });
    let rejectQuoteTokens: (error: Error) => void = () => undefined;
    const messenger = serveQuoteTokens(
      new Promise((_resolve, reject) => {
        rejectQuoteTokens = reject;
      }),
    );
    const { findByTestId, getByTestId, queryByTestId } =
      renderTokenDetailsV1View({
        socialEnabled: true,
        tabConfigOrder: ['feed', 'overview', 'security'],
      });

    await findByTestId(TokenDetailsIds.tabPage('overview'));
    await act(async () => {
      rejectQuoteTokens(new Error('Quote tokens unavailable'));
    });
    await userEvent.press(getByTestId(TokenDetailsIds.tab('security')));

    expect(messenger).toHaveBeenCalledWith('SocialService:fetchQuoteTokens');
    expect(queryByTestId(TokenDetailsIds.tab('feed'))).not.toBeOnTheScreen();
    expect(getByTestId(SecurityTabSelectors.TAB)).toBeOnTheScreen();
  });

  it('omits Feed and Holders for native ETH without supported social data', async () => {
    setupTokenDetailsV1ApiMocks({ launchpad: false, security: false });
    const { findByTestId, getByTestId, queryByTestId } =
      renderTokenDetailsV1View({
        socialEnabled: true,
        tabConfigOrder: ['feed', 'holders', 'security'],
        token: {
          ...buildTokenDetailsV1RouteParams(),
          address: '0x0000000000000000000000000000000000000000',
          isNative: true,
          caipAssetId: undefined,
          name: 'Ethereum',
          symbol: 'ETH',
        },
      });

    expect(await findByTestId(SecurityTabSelectors.TAB)).toBeOnTheScreen();
    expect(queryByTestId(TokenDetailsIds.tab('feed'))).not.toBeOnTheScreen();
    expect(queryByTestId(TokenDetailsIds.tab('holders'))).not.toBeOnTheScreen();
    expect(getByTestId(TokenDetailsIds.tab('overview'))).toBeOnTheScreen();
  });

  it('lists each open holder and hides a closed position', async () => {
    setupTokenDetailsV1ApiMocks({ holders: 'populated' });
    const { findAllByTestId, getByTestId, queryByText, queryByTestId } =
      renderTokenDetailsV1View({
        socialEnabled: true,
        tabConfigOrder: ['holders', 'overview', 'security'],
      });

    const rows = await findAllByTestId(
      TokenHolderRowSelectorsIDs.CONTAINER,
      {},
      FIND_TIMEOUT,
    );

    expect(rows).toHaveLength(tokenDetailsV1OpenHolders.length);
    const [whale, second] = tokenDetailsV1OpenHolders;
    expect(
      within(rows[0]).getByTestId(TokenHolderRowSelectorsIDs.NAME),
    ).toHaveTextContent(TOKEN_DETAILS_V1_HOLDER_NAMES.openWhale);
    expect(
      within(rows[0]).getByTestId(TokenHolderRowSelectorsIDs.FOLLOWERS),
    ).toHaveTextContent(formatFollowerCountLabel(whale.actor.followerCount));
    expect(
      within(rows[0]).getByTestId(TokenHolderRowSelectorsIDs.POSITION_VALUE),
    ).toHaveTextContent(formatAbbreviatedUsd(whale.currentValueUSD));
    expect(
      within(rows[0]).getByTestId(TokenHolderRowSelectorsIDs.PNL_PERCENT),
    ).toHaveTextContent(formatPercent(whale.pnlPercent));
    expect(
      within(rows[1]).getByTestId(TokenHolderRowSelectorsIDs.NAME),
    ).toHaveTextContent(TOKEN_DETAILS_V1_HOLDER_NAMES.openSecond);
    expect(
      within(rows[1]).getByTestId(TokenHolderRowSelectorsIDs.FOLLOWERS),
    ).toHaveTextContent(formatFollowerCountLabel(second.actor.followerCount));
    expect(
      within(rows[1]).getByTestId(TokenHolderRowSelectorsIDs.POSITION_VALUE),
    ).toHaveTextContent(formatAbbreviatedUsd(second.currentValueUSD));
    expect(
      within(rows[1]).getByTestId(TokenHolderRowSelectorsIDs.PNL_PERCENT),
    ).toHaveTextContent(formatPercent(second.pnlPercent));
    expect(
      queryByText(tokenDetailsV1ClosedHolder.actor.name),
    ).not.toBeOnTheScreen();
    expect(
      getByTestId(getTokenDetailsV1TabTestId('holders')),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(getTokenDetailsV1TabTestId('feed')),
    ).not.toBeOnTheScreen();
  });

  it('drops the Holders tab when the positions API returns nobody', async () => {
    setupTokenDetailsV1ApiMocks({ holders: 'empty' });
    const { getByTestId, queryByTestId } = renderTokenDetailsV1View({
      socialEnabled: true,
      tabConfigOrder: ['holders', 'overview', 'security'],
    });

    await waitFor(() => {
      expect(getByTestId(SecurityPillSelectors.VERDICT)).toHaveTextContent(
        strings('token_details_v1.security_pill.screened'),
      );
    }, FIND_TIMEOUT);

    await waitFor(() => {
      expect(
        queryByTestId(getTokenDetailsV1TabTestId('holders')),
      ).not.toBeOnTheScreen();
    });
    expect(
      getByTestId(getTokenDetailsV1TabTestId('overview')),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(getTokenDetailsV1TabTestId('feed')),
    ).not.toBeOnTheScreen();
    expect(
      getByTestId(tokenDetailsV1TabPageTestId('overview')),
    ).toBeOnTheScreen();
  });

  it('switches tabs from the docked tab bar once the page scrolls past it', async () => {
    const { findByTestId, getByTestId, queryByTestId } =
      renderTokenDetailsV1View();
    const tabBarSlot = await findByTestId(
      TokenDetailsIds.tabBarSlot,
      {},
      FIND_TIMEOUT,
    );
    // Layout and scroll do not run in jest, so place the tab bar and scroll
    // past it by hand.
    fireEvent(tabBarSlot, 'layout', {
      nativeEvent: { layout: { x: 0, y: 400, width: 390, height: 48 } },
    });
    fireEvent.scroll(getByTestId(TokenDetailsIds.scrollView), {
      nativeEvent: {
        contentOffset: { x: 0, y: 900 },
        contentSize: { width: 390, height: 3000 },
        layoutMeasurement: { width: 390, height: 800 },
      },
    });

    // Only the docked copy takes taps and is announced; the in-flow bar is
    // hidden from both.
    await waitFor(() => {
      expect(
        queryByTestId(getTokenDetailsV1TabTestId('security')),
      ).not.toBeOnTheScreen();
    });
    await userEvent.press(getByTestId(TokenDetailsIds.pinnedTab('security')));

    expect(
      await findByTestId(SecurityTabSelectors.TAB, {}, FIND_TIMEOUT),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(tokenDetailsV1TabPageTestId('overview')),
    ).not.toBeOnTheScreen();

    // Scrolling back above the bar hands taps back to the in-flow copy.
    fireEvent.scroll(getByTestId(TokenDetailsIds.scrollView), {
      nativeEvent: {
        contentOffset: { x: 0, y: 0 },
        contentSize: { width: 390, height: 3000 },
        layoutMeasurement: { width: 390, height: 800 },
      },
    });
    await waitFor(() => {
      expect(
        queryByTestId(TokenDetailsIds.pinnedTab('overview')),
      ).not.toBeOnTheScreen();
    });
    await userEvent.press(getByTestId(getTokenDetailsV1TabTestId('overview')));

    expect(
      await findByTestId(
        tokenDetailsV1TabPageTestId('overview'),
        {},
        FIND_TIMEOUT,
      ),
    ).toBeOnTheScreen();
  });
});

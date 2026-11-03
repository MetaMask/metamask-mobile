import '../../../../../tests/component-view/mocks';
import { Linking } from 'react-native';
import { userEvent, waitFor, within } from '@testing-library/react-native';

import { renderTokenDetailsV1View } from '../../../../../tests/component-view/renderers/tokenDetailsV1';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
import {
  clearTokenDetailsV1ApiMocks,
  setupTokenDetailsV1ApiMocks,
  TOKEN_DETAILS_V1_ADDRESS,
  TOKEN_DETAILS_V1_AGE_LABEL,
  TOKEN_DETAILS_V1_DESCRIPTION,
  TOKEN_DETAILS_V1_HOLDER_NAMES,
  tokenDetailsV1ClosedHolder,
  tokenDetailsV1OpenHolders,
} from '../../../../../tests/component-view/api-mocking/tokenDetailsV1';
import { strings } from '../../../../../locales/i18n';
import ClipboardManager from '../../../../core/ClipboardManager';
import { TokenOverviewSelectorsIDs } from '../../AssetOverview/TokenOverview.testIds';
import { TokenDetailsIds } from '../testIds';
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
    ).toHaveTextContent('0x...1933');
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
      expect(clipboardSpy).toHaveBeenCalledWith(TOKEN_DETAILS_V1_ADDRESS);
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
});
